# ELLIE_PROPOSALS_SHAPES · Tarjetas de rutina y plan nutricional

Versión de contrato: `prop-1` · Lado: **backend (Lovable)** · La app se adapta después.
Fuente de comportamiento: `ELLIE_CARDS_FLOW.md` (§0–§4). Depende de: `ELLIE_CONTEXT_SHAPES` (ctx-1) y `NUTRITION_SHAPES` (nut-1).

## 0. Decisiones de producto (definitivas)

- **Nada se guarda ni se activa hasta que el usuario lo confirma.** Las propuestas son borradores.
- **Cada cadena conserva una sola versión abierta.** Varias propuestas raíz del mismo tipo pueden seguir abiertas en una conversación; un ajuste reemplaza solo a su padre.
- **Las versiones se numeran por cadena** v1, v2, v3…, con un máximo de 10 por cadena. Una petición nueva del mismo tipo abre otra cadena en v1.
- **"Empezar ahora"** inicia la sesión **sin** guardar en Mis rutinas. El resumen de la sesión ofrece "Guardar rutina".
- **Sustituir un plan activo pide confirmación** (`plan_active_exists`, ver nut-1).

## 1. Tabla de propuestas

```sql
ellie_proposals (
  id uuid pk, user_id uuid, conversation_id uuid, message_id uuid,
  kind text check (kind in ('routine','nutrition_plan')),
  chain_id uuid,                              -- id de la raíz de esta cadena
  version smallint, parent_id uuid,          -- versión anterior de la misma cadena
  adjust_label text,                          -- "MÁS CORTA", "OTRA VERSIÓN", texto libre resumido
  payload jsonb,                              -- forma §2 o §3
  status text check (status in ('open','saved','started','active','replaced','discarded')),
  result_ref uuid,                            -- routine_id / session_id / nutrition_plan_id
  created_at timestamptz
)
```

- Al ajustar, solo la versión padre pasa a `replaced`. Una petición nueva crea otra raíz abierta.
- RLS: cada usuario lee solo sus filas, y las escrituras se hacen solo por RPC o desde `ellie-chat`.

## 2. Payload · rutina (`kind = routine`)

```jsonc
{ "mode": "nueva" | "ajustada", "source_routine_id": "…" | null, "source_routine_name": "Total Body" | null,
  "title": "Rutina de cuerpo completo", "minutes": 30, "level": "intermediate",
  "muscles": ["quadriceps","chest","back"], "equipment": ["dumbbell","bench"],
  "reasoning": "Basada en tu Total Body: recorté de 6 a 5 ejercicios y bajé el descanso para que quepa en 30 min.",
  "target_groups": ["quadriceps","chest","back"], "division": "full_body",
  "readiness_note": null, "quick_adjustments": ["Más corta","Otra versión","Sin banco"],
  "warmup":   [ { "exercise_id": "…", "name": "Movilidad de cadera", "detail": "2 min" } ],
  "main": [ { "slot": "slot_1", "exercise_id": "…", "name": "Sentadilla goblet", "image": "<file key>", "video": "<file key>",
              "sets": 3, "reps": 12, "units": 1, "kg": 14, "rest_s": 60,
              "tag": "ajustado" | "añadido" | "cambiado" | null,
              "muscle_group": "quadriceps", "primary_muscle": "quadriceps", "tips": ["…","…"],
              "variants": [ { "exercise_id": "…", "name": "…", "image": "<file key>" } ] } ],
  "cooldown": [ { "exercise_id": "…", "name": "Estiramiento", "detail": "3 min" } ],
  "removed":  [ { "exercise_id": "…", "name": "Remo con mancuerna" } ],
  "totals": { "minutes": 30, "exercises": 5, "sets": 15 } }
```

**Reglas de generación (las valida el servidor antes de emitir la tarjeta):**
- Solo ejercicios del **catálogo**, por `exercise_id`. Si la IA propone uno que no existe, se reemplaza por el más parecido o se descarta.
- **Calentamiento obligatorio.** La vuelta a la calma se recomienda.
- **Variantes:** hasta 3 por ejercicio principal, del mismo `muscle_group`, que no estén ya en la rutina y que encajen con el equipamiento del usuario.
- **Contexto (ctx-1):** respetar nivel, equipamiento, duración pedida y molestias recientes (`signals.discomforts`). Ejemplo: evitar carga en la rodilla si se reportó una molestia ahí, y decirlo en `reasoning`.
- **Rangos válidos:**
  - `sets` 1–6, `reps` 1–30, `rest_s` 15–240;
  - `kg` ≥ 0 o null (para peso corporal);
  - `minutes` lo **estima el servidor** a partir de series, reps y descansos, no la IA.
- **Modo `ajustada`:** el servidor compara con la rutina de origen y calcula `tag` y `removed`.
- **Versiones siguientes (v2…):** se compara con la versión anterior.

## 3. Payload · plan nutricional (`kind = nutrition_plan`)

- Sigue la forma de `ELLIE_CARDS_FLOW.md` §4 ("Plan nutricional").
- `calc` y los objetivos salen de `compute_nutrition_targets` (nut-1). La IA **solo** arma las comidas.
- Al emitir la tarjeta, se crea también un `nutrition_plans` en estado `draft` con la misma semana, y `payload.plan_id` apunta a él.

**Validaciones del servidor antes de emitir:**
- cada día queda dentro de ±5 % de sus kcal y con la proteína a ±10 %;
- no hay ningún alérgeno marcado;
- se respetan la dieta y los alimentos que no gustan;
- hay tantas comidas por día como `meals_per_day`.

**Si la validación falla:** un reintento interno; si vuelve a fallar, la tarjeta no se emite y ELLIE explica el problema.

**Lo calcula el servidor, no la IA:**
- equivalentes: hasta 3 por comida, con kcal a ±5 % y proteína parecida;
- lista de compras;
- `trainingAdjust`.

**Si faltan preferencias** (`get_food_preferences` devuelve `null`), en lugar de la propuesta se emite la tarjeta `nutrition_prefs_request`, sin payload, con el texto previo "Antes de proponerte un plan, cuatro preguntas rápidas. Solo te las hago esta vez."

## 4. `ellie-chat` (cambios sobre ctx-1)

- **Detecta la intención** de pedir o ajustar una rutina o un plan, incluidos los chips y "Otra versión", que llegan como mensajes del usuario.
- **Para ajustes explícitos**, usa `adjust_proposal_id` si se recibió; de lo contrario, toma la propuesta `open` más reciente de ese `kind` en la conversación y la incluye como `PROPUESTA_ACTUAL`. Solo los chips, `Ajusta la rutina:` / `Ajusta el plan:` y `adjust_proposal_id` activan el ajuste. Si no hay una propuesta abierta, ELLIE pide crear una nueva.
- **Para peticiones nuevas**, crea otra cadena con `version=1`, `parent_id=null`, `chain_id=id`; mantiene abiertas las otras raíces. No pasa `PROPUESTA_ACTUAL` al modelo.
- **Emite la tarjeta:**
  - con SSE: `event: card` y `data: { type: "routine_proposal" | "nutrition_plan_proposal" | "nutrition_prefs_request", proposal_id, version, adjust_label, payload }`;
  - sin streaming: dentro de `cards[]` en la respuesta.
- **Texto previo:** una sola frase, sin número de versión. Los ajustes usan una frase según el cambio pedido.
- **El historial de mensajes** guarda el `proposal_id`, no el payload: al recargar el chat, la app lo pide con `get_proposal`.

## 5. RPC de acciones

Todas devuelven `{ ok, ... }` o `{ ok: false, error: { code, message } }`, usan `auth.uid()` y son idempotentes con `p_client_id`.

- **`get_proposal(p_id)`:** devuelve `{ proposal }` con su `status` actual.
- **`save_routine_proposal(p_id, p_edits jsonb, p_client_id)`:**
  - `p_edits` = `{ replace: [{ from_exercise_id, to_exercise_id }], remove: [exercise_id] }`. Viene vacío cuando se guarda desde la tarjeta.
  - Valida que la propuesta esté en `open`, que las variantes estén permitidas y que quede al menos 1 ejercicio principal.
  - Crea la rutina en Mis rutinas con los mismos tablas y forma que una rutina de usuario, para que **no** dé "Rutina no encontrada".
  - Marca la propuesta como `saved` con `result_ref = routine_id`.
  - Devuelve `{ ok, routine_id }`.
- **`start_routine_proposal(p_id, p_edits, p_client_id)`:**
  - Crea una sesión de entreno a partir de la propuesta con las ediciones, **sin** guardar en Mis rutinas.
  - Marca la propuesta como `started` con `result_ref = session_id`.
  - Devuelve `{ ok, session_id, workout }`, con lo que necesita la pantalla de sesión.
- **`activate_nutrition_plan`:** está en nut-1. Al activar, la propuesta pasa a `active` con `result_ref = plan_id`.
- **`discard_proposal(p_id)`:** pasa a `discarded`. Es opcional, porque cerrar la hoja no la descarta.

**Errores:** `proposal_not_open` (está reemplazada, guardada o activa), `invalid_edits`, `min_one_exercise`, `version_limit` y los de nut-1.

## 6. Escenarios de verificación

1. **"Arma una rutina de 30 min para hoy":** tarjeta en modo `nueva`, con calentamiento, solo ejercicios del catálogo y `minutes` calculado por el servidor.
2. **"Ajusta la rutina: déjala en 30 minutos":** modo `ajustada`, con `tag` y `removed` correctos frente a la versión anterior.
3. **Chip "Más corta":** sale la v2, la v1 queda `replaced` y en la v2 `removed` refleja lo quitado.
4. **Molestia reciente en la rodilla:** la propuesta evita cargar la rodilla y lo explica en `reasoning`.
5. **`save_routine_proposal` con una variante y un ejercicio quitado:** la rutina aparece en Mis rutinas y se puede abrir y empezar.
6. **`start_routine_proposal`:** crea la sesión y la rutina **no** aparece en Mis rutinas.
7. **Plan nutricional sin preferencias:** sale la tarjeta `nutrition_prefs_request`; tras `set_food_preferences`, sale la propuesta con `plan_id` en `draft`.
8. **Plan "Sin lactosa":** ninguna comida contiene lácteos, y la validación lo comprueba.
9. **"Más proteína":** la v2 sube la proteína, y los días siguen dentro de ±5 % de kcal.
10. **Guardar una propuesta reemplazada:** devuelve `proposal_not_open`.
11. **La 11.ª versión de una cadena:** devuelve `version_limit`; una petición nueva puede abrir otra cadena en v1.

## 7. Entregables de Lovable

1. La tabla, su RLS y la firma final de las RPC.
2. Un JSON real de una tarjeta de rutina (escenario 2) y de una de plan (escenario 7).
3. Los cambios en `ellie-chat`: detección de intención, la base `PROPUESTA_ACTUAL` y los eventos `card`.
4. El resultado de los escenarios 1 a 11.

## Implementación real

La migración `20261031150000_6b72e88a-1f66-4d89-a2bf-6e1c394c4907.sql` añade `ellie_proposals.chain_id`. En la raíz, `chain_id=id`, `version=1` y `parent_id=null`. La migración `20261031190000_15a597a0-798b-46d2-a648-b1cb69372e1e.sql` elimina la unicidad de propuesta abierta por usuario/conversación/tipo: pueden coexistir varias raíces `open`. Cada ajuste conserva `chain_id`, apunta al padre elegido y reemplaza solo ese padre. La unicidad sigue siendo `(chain_id, version)` y el límite de 10 se aplica a cada cadena. `ellie_publish_proposal_v2` recibe el `parent_id` explícito; la firma anterior de la RPC se conserva para compatibilidad.

La generación de rutinas `cards_v2` sigue cinco etapas. Primero, si hay una molestia activa sin confirmar, `ellie-chat` guarda la solicitud original en `ellie_conversations.pending_routine_request` y emite `discomfort_check`. Los chips `Sí, sigue`, `Ya estoy bien` y `Tengo otra molestia` (o `discomfort_answer: {zone,status}`) actualizan `discomfort_status`; la solicitud pendiente se retoma con el contexto recargado. Una molestia nueva que el usuario menciona se marca activa automáticamente. `get_athlete_context` combina este estado con `session_feedback_signals`: una resolución posterior al feedback lo suprime, y una nueva señal posterior vuelve a aparecer.

Después, el servidor interpreta división, grupos, duración, nivel, objetivo, equipo y restricciones; fija el título, los slots, el orden, las series, repeticiones, descansos, calentamiento y vuelta a la calma. La IA recibe únicamente candidatos válidos por slot y devuelve un `exercise_id` por slot más `reasoning`. El servidor corrige elecciones inválidas dentro del mismo slot, calcula peso desde el historial de series y ajusta la duración estimada a ±5 minutos. Una molestia activa excluye ejercicios que carguen esa zona. Sueño, nutrición y entrenamiento reciente solo generan `readiness_note` y `quick_adjustments`; no bloquean ni modifican automáticamente la rutina. El payload contiene `target_groups`, `division`, `readiness_note`, `quick_adjustments` y `main[].slot` además de los campos anteriores.

Las tarjetas nuevas requieren `cards_v2: true`. Una fila de `chat_messages` para una tarjeta v2 de rutina se guarda así (UUID ilustrativos; los campos no mostrados conservan sus valores normales):

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "user_id": "22222222-2222-4222-8222-222222222222",
  "conversation_id": "33333333-3333-4333-8333-333333333333",
  "role": "assistant",
  "content": "Te propongo esta rutina para que la revises.",
  "client_message_id": "mensaje-del-cliente:a",
  "tool_type": "generate_workout_plan",
  "tool_data": { "proposal_id": "44444444-4444-4444-8444-444444444444" },
  "model": "google/gemini-3-flash-preview",
  "input_tokens": 1200,
  "output_tokens": 600,
  "context_version": "ctx-1",
  "context_generated_at": "2026-10-31T12:00:00Z",
  "created_at": "2026-10-31T12:00:01Z"
}
```

En las tarjetas de propuesta, `chat_messages.tool_data` contiene solo `proposal_id`: el payload completo está en `ellie_proposals.payload` y se recupera mediante `get_proposal`. Para `discomfort_check`, `tool_type` es `discomfort_check` y `tool_data` es `{ "type": "discomfort_check", "payload": { "zones": ["hombro"], "chips": ["Sí, sigue", "Ya estoy bien", "Tengo otra molestia"] } }`; la solicitud original pendiente vive en `ellie_conversations.pending_routine_request`. Para un ajuste, `content` es la frase del cambio (por ejemplo, `"Hecho, la hice más corta."`); nunca incluye el número interno de versión.

Con `stream: true`, las propuestas envían estos eventos SSE, en orden:

| Evento | Campos reales de `data` |
| --- | --- |
| `delta` | `{ "text": "Te propongo esta rutina para que la revises." }` (una frase completa) |
| `card` | `{ "type": "routine_proposal", "proposal_id": "<uuid>", "version": 1, "adjust_label": null, "payload": <objeto de §2> }` (o `nutrition_plan_proposal` con §3; `nutrition_prefs_request` omite `payload` y usa `proposal_id`, `version` y `adjust_label` nulos; `discomfort_check` usa esos tres campos nulos y `payload: { zones, chips }`) |
| `done` | `{ "message_id": "<uuid>", "conversation_id": "<uuid>", "model": "google/gemini-3-flash-preview", "context_version": "ctx-1", "usage": { "used": 1, "limit": 20, "remaining": 19, "image_analyses_used": 0, "image_analyses_limit": 5 } }` |
| `error` | `{ "code": "quota" \| "ai_timeout" \| "context_unavailable" \| "internal", "message": "<texto>" }` |

Sin streaming, la misma tarjeta aparece en `cards[]` junto con `conversation_id` y `message`. El evento `done` incluye `conversation_id` también en respuestas repetidas por `client_message_id`.
