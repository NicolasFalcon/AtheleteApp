# ELLIE Cards Flow

Versión: `prop-2` (+ tarjetas del plan de entrenamiento `plan_review`, `plan_adjustment`, `plan_action_confirm`) · Backend contract. Las tarjetas llegan en `cards[]` o como evento SSE `card`; la app ejecuta acciones mediante las RPC indicadas, siempre con el JWT del usuario.

## Enrutamiento

| Pedido                                                         | Tarjeta                   | Fuente                                  |
| -------------------------------------------------------------- | ------------------------- | --------------------------------------- |
| Crear, armar o pedir una rutina para hoy                       | `routine_proposal`        | Motor de rutinas; nunca el chat general |
| Buscar/recomendar/elegir una existente o nombrar una categoría | `routine_library`         | `search_routines` + `get_routine`       |
| Confirmar que una rutina se agregó a un día                    | `week_plan_added`         | `plan_routine_for_day`                  |
| El día ya tiene una sesión del plan                            | `week_plan_conflict`      | `plan_routine_for_day`                  |
| Crear o ajustar plan nutricional                               | `nutrition_plan_proposal` | Motor nutricional                       |
| Faltan preferencias nutricionales                              | `nutrition_prefs_request` | Servidor                                |
| Hay una molestia por confirmar                                 | `discomfort_check`        | Servidor                                |
| Cómo va la semana o el plan de entrenamiento                   | `plan_review`             | `get_training_plan_review`              |
| Cambios, ajustes o propuestas del plan (o propuestas abiertas)  | `plan_adjustment`         | `list_plan_adjustments`                 |
| Pausar, retomar, cambiar días/objetivo/duración o terminar plan | `plan_action_confirm`     | Servidor (valida; la app ejecuta la RPC) |

El chat general de `cards_v2` no recibe la herramienta heredada `generate_workout_plan`. Si no hay una rutina existente compatible, ELLIE ofrece generar una; no inventa una tarjeta simple.

## Acciones

### `routine_proposal`

- `start`: `start_routine_proposal(proposal_id, edits, client_id)`.
- `save`: `save_routine_proposal(proposal_id, edits, client_id)`.
- `add_to_week`: envía un mensaje con la fecha; ELLIE llama `plan_routine_for_day` con `p_proposal_id`. La RPC guarda primero la propuesta.
- Chips/`adjust`: nuevo mensaje de ajuste con `adjust_proposal_id`; produce otra `routine_proposal`.
- `discard`: `discard_proposal(proposal_id)`.

### `routine_library`

Payload: `{ routine_id, source, name, category, focus, minutes, level, exercises, reasoning, readiness_note?, actions }`.

- `start`: abre/inicia la rutina existente usando `routine_id` y el flujo normal de sesión.
- `add_to_week`: envía la fecha; ELLIE llama `plan_routine_for_day` con `p_routine_id`.
- `view`: abre el detalle mediante `get_routine(routine_id)`.
- `adjust`: envía “Ajustarla”; ELLIE usa esta rutina como origen y emite una `routine_proposal` v1 en modo `ajustada`.

Los IDs y labels son:

```json
[
  { "id": "start", "label": "Empezar" },
  { "id": "add_to_week", "label": "Agregar a semana" },
  { "id": "view", "label": "Ver rutina" },
  { "id": "adjust", "label": "Ajustarla" }
]
```

### `week_plan_added`

Payload: `{ date, routine_id, name, replaced, actions }`.

- `view_week`: abre “Tu semana”; `get_week_plan(week_monday(date), tz)` contiene `kind=session` y esa rutina.
- `undo`: envía “Deshacer”; ELLIE llama `unplan_routine_for_day(date)`.

```json
[
  { "id": "view_week", "label": "Ver semana" },
  { "id": "undo", "label": "Deshacer" }
]
```

### `week_plan_conflict`

Se emite cuando ELLIE intenta agregar la tarjeta de rutina más reciente y `plan_routine_for_day(..., p_replace:false)` devuelve `day_has_plan_session`. El texto del mensaje es: “Ese día ya tiene una sesión de tu plan. ¿Reemplazarla?”.

Payload para una rutina existente:

```json
{
  "date": "2026-11-10",
  "routine_id": "79f81173-7b3d-40b0-b925-ee0360f8a377",
  "routine_name": "Torso con mancuernas",
  "plan_session": {
    "id": "116fc95f-8a27-4ec9-88c0-853ed3ba516e",
    "title": "Torso · Pesado",
    "session_type": "pesado"
  }
}
```

Si la rutina todavía es una propuesta, omite `routine_id` y lleva `proposal_id`:

```json
{
  "date": "2026-11-11",
  "proposal_id": "15a71dfa-886d-4a42-8475-5c3f82472a07",
  "routine_name": "Empuje breve",
  "plan_session": {
    "id": "068fe5cb-d690-4f57-a6e4-b7f90cc17e93",
    "title": "Pierna · Volumen",
    "session_type": "volumen"
  }
}
```

- **Reemplazar:** la app llama directamente a `plan_routine_for_day` con la misma `date`, `routine_id` o `proposal_id`, un `p_client_id` nuevo y `p_replace:true`. La sesión del plan pasa a `substituted`.
- **Elegir otro día:** cierra la tarjeta y vuelve al selector; no llama una RPC ni modifica la semana.
- La tarjeta no reemplaza por sí sola y no guarda una confirmación pendiente en ELLIE.

### Plan nutricional

- `nutrition_prefs_request`: abre la captura de preferencias y termina en `set_food_preferences`.
- `nutrition_plan_proposal`: `activate` llama a `activate_nutrition_plan`; los chips de ajuste vuelven a `ellie-chat` con `adjust_proposal_id`; `discard` llama a `discard_proposal`.
- Sustituir un plan activo requiere el flujo de confirmación `plan_active_exists` definido en `NUTRITION_SHAPES.md`.

## Tarjetas del plan de entrenamiento

Solo con `cards_v2`. Son deterministas: el modelo no las escribe, no inventa datos y nunca ejecuta una acción del plan. Se evalúan antes del ruteo de rutinas y no se evalúan con imagen adjunta, con una solicitud de plan pendiente (`pending_training_plan_request`) ni con una propuesta `training_plan` abierta en la conversación (ahí "Solo 3 días" sigue siendo un chip de ajuste del borrador). Ninguna RPC del camino tarda más de 3 s (los smoke tests lo miden).

### `plan_review`

Disparadores: “¿cómo va mi plan?”, “resumen de mi semana”, “cómo me fue esta semana”, “cómo voy” (solo exacto y solo con plan). ELLIE responde con una frase generada por el servidor y emite la tarjeta de la última semana cerrada. Payload = la respuesta de `get_training_plan_review` sin `ok`:

```json
{
  "type": "plan_review",
  "proposal_id": null,
  "version": null,
  "adjust_label": null,
  "payload": {
    "plan_id": "a3ca515b-fcdf-4179-9503-b5c6c73689c5",
    "week_index": 2,
    "created_at": "2026-11-15T22:00:03.114Z",
    "review": {
      "sessions_done": 3,
      "sessions_missed": 1,
      "sets": 54,
      "volume_kg": 12400,
      "adjustments": [
        {
          "id": "3a2bfcbb-74e4-4cac-baae-65dbb40d8474",
          "kind": "deload_early",
          "status": "open",
          "payload": { "week_index": 3, "reason": "effort_limit_2", "before": "Semana 3 · Carga", "after": "Semana 3 · Descarga", "sessions": [], "target_week_index": 3 }
        }
      ]
    }
  }
}
```

Texto: `Semana 2: hiciste 3 de 4 sesiones, 54 series y 12.400 kg de volumen.` Sin revisión (`not_found`) y con plan: sin tarjeta, “Todavía no tengo una semana cerrada para revisar; la primera revisión llega el domingo a las 19:00, en tu hora.” Sin plan: “Todavía no tienes un plan de entrenamiento…” (la frase vaga “cómo voy” sin plan sigue al chat normal). La semana es la de `get_training_plan_review()` por defecto: la última cuya fecha de fin ya pasó (no la que se cierra hoy domingo).

### `plan_adjustment`

Disparadores: preguntas por cambios/ajustes/propuestas del plan (“¿qué cambios hay en mi plan?”), o —sin preguntar— cuando `training_plan.open_adjustments > 0`, el mensaje habla del plan (“mi plan”, “mi semana”, “sesión de hoy”) o el mensaje anterior de ELLIE fue una tarjeta del plan, y el pedido no es otra intención (rutina, biblioteca, generar plan). En el caso implícito no se repiten ajustes que ya se mostraron como tarjeta en los últimos 20 mensajes. Una tarjeta por ajuste con `status = 'open'` (máximo 10), en el orden de `list_plan_adjustments`. Payload = el ajuste tal como lo devuelve esa RPC (la forma de `payload` por `kind` está en `TRAINING_PLAN_SHAPES.md` §7.1):

```json
{
  "type": "plan_adjustment",
  "proposal_id": null,
  "version": null,
  "adjust_label": null,
  "payload": {
    "id": "3a2bfcbb-74e4-4cac-baae-65dbb40d8474",
    "plan_id": "a3ca515b-fcdf-4179-9503-b5c6c73689c5",
    "kind": "deload_early",
    "status": "open",
    "created_at": "2026-11-16T10:00:00.000Z",
    "responded_at": null,
    "payload": {
      "week_index": 3,
      "reason": "effort_limit_2",
      "before": "Semana 3 · Carga",
      "after": "Semana 3 · Descarga",
      "sessions": [
        { "plan_session_id": "116fc95f-8a27-4ec9-88c0-853ed3ba516e", "date": "2026-11-24", "title": "Torso · Pesado", "session_type": "pesado" }
      ],
      "target_week_index": 3
    }
  }
}
```

ELLIE nunca inventa ajustes: solo muestra los que existen. Sin ajustes abiertos responde “Ahora mismo no tienes propuestas abiertas para tu plan.” sin tarjeta. La app responde cada tarjeta con `respond_plan_adjustment(adjustment_id, action, client_id)` (acciones por `kind` en `TRAINING_PLAN_SHAPES.md` §7.1). Con varias tarjetas la respuesta lleva `cards: [c1, c2, …]` y el stream emite un evento `card` por tarjeta; el mensaje guardado lleva `tool = { type: "plan_adjustment", data: { type, payloads: [...] } }` (con una sola tarjeta, `data = { type, payload }`).

### `plan_action_confirm`

Disparadores: “pausa mi plan una semana”, “retoma mi plan”, “cambia mis días a lunes, miércoles y viernes”, “cambia mi objetivo a fuerza”, “cambia mi plan a 12 semanas”, “termina mi plan”. Los pedidos que no dicen “plan” (días, objetivo) solo cuentan si el plan está `active` o `paused`; cualquier frase con palabras de comidas/nutrición queda fuera. ELLIE **nunca ejecuta**: responde con la tarjeta y la app llama a la RPC solo cuando el atleta confirma. Payload exacto `{ action, params, summary }`:

| `action` | `params` | RPC al confirmar (`p_client_id` nuevo) | Resumen de ejemplo |
| --- | --- | --- | --- |
| `pause` | `{ "weeks": 1 \| 2 }` | `pause_training_plan(p_weeks => weeks)` | `Pausar tu plan 1 semana · termina el 7 feb` |
| `resume` | `{}` | `resume_training_plan()` | `Retomar tu plan hoy · las sesiones pendientes pasan a tus próximos días de entreno` |
| `change_days` | `{ "days_of_week": [1,3,5] }` (ISO 1..7, ordenados) | `change_plan_days(p_days => days_of_week)` | `Entrenar lunes, miércoles y viernes · desde la próxima semana` |
| `change_goal_duration` | `{ "goal": "gain_strength", "weeks": 12 }` | `change_plan_goal_duration(p_goal => goal, p_weeks => weeks)` | `Cambiar tu plan a ganar fuerza · 12 semanas` |
| `end` | `{}` | `end_training_plan()` | `Terminar tu plan antes de tiempo · se genera tu reporte final` |

```json
{
  "type": "plan_action_confirm",
  "proposal_id": null,
  "version": null,
  "adjust_label": null,
  "payload": {
    "action": "pause",
    "params": { "weeks": 1 },
    "summary": "Pausar tu plan 1 semana · termina el 7 feb"
  }
}
```

```json
{
  "type": "plan_action_confirm",
  "proposal_id": null,
  "version": null,
  "adjust_label": null,
  "payload": {
    "action": "change_goal_duration",
    "params": { "goal": "gain_strength", "weeks": 12 },
    "summary": "Cambiar tu plan a ganar fuerza · 12 semanas"
  }
}
```

Texto del mensaje: “Confírmalo abajo y lo aplico. Hasta entonces tu plan queda exactamente como está.” La fecha de “termina el …” es `end_date` del plan + `weeks × 7` días, igual que la RPC. Con `change_goal_duration`, si falta uno de los dos datos se usa el del plan actual.

**Validación previa (mismas reglas que las RPC; si falla, ELLIE explica y no emite tarjeta):**

- `pause`: solo con plan `active`; 1 o 2 semanas y como máximo 2 en total por plan (`pause_weeks_left` del contexto). Sin número de semanas pregunta cuántas.
- `resume`: solo con plan `paused`.
- `change_days`: de 2 a 6 días distintos (ISO 1..7); si son los mismos que ya tiene, lo dice. Sin días pregunta cuáles.
- `change_goal_duration`: objetivo en `gain_muscle | gain_strength | lose_weight | performance`; duración 4, 8 o 12 y no menor que la semana actual (`valid_weeks` del contexto; la RPC devuelve `invalid_duration` en otro caso).
- `end`: con plan `active` o `paused`.
- Sin plan (`none`) o con plan `completed`: explica que no hay plan que cambiar y ofrece crear uno.

Replay por `client_message_id`: las tres tarjetas se reconstruyen desde `chat_messages.tool_data` (instantánea de la respuesta original; no se vuelven a consultar las RPC).

## Fecha, conflicto y referencia conversacional

- “Hoy” y “mañana” usan `ctx-1.now.date`; los días de la semana significan hoy si coinciden o la próxima ocurrencia.
- ELLIE toma la tarjeta de rutina más reciente de la conversación. Si no existe, pregunta cuál.
- `day_has_routine` no reemplaza nada: ELLIE guarda una confirmación pendiente y pregunta. Solo una respuesta afirmativa llama de nuevo con `p_replace=true`.
- `past_day`, `proposal_not_open` y `routine_not_found` se muestran como error de acción; no se emite `week_plan_added`.
- El replay por `client_message_id` reconstruye `routine_library`, `week_plan_added`, `week_plan_conflict`, `plan_review`, `plan_adjustment` y `plan_action_confirm` desde `chat_messages.tool_data`.

## Detalle de ejercicios

`routine_proposal.main[]` y `routine_library.exercises[]` llevan como mínimo `exercise_id`, `name`, `image`, `sets`, `reps`, `units`, `kg`, `rest_s`, `muscle_group`, `primary_muscle`, `tips` y `variants`. `routine_library` añade `block`. `units` vale `1` solo para mancuerna o unilateral; en barra, máquina, polea y ejercicios bilaterales es `null`.
