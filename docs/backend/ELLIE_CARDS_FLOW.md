# ELLIE Cards Flow

Versión: `prop-2` · Backend contract. Las tarjetas llegan en `cards[]` o como evento SSE `card`; la app ejecuta acciones mediante las RPC indicadas, siempre con el JWT del usuario.

## Enrutamiento

| Pedido                                                         | Tarjeta                   | Fuente                                  |
| -------------------------------------------------------------- | ------------------------- | --------------------------------------- |
| Crear, armar o pedir una rutina para hoy                       | `routine_proposal`        | Motor de rutinas; nunca el chat general |
| Buscar/recomendar/elegir una existente o nombrar una categoría | `routine_library`         | `search_routines` + `get_routine`       |
| Confirmar que una rutina se agregó a un día                    | `week_plan_added`         | `plan_routine_for_day`                  |
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

### Plan nutricional

- `nutrition_prefs_request`: abre la captura de preferencias y termina en `set_food_preferences`.
- `nutrition_plan_proposal`: `activate` llama a `activate_nutrition_plan`; los chips de ajuste vuelven a `ellie-chat` con `adjust_proposal_id`; `discard` llama a `discard_proposal`.
- Sustituir un plan activo requiere el flujo de confirmación `plan_active_exists` definido en `NUTRITION_SHAPES.md`.

## Fecha, conflicto y referencia conversacional

- “Hoy” y “mañana” usan `ctx-1.now.date`; los días de la semana significan hoy si coinciden o la próxima ocurrencia.
- ELLIE toma la tarjeta de rutina más reciente de la conversación. Si no existe, pregunta cuál.
- `day_has_routine` no reemplaza nada: ELLIE guarda una confirmación pendiente y pregunta. Solo una respuesta afirmativa llama de nuevo con `p_replace=true`.
- `past_day`, `proposal_not_open` y `routine_not_found` se muestran como error de acción; no se emite `week_plan_added`.
- El replay por `client_message_id` reconstruye `routine_library` y `week_plan_added` desde `chat_messages.tool_data`.

## Detalle de ejercicios

`routine_proposal.main[]` y `routine_library.exercises[]` llevan como mínimo `exercise_id`, `name`, `image`, `sets`, `reps`, `units`, `kg`, `rest_s`, `muscle_group`, `primary_muscle`, `tips` y `variants`. `routine_library` añade `block`. `units` vale `1` solo para mancuerna o unilateral; en barra, máquina, polea y ejercicios bilaterales es `null`.
