# ELLIE_CONTEXT_SHAPES · Fase A — Contexto en tiempo real

Versión de contrato: `ctx-1` · Lado: **backend (Lovable)** · La app se adapta después.

## Objetivo

ELLIE debe responder siempre sabiendo **qué día y hora es para el usuario, qué entrenó, qué comió y qué le falta hoy**, sin que el usuario lo diga y sin calcular fechas ni números por su cuenta.

Para el usuario todo es transparente: solo registra y pregunta. La app adjunta en segundo plano la hora del teléfono, y el backend arma el contexto.

## Alcance

**Fase A (este contrato):**
1. La RPC `get_athlete_context`, que construye la ficha del atleta.
2. Cambios en la Edge Function `ellie-chat`:
   - recibir `client_now` y `pending`;
   - inyectar la ficha;
   - nuevas reglas de prompt;
   - streaming;
   - ruteo de modelo.

**Fuera de alcance (Fase B):**
- base local SQLite en la app;
- cola offline;
- respuestas locales sin IA.

`pending` ya se acepta en este contrato para no volver a tocar el backend, pero en la Fase A llegará vacío.

---

## 1. RPC `get_athlete_context`

```sql
get_athlete_context(p_now timestamptz, p_tz text) returns jsonb
```

- `SECURITY DEFINER`. Usa exclusivamente `auth.uid()`: nunca recibe un `user_id` por parámetro.
- **Zona horaria:**
  - `p_tz` es una zona IANA, por ejemplo `America/Santiago`.
  - Si viene vacía, usa la zona guardada en el perfil.
  - Si tampoco existe en el perfil, usa UTC y lo deja indicado en `now.tz_source`.
- **El "día" del usuario se calcula siempre en su zona horaria, nunca en UTC.**
- Se calcula en vivo en cada llamada, así que siempre está actualizada.
  - Objetivo de rendimiento: p95 < 300 ms.
  - Si no se cumple, pasar a una tabla precalculada que se actualice por triggers y avisar.
- **Respuesta:** `{ ok: true, context: {...} }` o `{ ok: false, error: { code, message } }`.
- **Secciones sin datos:**
  - Si la tabla de una sección todavía no existe (suplementos, peso, feedback o molestias), la sección va en `null`.
  - Nunca se inventan datos.
  - Se informa en `data_freshness.unavailable`.

### Shape de `context` (ctx-1)

```jsonc
{
  "version": "ctx-1",
  "generated_at": "2026-10-26T16:40:12Z",

  "now": {
    "date": "2026-10-26",            // fecha local del usuario
    "weekday": "domingo",
    "time": "13:40",
    "part_of_day": "tarde",          // madrugada | mañana | tarde | noche
    "tz": "America/Santiago",
    "tz_source": "client"            // client | profile | utc
  },

  "profile": {
    "first_name": "Nicolas",
    "goal": "ganar_musculo",         // ganar_musculo | perder_grasa | mantener | rendimiento
    "level": "intermedio",
    "sex": "hombre",
    "age": 37,
    "weight_kg": 78.6, "weight_date_relative": "hace 3 días",   // null si no hay
    "body_fat_pct": null,
    "training_days_per_week": 6,
    "equipment": ["mancuernas", "barra"],
    "allergies": [], "diet_type": null, "disliked_foods": [], "meals_per_day": null
  },

  "today": {
    "day_type": "rest",              // training | rest | unplanned
    "workout": {
      "planned": { "routine_id": "…", "name": "Total Body Dumbbell", "duration_min": 35, "exercises": 6 },
      "status": "pending",           // done | partial | pending | none
      "done_sets": 0, "planned_sets": 18,
      "finished_at_local": null
    },
    "nutrition": {
      "plan_active": false,
      "target_source": "profile_estimate",   // plan | profile_estimate
      "target_kcal": 2600, "consumed_kcal": 1240, "remaining_kcal": 1360,
      "macros": {
        "protein_g": { "target": 150, "consumed": 91,  "remaining": 59 },
        "carbs_g":   { "target": 300, "consumed": 116, "remaining": 184 },
        "fat_g":     { "target": 80,  "consumed": 45,  "remaining": 35 }
      },
      "meals_logged": [
        { "moment": "desayuno", "name": "Tostadas con aguacate y huevo", "kcal": 520, "time": "08:10" },
        { "moment": "almuerzo", "name": "Bowl de pollo, arroz y verduras", "kcal": 720, "time": "14:20" }
      ],
      "moments_missing": ["cena", "snacks"]
    },
    "hydration": { "glasses": 6, "target_glasses": 14, "ml": 1500, "target_ml": 3500 },
    "supplements": null,             // Fase posterior: { taken: [...], pending: [...] }
    "sleep_last_night": { "duration_min": 444, "quality": "buena", "source": "apple_health" },
    "activity": { "steps": 6420, "active_kcal": 412, "source": "apple_health" },   // null si no hay
    "core33": { "active": true, "day_number": 33, "habits_done": 1, "habits_total": 3, "pending": ["Hidratación", "Mente"] },
    "breathing_done": false
  },

  "last_7_days": [
    { "date": "2026-10-25", "weekday": "sábado", "relative": "ayer",
      "day_type": "rest", "workout": null, "kcal": 2310, "hydration_glasses": 10, "sleep_min": 401 },
    { "date": "2026-10-24", "weekday": "viernes", "relative": "hace 2 días",
      "day_type": "training", "workout": { "name": "Total Body Dumbbell", "status": "done", "duration_min": 38 },
      "kcal": 2655, "hydration_glasses": 12, "sleep_min": 452 }
    // … hasta 7 días, del más reciente al más antiguo
  ],

  "plans": {
    "nutrition": null,               // { id, name, week_number, adjust_by_training } si hay plan activo
    "week_routines": [
      { "weekday": "lunes", "relative": "hace 6 días", "routine": "Pierna", "status": "done" },
      { "weekday": "martes", "relative": "en 2 días", "routine": "Total Body", "status": "planned" }
    ]
  },

  "signals": {
    "recent_prs": [ { "exercise": "Press de banca", "value": "16 kg", "relative": "hace 2 días" } ],
    "discomforts": null              // Fase posterior
  },

  "data_freshness": {
    "last_record_at_local": "14:20",
    "unavailable": ["supplements", "discomforts"],
    "notes": ["No hay cena registrada hoy."]
  }
}
```

### Reglas de cálculo

- **Fechas relativas:** "hoy", "ayer", "hace N días", "mañana", "en N días". Las calcula el servidor en la zona horaria del usuario.
- **`day_type`:**
  - `training` si hoy hay una rutina planificada en la semana;
  - `rest` si el día está marcado como descanso;
  - `unplanned` si no hay plan semanal.
- **`workout.status`:**
  - `done` si la sesión de hoy está terminada;
  - `partial` si se guardó a medias;
  - `pending` si está planificada y no iniciada;
  - `none` si no hay nada planificado.
- **Nutrición:**
  - `remaining_*` = objetivo − consumido, y puede ser negativo, lo que significa que el usuario se pasó.
  - El objetivo viene del plan activo; si no hay plan, de la estimación del perfil.
  - Mientras no exista `compute_nutrition_targets`, usa el objetivo que hoy muestra la app. Esto se cambiará con `NUTRITION_SHAPES`.
- **Tamaño:** el contexto completo debe caber en menos de ~2.500 tokens. Sin historial de chat, sin listas largas y sin textos descriptivos.

---

## 2. Edge Function `ellie-chat` (cambios)

### Request (se añaden campos; todo lo actual sigue funcionando)

```jsonc
{
  "conversation_id": "…",
  "message": "¿Qué puedo comer hoy que no sea tan engordante? ¿Sushi o hamburguesa?",
  "client_request_id": "…",          // ya existe (idempotencia)
  "client_now": { "iso": "2026-10-26T13:40:05-03:00", "tz": "America/Santiago" },  // NUEVO; lo adjunta la app automáticamente
  "pending": [],                     // NUEVO; Fase A llega vacío
  "stream": true                     // NUEVO; opcional, por defecto false
}
```

- **`client_now`:** se pasa a `get_athlete_context(p_now, p_tz)`. Si falta, se usa la hora del servidor y la zona del perfil.
- **`pending`:** son registros del teléfono que aún no se han sincronizado. Shape: `{ client_id, type: "meal|hydration|set|supplement|weight", created_at, payload }`.
  - Se fusionan **en memoria** con el contexto (sumando kcal, vasos, series, etc.) solo para esa respuesta.
  - **No se guardan aquí,** porque los guarda la sincronización normal.
  - Si un `client_id` ya existe en la base, se ignora para no contarlo dos veces.

### Flujo

1. Validar auth y cuota, igual que hoy.
2. Llamar a `get_athlete_context`. Si falla, responder igual, pero con la regla "no tengo tus datos de hoy" y registrar el error.
3. Fusionar `pending`.
4. Construir el prompt en este orden:
   1. reglas del sistema;
   2. el bloque `CONTEXTO_ATLETA` con el JSON;
   3. el historial reciente de la conversación;
   4. el mensaje del usuario.
5. **Ruteo de modelo:**
   - Una clasificación barata del mensaje decide la vía.
   - Las consultas simples (dudas, qué comer, cuánto llevo, motivación) van al modelo más rápido disponible en el gateway de Lovable.
   - Generar o ajustar rutinas o planes de nutrición, y el análisis de imágenes, siguen con el modelo actual.
   - Hay que guardar qué modelo respondió.
6. **Respuesta:** con `stream: true`, por SSE; sin él, la respuesta actual.

### Eventos SSE (`stream: true`)

```
event: delta   data: { "text": "Hoy domingo es tu día de descanso…" }
event: card    data: { "type": "routine_proposal" | "nutrition_plan_proposal", ... }   // mismo shape que hoy
event: done    data: { "message_id": "…", "model": "…", "context_version": "ctx-1" }
event: error   data: { "code": "ai_timeout" | "quota" | "context_unavailable" | "internal", "message": "…" }
```

- Al terminar, se guarda el mensaje completo en la conversación, igual que hoy.
- El timeout actual y el reembolso de la cuota en `ai_timeout` se mantienen.

### Reglas del prompt (añadir al system prompt de ELLIE)

```
Recibes CONTEXTO_ATLETA con datos reales y actualizados del usuario. Reglas:
1. "Hoy" es now.date / now.weekday. Nunca asumas otra fecha. Usa las fechas relativas tal como vienen ("ayer", "hace 2 días"); no calcules fechas.
2. Para decisiones del día usa la sección today. Si today.day_type es "rest", trátalo como día de descanso.
3. No calcules números: cita los valores de remaining_kcal, macros, vasos, etc. tal como vienen. Puedes estimar kcal de un alimento que el usuario propone, aclarando que es aproximado.
4. Si un dato es null o aparece en data_freshness.notes, dilo ("no tengo tu cena registrada") y no lo supongas.
5. Respeta siempre allergies, diet_type y disliked_foods.
6. No repitas el contexto al usuario ni menciones "CONTEXTO_ATLETA"; úsalo con naturalidad y brevedad.
7. Sobre suplementos: puedes registrar y comentar adherencia; no recomiendes suplementos ni dosis.
```

### Privacidad

- El JSON del contexto **no se guarda** en el historial de mensajes. Solo se guardan `context_version` y la marca de tiempo.
- Nunca se incluyen datos de otros usuarios. Los amigos y la Comunidad quedan fuera de la ficha.

---

## 3. Objetivos de rendimiento

| Métrica | Objetivo |
|---|---|
| `get_athlete_context` p95 | < 300 ms |
| Tamaño del contexto | < 2.500 tokens |
| Primer texto visible (streaming, consulta simple) | < 2 s |
| Respuesta completa, consulta simple | < 5 s |

---

## 4. Escenarios de verificación (con la cuenta de prueba)

Para cada uno, ELLIE debe responder sin que el usuario dé el contexto:

1. **Domingo de descanso** con 2 comidas registradas. Pregunta: "¿Qué puedo comer hoy, sushi o hamburguesa?". Debe responder como día de descanso y citar las kcal que quedan.
2. **El entreno del viernes ya hecho.** Pregunta: "¿Qué entrené la última vez?". Debe decir "el viernes (hace 2 días): Total Body".
3. **Entreno a medias hoy.** Pregunta: "¿Cómo voy?". Debe mencionar "9 de 18 series".
4. **Sin cena registrada a las 21:00.** Pregunta: "¿Cumplí mis kcal?". Debe aclarar que falta la cena.
5. **Se pasó de kcal** (`remaining` negativo). Debe decirlo sin regañar.
6. **Alergia a la lactosa marcada.** Pregunta: "Dame una cena". La cena no puede llevar lácteos.
7. **Pregunta de madrugada** (00:30). "Hoy" debe ser el día nuevo, en la zona horaria del usuario, no en UTC.
8. **Sin Apple Health conectado.** No debe mencionar pasos.

---

## 5. Entregables de Lovable (reportar al terminar)

1. **Mapeo:** qué tabla o columna existente alimenta cada sección de `context`, y qué secciones quedan en `null` y por qué.
2. **Firma final** de la RPC y un ejemplo real del JSON con la cuenta de prueba.
3. **Cambios en `ellie-chat`:** los campos nuevos, los eventos SSE, el ruteo (qué modelo para cada caso) y las reglas añadidas.
4. **Tiempos medidos:** el p95 de la RPC y el tamaño en tokens del contexto de ejemplo.
5. **Resultado de los escenarios 1 a 8.**

---

## 6. Después (lado app, otro lote)

- Adjuntar `client_now` de forma automática en cada mensaje.
- Activar `stream: true` y pintar los eventos `delta`, `card` y `done`.
- **Fase B:**
  - SQLite local con la cola de pendientes;
  - envío de `pending`;
  - respuestas locales sin IA cuando no hay señal.