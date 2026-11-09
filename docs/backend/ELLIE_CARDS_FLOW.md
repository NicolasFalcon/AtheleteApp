# ELLIE Cards Flow

Versión: `prop-2` · Backend contract. Las tarjetas llegan en `cards[]` o como evento SSE `card`; la app ejecuta acciones mediante las RPC indicadas, siempre con el JWT del usuario.

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

## Fecha, conflicto y referencia conversacional

- “Hoy” y “mañana” usan `ctx-1.now.date`; los días de la semana significan hoy si coinciden o la próxima ocurrencia.
- ELLIE toma la tarjeta de rutina más reciente de la conversación. Si no existe, pregunta cuál.
- `day_has_routine` no reemplaza nada: ELLIE guarda una confirmación pendiente y pregunta. Solo una respuesta afirmativa llama de nuevo con `p_replace=true`.
- `past_day`, `proposal_not_open` y `routine_not_found` se muestran como error de acción; no se emite `week_plan_added`.
- El replay por `client_message_id` reconstruye `routine_library`, `week_plan_added` y `week_plan_conflict` desde `chat_messages.tool_data`.

## Detalle de ejercicios

`routine_proposal.main[]` y `routine_library.exercises[]` llevan como mínimo `exercise_id`, `name`, `image`, `sets`, `reps`, `units`, `kg`, `rest_s`, `muscle_group`, `primary_muscle`, `tips` y `variants`. `routine_library` añade `block`. `units` vale `1` solo para mancuerna o unilateral; en barra, máquina, polea y ejercicios bilaterales es `null`.
