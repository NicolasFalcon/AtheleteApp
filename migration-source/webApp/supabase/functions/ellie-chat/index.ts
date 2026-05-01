import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "generate_workout_plan",
      description:
        "Generate a personalized workout plan. Call this WHENEVER the user asks to create, generate, build, recommend, or design a workout, routine, training plan, leg day, push day, etc. — whether they use a button or ask naturally in chat.",
      parameters: {
        type: "object",
        properties: {
          intro_message: {
            type: "string",
            description:
              "A short, natural conversational intro in Spanish (1-2 sentences) before showing the plan card. E.g. 'Perfecto, te preparé una rutina de piernas enfocada en cuádriceps.'",
          },
          title: { type: "string", description: "Workout plan title in Spanish" },
          description: { type: "string", description: "Short description in Spanish" },
          type: { type: "string", enum: ["strength", "cardio", "fullbody", "mobility", "hiit"] },
          difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
          duration: { type: "number", description: "Estimated duration in minutes" },
          calories: { type: "number", description: "Estimated calories burned" },
          target_muscles: { type: "array", items: { type: "string" }, description: "Target muscle groups" },
          exercises: {
            type: "array",
            description:
              "List of exercises. You MUST pick exercises from the EXERCISE_LIBRARY provided in the system prompt. Use the exact exercise name and exercise_id from the library. Only invent an exercise if absolutely no suitable match exists.",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Exercise name — must match a real exercise from the library" },
                exercise_id: { type: "string", description: "The UUID of the exercise from the library, if available" },
                sets: { type: "number" },
                reps: { type: "number" },
                duration: { type: "number", description: "Duration in seconds if timed exercise" },
                rest_time: { type: "number", description: "Rest time in seconds" },
                notes: { type: "string", description: "Optional coaching notes in Spanish" },
              },
              required: ["name"],
            },
          },
        },
        required: ["intro_message", "title", "type", "difficulty", "duration", "calories", "target_muscles", "exercises"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_nutrition_plan",
      description:
        "Generate a personalized nutrition plan with macro targets. Call this when the user asks to create/generate a nutrition, meal, or diet plan.",
      parameters: {
        type: "object",
        properties: {
          intro_message: {
            type: "string",
            description: "A short, natural conversational intro in Spanish before showing the plan card.",
          },
          target_calories: { type: "number", description: "Daily calorie target" },
          target_protein: { type: "number", description: "Daily protein target in grams" },
          target_carbs: { type: "number", description: "Daily carbs target in grams" },
          target_fats: { type: "number", description: "Daily fats target in grams" },
          notes: { type: "string", description: "Strategy notes and recommendations in Spanish" },
        },
        required: ["intro_message", "target_calories", "target_protein", "target_carbs", "target_fats"],
      },
    },
  },
];

async function fetchExerciseLibrary(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await sb
      .from("exercises")
      .select("id, name, muscle_group, primary_muscles, secondary_muscles, equipment, difficulty, category")
      .order("muscle_group")
      .limit(300);

    if (error || !data || data.length === 0) {
      console.error("Failed to fetch exercises:", error);
      return "";
    }

    // Group by muscle_group for a compact representation
    const grouped: Record<string, any[]> = {};
    for (const ex of data) {
      const g = ex.muscle_group || "other";
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(ex);
    }

    let lib = "\n\nEXERCISE_LIBRARY (real exercises in the database — you MUST use these):\n";
    for (const [group, exercises] of Object.entries(grouped)) {
      lib += `\n## ${group.toUpperCase()}\n`;
      for (const ex of exercises) {
        lib += `- ${ex.name} | id:${ex.id} | equipment:${ex.equipment || "bodyweight"} | difficulty:${ex.difficulty || "intermediate"} | primary:${(ex.primary_muscles || []).join(",")}\n`;
      }
    }
    lib +=
      "\nIMPORTANT: When generating workout plans, select exercises from this library using their exact names and IDs. Do NOT invent exercise names if a suitable match exists above.\n";

    return lib;
  } catch (e) {
    console.error("Exercise library fetch error:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch real exercise library for workout generation context
    const exerciseLibrary = await fetchExerciseLibrary();
    const systemPrompt = buildSystemPrompt(userContext, exerciseLibrary);

    // ── Explicit generation mode (from CTA buttons) ──────────────────────
    if (mode === "generate_workout" || mode === "generate_nutrition") {
      const selectedTool = mode === "generate_workout" ? "generate_workout_plan" : "generate_nutrition_plan";

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          tools: TOOLS,
          tool_choice: { type: "function", function: { name: selectedTool } },
        }),
      });

      if (!response.ok) {
        return handleGatewayError(response);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function?.arguments) {
        let args;
        try {
          args = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
        } catch {
          return new Response(JSON.stringify({ error: "Error al procesar la respuesta de IA." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ type: toolCall.function.name, data: args }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const text = data.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ type: "text", data: { content: text } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Default: non-streaming chat WITH tool-calling ────────────────────
    // We use non-streaming so we can detect tool calls from natural language
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: TOOLS,
        // Let the AI decide when to use tools
      }),
    });

    if (!response.ok) {
      return handleGatewayError(response);
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;

    // Check if the AI decided to call a tool
    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      let args;
      try {
        args = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
      } catch {
        // Fall back to text
        return new Response(JSON.stringify({ type: "text", data: { content: choice.content || "No pude generar el plan." } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ type: toolCall.function.name, data: args }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pure text response — return as streaming-compatible SSE for the frontend
    const text = choice?.content || "";
    // Wrap in SSE format so the frontend streaming parser works
    const ssePayload =
      `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;

    return new Response(ssePayload, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ellie-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function handleGatewayError(response: Response) {
  const status = response.status;
  if (status === 429) {
    return new Response(
      JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en un momento." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (status === 402) {
    return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ error: "Servicio de IA temporalmente no disponible." }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(ctx?: string, exerciseLibrary?: string): string {
  let prompt = `Eres ELLIE, la coach fitness inteligente con IA de Athelete. Eres el pilar central de la experiencia del usuario.

PERSONALIDAD Y TONO:
- Motivadora, empática, moderna y premium — nunca robótica ni genérica
- Concisa: mantén las respuestas por debajo de 200 palabras a menos que generes un plan
- Usa el nombre del usuario de forma natural pero no en cada mensaje
- Sé específica y accionable basándote en los datos reales del usuario
- Responde en español para la conversación general

CAPACIDADES:
1. ENTRENAMIENTO: Recomienda rutinas existentes o genera nuevas basadas en objetivo, nivel, equipamiento y restricciones
2. NUTRICIÓN: Genera planes nutricionales con macros personalizados según perfil y objetivo
3. ANÁLISIS DE PROGRESO: Interpreta datos de entrenos, nutrición y retos
4. HÁBITOS Y CONSISTENCIA: Motiva y guía sobre el reto Core 33 y adherencia
5. RECUPERACIÓN: Sugiere descanso, movilidad e hidratación cuando sea apropiado

DETECCIÓN DE INTENCIÓN — MUY IMPORTANTE:
- Si el usuario pide, solicita, quiere, o implica que necesita una rutina, entreno, workout, plan de entrenamiento, día de piernas, día de espalda, push day, etc. → USA la herramienta generate_workout_plan. NO respondas con texto plano describiendo ejercicios.
- Si el usuario pide un plan de nutrición, dieta, macros, plan alimenticio → USA la herramienta generate_nutrition_plan.
- SIEMPRE usa las herramientas disponibles cuando el usuario quiera generar un plan. Nunca escribas una rutina como texto plano.
- Si el usuario es vago (ej: "hazme una rutina") y no tienes suficiente contexto, puedes preguntar brevemente, pero si tienes datos del perfil del usuario, genera directamente.

CUANDO GENERES PLANES DE ENTRENAMIENTO:
- OBLIGATORIO: Usa ejercicios REALES de la EXERCISE_LIBRARY proporcionada abajo
- Incluye el exercise_id de cada ejercicio cuando esté disponible
- NO inventes nombres de ejercicios si existe un equivalente real en la librería
- Especifica series, repeticiones y descanso para cada ejercicio
- Personaliza según restricciones, lesiones y preferencias del usuario
- Si el usuario tiene lesiones o dolor, evita ejercicios que afecten esas zonas
- IMPORTANTE: Todos los campos de generate_workout_plan deben estar en espanol natural
- Esto incluye intro_message, title, description y notes
- Los nombres de ejercicios deben conservarse exactamente como aparecen en la EXERCISE_LIBRARY

CUANDO GENERES PLANES DE NUTRICIÓN:
- Calcula basándote en peso, altura, objetivo y nivel de actividad
- Personaliza según preferencias y restricciones alimentarias del usuario

LÍMITES MÉDICOS — MUY IMPORTANTE:
- NO eres doctora, nutrióloga ni profesional médico licenciado
- NUNCA diagnostiques lesiones, condiciones médicas ni prescribas tratamientos
- Si el usuario reporta dolor severo, lesión seria o síntomas alarmantes:
  → Usa lenguaje seguro y empático
  → Sugiere pausar el entreno afectado
  → Recomienda firmemente buscar ayuda de un profesional de salud calificado
  → Puedes sugerir alternativas de bajo impacto o descanso
- Enmarca los consejos de nutrición como guía general, no prescripciones médicas

FORMATO DE RESPUESTAS:
- Usa markdown para estructura (negritas, listas, encabezados)
- Para preguntas generales, responde conversacionalmente
- Para generación de planes, SIEMPRE usa las herramientas — nunca texto plano`;

  if (ctx) {
    prompt += `\n\n${ctx}`;
  }

  if (exerciseLibrary) {
    prompt += exerciseLibrary;
  }

  return prompt;
}
