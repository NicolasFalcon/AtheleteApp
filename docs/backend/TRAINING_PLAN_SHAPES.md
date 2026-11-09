# TRAINING_PLAN_SHAPES · Plan de entrenamiento de 1 a 3 meses

Versión de contrato: `tp-1.2` · Lado: **backend** (repo `habit-trail-flow`) · La app se adapta después.
Fuentes: handoff v2.21 (`PLAN_ENTRENAMIENTO.md`, sección 31) y el spec de producto. Depende de: `ELLIE_CONTEXT_SHAPES` (ctx-1), `ELLIE_PROPOSALS_SHAPES` (prop-2), `ELLIE_CARDS_FLOW`, `SESSION_FEEDBACK_SHAPES` (sfb-1), `ROUTINES_SHAPES`, `NUTRITION_SHAPES` (nut-1).

## 0. Antes de cambiar nada: reporte de lo existente

Dime, sin cambiar nada:

1. Cómo se guarda y se lee la semana hoy: `weekly_plans`, `weekly_plan_days`, `get_week_plan`, `set_week_day`, `plan_routine_for_day`, `resolve_missed_day`, y qué columnas tiene `weekly_plan_days`.
2. Cómo arranca y termina una sesión: qué RPC crea la fila de `workout_sessions`, dónde se guardan las series (tabla y columnas de reps y kg) y cómo se marca `status = 'completed'`.
3. Cómo se crea hoy la plantilla oculta que usa `start_routine_proposal`, y cómo se excluye de Mis rutinas.
4. De dónde sale el score de recuperación diario y qué umbral se considera "bajo".
5. Si Lovable Cloud tiene `pg_cron` disponible, y cómo se envían hoy las push (`send-push`).
6. Qué valores tiene `profiles.goal` (o equivalente) y el nivel del atleta.

Con eso, ajusta los nombres de este contrato a lo que ya existe. Si algo choca, dímelo antes de implementarlo.

## 1. Decisiones de producto (definitivas)

- **Duración:** 4, 8 o 12 semanas, en bloques de 4 semanas: 3 de carga y 1 de descarga. El último bloque termina con un test de los ejercicios ancla.
- **Generación:** todas las sesiones quedan detalladas desde el inicio. Las semanas que faltan se recalculan con lo que pasa (§5 y §6).
- **Pesos:** se ajustan solos después de cada sesión. Los cambios grandes los propone ELLIE y el atleta los aprueba. La molestia es la única excepción: se aplica sola y se puede revertir.
- **Calibración:** sin pesos registrados del ejercicio, la semana 1 es de calibración (sin peso recomendado; el atleta elige uno con 2 reps en reserva). No aplica a principiantes que entrenan con peso corporal.
- **Un solo plan activo** por usuario.
- **Sesiones del plan:** viven dentro del plan, no en Mis rutinas. Se pueden guardar en Mis rutinas con una acción.
- **Revisión semanal:** domingo a las 19:00, hora local del atleta.
- **Pausa:** 1 o 2 semanas, máximo 2 semanas en total por plan.
- **Coach:** asignar planes queda para una versión posterior.
- **Suscripción:** el plan de 1 a 3 meses será de pago y la versión gratis solo planifica la semana. **Hoy no hay paywall:** todo queda abierto, pero preparado con un chequeo de permiso (§10).
- **Nada se activa sin confirmación** del atleta.

## 2. Estado del plan

Cada usuario está siempre en uno de 4 estados. Lo decide el backend y lo leen todas las pantallas.

| Estado      | Cuándo                                                                 |
| ----------- | ---------------------------------------------------------------------- |
| `none`      | Nunca activó un plan, o el último fue reemplazado sin terminar         |
| `active`    | Desde que activa hasta la fecha de fin                                 |
| `paused`    | Tras pausar, hasta la fecha de vuelta o hasta Retomar                  |
| `completed` | Al llegar la fecha de fin o con "Terminar antes" (hasta que cree otro) |

Transiciones: `none → active` (activar), `active ↔ paused` (pausar / retomar o fecha de vuelta), `active | paused → completed` (fin o terminar antes), `completed → active` (activar un plan nuevo).

## 3. Tablas

Nombres orientativos; ajústalos a lo existente (§0).

```sql
training_plans (
  id uuid pk, user_id uuid, proposal_id uuid,         -- ellie_proposals (kind = 'training_plan')
  status text check (status in ('draft','active','paused','completed','replaced','discarded')),
  name text,                                           -- "Fuerza e hipertrofia"
  goal text check (goal in ('gain_muscle','gain_strength','lose_weight','performance')),
  goal_from_profile boolean default false,
  weeks smallint check (weeks in (4,8,12)),
  days_of_week smallint[],                             -- ISO 1..7, de 2 a 6 días
  session_minutes smallint check (session_minutes in (45,60,75,90)),
  goal_target jsonb,                                   -- { exercise_id, kind:'kg'|'reps', target, start_estimate } | null
  style_category text,                                 -- categoría de la biblioteca o null
  split text,                                          -- 'full_body_ab', 'ppl', 'torso_pierna', …
  start_date date, end_date date,
  paused_from date, paused_until date, pause_weeks_used smallint default 0,
  activated_at timestamptz, ended_at timestamptz, ended_reason text,  -- 'finished' | 'early' | 'replaced'
  read_only boolean default false,                     -- §10: dejó de pagar con plan activo
  version smallint, created_at timestamptz
)

training_plan_weeks (
  plan_id uuid, week_index smallint,                   -- 1..12
  block_index smallint, phase text,                    -- 'base' | 'desarrollo' | 'pico'
  kind text check (kind in ('calibracion','carga','descarga','descarga_test')),
  start_date date, end_date date,
  primary key (plan_id, week_index)
)

training_plan_sessions (
  id uuid pk, plan_id uuid, week_index smallint, position smallint,
  date date, original_date date,
  session_type text check (session_type in ('pesado','volumen','tecnico','descarga','test')),
  title text, minutes smallint,
  template_id uuid,                                    -- plantilla oculta (no aparece en Mis rutinas)
  status text check (status in ('pending','done','missed','substituted','skipped','paused')),
  workout_session_id uuid,                             -- al hacerla
  substituted_by_routine_id uuid, substituted_by_name text
)

training_plan_prescriptions (
  plan_session_id uuid, exercise_id uuid, position smallint,
  is_anchor boolean, sets smallint, rep_min smallint, rep_max smallint, rir smallint, rest_s smallint,
  recommended_kg numeric,                              -- null = calibrar o peso corporal
  calibrate boolean default false,
  primary key (plan_session_id, exercise_id, position)
)

training_plan_adjustments (
  id uuid pk, plan_id uuid,
  kind text check (kind in ('variant_stall','deload_early','missed_session','repeat_week','discomfort')),
  status text check (status in ('open','approved','rejected','applied','reverted','expired')),
  payload jsonb,                                       -- antes → después, sesiones afectadas, motivo
  created_at timestamptz, responded_at timestamptz
)

training_plan_reviews (
  plan_id uuid, week_index smallint, payload jsonb, created_at timestamptz, notified_at timestamptz,
  primary key (plan_id, week_index)
)

training_plan_recovery_daily (
  user_id uuid, local_date date, score smallint, level text, has_data boolean,
  computed_at timestamptz, primary key (user_id, local_date)
)
```

- `workout_sessions` gana `plan_session_id uuid null`.
- `weekly_plan_days` gana `plan_session_id uuid null` (o el equivalente según §0) para que `get_week_plan` siga siendo la fuente de Tu semana.
- Un movimiento no es un estado terminal: se deriva con `date <> original_date`; la sesión sigue `pending` y puede iniciarse normalmente.
- `goal` usa los valores canónicos del backend. El default mapea `gain_muscle`, `lose_weight` y `performance` directamente; `maintain` e `improve_health` se convierten a `performance` con `goal_from_profile: false`. `gain_strength` existe solo en este dominio y no modifica `profiles.goal`.
- RLS: cada usuario lee solo sus filas. Las escrituras van solo por RPC o desde las Edge Functions.

## 4. Generación

**Entrada:** la app envía a `ellie-chat` un mensaje estructurado en la clave raíz `training_plan_request` (no dentro de `message`). `message` sigue siendo un string obligatorio para el historial. Forma recomendada desde Crear plan:

```json
{
  "conversation_id": null,
  "client_message_id": "uuid-o-id-idempotente",
  "message": "Crear plan de entrenamiento",
  "mode": "generate_training_plan",
  "cards_v2": true,
  "stream": false,
  "training_plan_request": {
    "type": "training_plan_request",
    "goal": "gain_strength",
    "weeks": 8,
    "days_of_week": [1, 2, 4, 6],
    "session_minutes": 60,
    "goal_target": {
      "exercise_slug": "barbell-bench-press",
      "kind": "kg",
      "target": 100,
      "start_estimate": 85
    },
    "style_category": null
  }
}
```

`goal_target.exercise_slug` acepta exclusivamente `barbell-bench-press`, `barbell-squat`, `barbell-deadlift` o `pull-ups`; el servidor valida el catálogo, agrega `exercise_id` y conserva el slug en el plan. También se puede pedir en lenguaje natural ("ármame un plan de 3 meses para ganar fuerza"): si falta algo, ELLIE pregunta solo eso. El objetivo por defecto viene del perfil.

**Duración recomendada:** 12 semanas para ganar músculo, ganar fuerza y rendimiento; 8 semanas para perder grasa.

**Lo calcula el servidor, no la IA:**

1. **Semanas y bloques:** bloques de 4 (3 de carga + 1 de descarga). La semana 1 es `calibracion` si faltan pesos de los ejercicios principales. La última semana del plan es `descarga_test`: las primeras sesiones son de descarga y las últimas de test de las anclas (con 4 días: descarga lunes y martes, test jueves y sábado).
2. **Fases:** bloque 1 `base`, bloque 2 `desarrollo`, bloque 3 `pico`. Con 8 semanas: `base` y `pico`. Con 4: `base`, y su descarga lleva el test.
3. **Split según los días:**

| Días | Split                                                                                    |
| ---- | ---------------------------------------------------------------------------------------- |
| 2    | Cuerpo completo A / B                                                                    |
| 3    | Principiante: cuerpo completo A / B / C. Intermedio en adelante: Empuje / Tirón / Pierna |
| 4    | Torso / Pierna × 2                                                                       |
| 5    | Empuje / Tirón / Pierna + Torso / Pierna                                                 |
| 6    | Empuje / Tirón / Pierna × 2 (avanzado)                                                   |

4. **Tipo de cada sesión en las semanas de carga:** cada grupo del split (torso/pierna o empuje/tirón/pierna) tiene al menos un día `pesado` por semana. Con 4 días Torso/Pierna son, en orden, Torso pesado, Pierna pesado, Torso volumen y Pierna volumen. `tecnico` solo se usa con 5 o más días o con objetivo `performance`. Descarga → `descarga`. Test → `test`. La etiqueta visible es `Técnico`.
5. **Prescripción por objetivo:**

| Objetivo      | Reps compuestos | Reps accesorios | RIR |
| ------------- | --------------- | --------------- | --- |
| Ganar músculo | 6–10            | 10–15           | 1–3 |
| Ganar fuerza  | 3–6             | 8–12            | 1–2 |
| Perder grasa  | 6–12            | 12–15           | 2–3 |
| Rendimiento   | 4–8             | 10–15           | 2–3 |

Sesión `pesado`: lado bajo del rango de reps y más descanso (120–180 s en compuestos). `volumen`: lado alto, una serie más en accesorios. `tecnico`: menos carga (RIR +1). Descarga: −1 serie, RIR 3 y −10 % de peso. Las reglas de prop-2 (compuestos con menos reps y más descanso, `units` solo en mancuernas o unilaterales) siguen vigentes. 6. **Ejercicios:** salen del motor de rutinas y del catálogo, con calentamiento obligatorio, nivel normalizado y equipamiento del atleta. Cada sesión tiene 1 o 2 **anclas**, siempre compuestos principales de empuje horizontal, empuje vertical, tirón horizontal, tirón vertical, sentadilla o bisagra. Nunca son aislamientos, ejercicios con banda, movilidad ni regresiones incompatibles con el nivel. Las anclas abren el bloque principal y conservan la prescripción de compuestos. Cada sesión cubre los patrones de su split sin repetir un patrón. Las anclas se mantienen todo el plan; los accesorios rotan al empezar cada bloque. Con `style_category`, se priorizan ejercicios y estructura de esa categoría de la biblioteca. Con `goal_target`, su ejercicio solo es ancla si cumple las mismas reglas. Press tras nuca, Jefferson curl, upright row y variantes similares de riesgo nunca se seleccionan por defecto, tampoco para nivel avanzado; solo se permiten con `style_category='old_school'` (también se acepta la etiqueta “Vieja escuela”) o cuando el ejercicio fue pedido expresamente (`goal_target.exercise_id` / `requested_exercise_slug`). El reemplazo preferido del press tras nuca es press militar/overhead con barra o mancuernas. 7. **Pesos de partida:** 1RM estimado (Epley) con las mejores series de las últimas 8 semanas. Peso recomendado = % del 1RM según las reps y el RIR objetivo, redondeado al equipamiento: barra +2,5 kg, mancuernas saltos de 2 kg. Sin datos → `calibrate = true` en la semana 1. 8. **Progresión planificada:** en fuerza, el % del 1RM sube semana a semana dentro del bloque. En músculo, sube el volumen (series) y la carga sube menos. Las cargas de las semanas futuras se guardan ya calculadas y se recalculan con §5.

**La IA solo** redacta el nombre del plan, el razonamiento de la tarjeta y elige entre candidatos válidos del catálogo. El servidor valida todo antes de emitir la tarjeta (solo ejercicios del catálogo, rangos válidos, días correctos y total de sesiones).

Al publicar la propuesta, el servidor crea inmediatamente el plan detallado en estado `draft`, incluidas semanas, sesiones, prescripciones y plantillas ocultas. La tarjeta guarda su `plan_id`; preview y activación leen ese mismo draft. Ajustar crea otro draft y el anterior queda `replaced`.

**Tarjeta en el chat** (`event: card`, tipo `training_plan_proposal`, guardada en `ellie_proposals` con `kind = 'training_plan'`; siguen las versiones de prop-2: "Ajustar" crea una v2 y la v1 queda `replaced`):

```jsonc
{
  "type": "training_plan_proposal",
  "proposal_id": "…",
  "version": 1,
  "payload": {
    "name": "Fuerza e hipertrofia",
    "goal": "gain_muscle",
    "goal_from_profile": true,
    "weeks": 12,
    "blocks": 3,
    "days_of_week": [1, 2, 4, 6],
    "session_minutes": 60,
    "split": "torso_pierna",
    "start_date": "2026-11-09",
    "end_date": "2027-01-31",
    "total_sessions": 48,
    "deloads": 3,
    "has_test": true,
    "calibration_week": false,
    "week_kinds": ["carga", "carga", "carga", "descarga", "…"],
    "typical_week": [
      { "weekday": 1, "session_type": "pesado", "title": "Torso · Pesado" },
      "…"
    ],
    "goal_target": {
      "exercise_name": "Press de banca",
      "target": 100,
      "unit": "kg",
      "start_estimate": 85
    },
    "reasoning": "…",
    "cover": "<file key>",
    "adjust_chips": [
      "Más pierna",
      "Solo 3 días",
      "Sesiones de 45 min",
      "Sin peso muerto"
    ]
  }
}
```

## 5. Progresión después de cada sesión

Se ejecuta cuando una sesión con `plan_session_id` pasa a `completed`. Si el feedback de esfuerzo llega después, la progresión y el resultado se recalculan idempotentemente con ese feedback tardío.

- **Cuenta como hecha** si se completó al menos el 60 % de las series; si no, `missed`.
- **Regla por ejercicio** (doble progresión):

| Lo que pasó                                                            | Próxima vez que toca ese ejercicio                                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Todas las series en el tope del rango, con el RIR objetivo o más fácil | Sube: +2,5 kg en compuestos de torso, +5 kg en compuestos de pierna, el siguiente par en mancuernas |
| Dentro del rango                                                       | Mismo peso                                                                                          |
| Por debajo del rango, o "al límite" antes de la última serie           | Mismo peso                                                                                          |
| Por debajo del rango 2 sesiones seguidas                               | Baja 5–10 %                                                                                         |
| Molestia en la zona                                                    | No sube (ver §6)                                                                                    |

El RIR real sale del feedback de sfb-1: fácil = 4+, bien = 2–3, duro = 1, al límite = 0. Sin feedback, se usa el RIR objetivo.

- **Calibración:** el peso registrado en la semana 1 pasa a ser el punto de partida, y se recalculan las cargas de las semanas siguientes.
- **Propagación:** el nuevo peso se aplica a la próxima sesión pendiente de ese ejercicio, y las semanas siguientes se recalculan con la progresión planificada a partir de él.
- **Peso corporal:** `recommended_kg` y `next_kg` siempre son `null`. Progresa una repetición por vez hasta el tope del rango; al completarlo, usa una variante de mayor nivel o una variante explícitamente lastrada si existe.
- **Resultado para la app** (resumen "Próxima vez"): `get_plan_session_outcome` (§7).

## 6. Ajustes y propuestas

| Disparador                                                           | Tipo             | Qué hace                                                                                       | Aprobación                                        |
| -------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Molestia registrada (sfb-1, `kind = discomfort`)                     | `discomfort`     | Cambia por variantes los ejercicios que cargan esa zona en las sesiones de los próximos 7 días | Ya aplicado (`applied`); el atleta puede `revert` |
| Un ancla sin subir su 1RM estimado en 3 sesiones seguidas            | `variant_stall`  | Propone una variante o un cambio de rango desde la semana siguiente                            | Sí                                                |
| Recuperación baja 3 días seguidos, o 2 sesiones "al límite" seguidas | `deload_early`   | Propone convertir la semana actual o la siguiente en descarga                                  | Sí                                                |
| Sesión pendiente cuyo día ya pasó                                    | `missed_session` | La marca `missed` y propone moverla a hoy (si hoy está libre) u omitirla                       | Sí                                                |
| 2 o más sesiones perdidas en la misma semana                         | `repeat_week`    | Propone repetir la semana (corre el resto del plan una semana)                                 | Sí                                                |

- El sueño y la nutrición **nunca** bloquean el plan ni generan ajustes; solo sugerencias en el contexto de ELLIE.
- La recuperación se guarda en un snapshot diario. `low` significa score `< 40`; un día sin Apple Health o sin score se guarda como `has_data = false` y nunca cuenta como bajo.
- Si el atleta no responde, el plan sigue como estaba. Una propuesta abierta caduca (`expired`) cuando ya no aplica (por ejemplo, la semana pasó).
- Una sesión `substituted` **no** cuenta como perdida para la adherencia, no dispara `missed_session` y su progresión pasa a la siguiente sesión de esos ejercicios.
- **Detección de perdidas y fin del plan:** con `pg_cron` si existe (cada hora, por zona horaria del usuario); si no, de forma perezosa en `get_training_plan_state`, `get_week_plan` y `get_training_plan`.

## 7. RPC

Todas devuelven `{ ok, … }` o `{ ok:false, error:"code", … }` (formato plano, como el resto), usan `auth.uid()`, y **todas** las de escritura reciben `p_client_id text` y son idempotentes por usuario + client id.

**Lectura**

- `get_training_plan_state()` → `{ ok, state: 'none'|'active'|'paused'|'completed', plan_id?, name?, week_index?, weeks?, block_index?, phase?, paused_until?, end_date?, read_only?, entitlement: { multi_week: true } }`.
- `get_week_plan(...)` (ampliada): si la semana pertenece a un plan, agrega `plan: { plan_id, name, week_index, weeks, block_index, phase, week_kind, paused_until?, segments: [{ week_index, kind, state: 'done'|'current'|'upcoming' }] }` y, por día, `plan_session: { id, session_type, title, minutes, status, substituted_by_name?, original_date? }`. Los días sin sesión dentro del plan activo son `kind: 'rest'` con `rest_label: 'Descanso en tu plan'`, no `empty`. Sin plan, responde como hoy.
- `get_training_plan_month(p_month date)` → semanas del mes con `week_index`, `kind` y por día `{ date, session_type?, status?, in_pause?, added_routine? }`.
- `get_training_plan(p_plan_id default activo)` → cabecera, bloques con sus barras (`load` relativa por semana), `progress_pct` (hechas ÷ total), `adherence_pct` (hechas ÷ hechas + perdidas; excluye pendientes y sustituidas), `sessions_done`, `sessions_total`, `goal_target`, y `anchors: [{ exercise_id, name, e1rm_by_week: [{ week_index, e1rm }], projection, delta_kg }]`. `e1rm_by_week` solo contiene valores no nulos cuando existen series reales de esa semana; las semanas futuras llevan `e1rm: null` y la carga planificada vive separada en `projection`.
- `get_training_plan_preview(p_proposal_id)` → las semanas completas para revisar antes de activar (31.3), con `replaces: [{ date, name }]` si hay sesiones planificadas a mano en esas fechas.
- `get_plan_session(p_plan_session_id)` → detalle (31.7): portada por tipo, `week_index`, fecha, tipo, banners (`calibration`, `deload`), y por ejercicio `{ exercise_id, name, image, sets, rep_min, rep_max, rir, rest_s, recommended_kg, calibrate, is_anchor, last_time: { sets, reps, kg } | null }`.
- `get_plan_session_outcome(p_workout_session_id)` → por ejercicio `{ exercise_id, name, next_kg, next_reps?, next_variant_id?, next_variant_name?, change: 'up'|'same'|'down'|'reps_up'|'variant', reason }` y una frase de resumen.
- `list_plan_adjustments(p_plan_id default activo)` → las abiertas y las aplicadas recientes.
- `get_training_plan_review(p_week_index default la última)` → 31.9: lo hecho (sesiones, series, volumen), lo que mejoró (1RM y récords), ajustes automáticos aplicados y propuestas abiertas.
- `get_training_plan_report(p_plan_id)` → 31.10: adherencia, sesiones, récords, meta, antes y después por ancla y propuesta del siguiente plan.

**Escritura**

- `activate_training_plan(p_proposal_id, p_client_id, p_confirm_replace boolean default false)`: activa el draft y materializa las sesiones en la semana. Errores: `week_has_sessions` (con `sessions: [{ date, name, source, coach_name? }]`), `plan_active_exists` con forma exacta `{ "ok": false, "error": "plan_active_exists", "plan": { "plan_id": "uuid", "name": "string" } }` (con `p_confirm_replace=true` el anterior pasa a `replaced`), `proposal_not_open`, `premium_required`.

- `get_goal_target_estimates()` → `{ ok:true, items:[{ exercise_slug, e1rm_kg, max_reps }] }`, siempre en el orden banca, sentadilla, peso muerto y dominadas. `e1rm_kg` y `max_reps` son nullable; usa sesiones `completed` de las últimas 8 semanas, excluye calentamientos y calcula e1RM con la misma fórmula Epley del plan.
- `start_plan_session(p_plan_session_id, p_client_id)` → `{ ok, session_id, workout }`, igual que `start_routine_proposal`, con `plan_session_id` en la sesión.
- `respond_plan_adjustment(p_adjustment_id, p_action, p_client_id)`, con `p_action` en `approve | reject | move_today | skip | revert | ack`.
- `pause_training_plan(p_weeks smallint, p_client_id)` (1 o 2): corre las sesiones pendientes y la fecha de fin. Errores: `pause_limit`, `plan_not_active`.
- `resume_training_plan(p_client_id)`: vuelve a `active` desde hoy y reubica las pendientes en los próximos días de entreno, manteniendo el orden.
- `change_plan_days(p_days smallint[], p_client_id)`: reparte las sesiones desde la semana siguiente en los días nuevos.
- `change_plan_goal_duration(p_goal, p_weeks, p_client_id)`: rehace las semanas que faltan. No acepta una duración menor que las semanas ya hechas (`invalid_duration`).
- `end_training_plan(p_client_id)`: pasa a `completed` con `ended_reason = 'early'` y genera el reporte.
- `save_plan_session_to_routines(p_plan_session_id, p_client_id)` → `{ ok, routine_id }`.
- `plan_routine_for_day` (prop-2), ampliada: si el día tiene una sesión del plan, devuelve `day_has_plan_session` con `{ plan_session_id, title, session_type }`. Con `p_replace = true`, esa sesión queda `substituted` con el nombre de la rutina nueva. En un día de descanso del plan, la agrega sin preguntar como rutina añadida.

**Errores:** `premium_required`, `plan_active_exists`, `week_has_sessions`, `proposal_not_open`, `plan_not_active`, `pause_limit`, `invalid_duration`, `invalid_days`, `day_has_plan_session`, `not_found` y los de prop-2.

## 8. ELLIE (`ellie-chat` y ctx-1)

- **Intención:** "plan de N semanas / meses", "ármame el mes", "quiero un plan para…", y el mensaje estructurado `training_plan_request`. Solo hay un camino: siempre emite `training_plan_proposal`, nunca un plan en texto.
- **Ajustar:** los chips y el texto libre generan una nueva versión de la misma propuesta.
- **Contexto (ctx-1):** agrega `training_plan: { state, name, week_index, weeks, phase, week_kind, today_session?: { title, session_type, recommended }, open_adjustments: n }`. ELLIE puede explicar el plan, la sesión de hoy y los pesos, y responder ajustes desde el chat ("pausa mi plan una semana" → confirma y llama la RPC).
- **Agregar a semana con plan:** si el día tiene sesión del plan, ELLIE responde con el texto de 31.4 y una tarjeta con Reemplazar / Elegir otro día.
- **Tarjetas de ajuste** (31.8) y **revisión semanal** (31.9) también se pueden mostrar en el chat: `plan_adjustment` y `plan_review`.

## 9. Integración con lo existente

- **Tu semana:** `get_week_plan` sigue siendo la fuente. Las sesiones del plan se materializan en `weekly_plan_days` al activar y se actualizan al pausar, retomar, cambiar días o repetir semana.
- **Inicio y Entrenos:** la "próxima sesión" sale de la sesión del plan cuando el estado es `active`.
- **Nutrición:** con un plan `active` o `paused`, `training_plan_sessions` tiene prioridad sobre el tipo guardado en el plan de comidas: el día es de entreno si y solo si existe una sesión con esa fecha y estado `pending`, `done` o `substituted`; cualquier otro día es descanso. Con `adjust_by_training = false` solo cambia `day_type`; con `true`, ese mismo tipo elige los objetivos `train` o `rest`. Sin plan de entreno se conserva el comportamiento previo. `training_days_per_week` del perfil sigue definiendo el factor de actividad, no el tipo del día.
- **Recuperación:** solo alimenta `deload_early`; nunca bloquea.
- **Push:** revisión semanal (domingo 19:00 local), propuesta nueva y fin del plan, con `send-push`.

## 10. Suscripción (preparado, no activo)

- Función `has_entitlement(p_user uuid, p_feature text)`; hoy devuelve `true` para `'training_plan_multi'`.
- `activate_training_plan`, `get_training_plan_month` y `get_training_plan` devuelven `premium_required` cuando sea `false`.
- Si un usuario deja de tener el permiso con un plan activo: `read_only = true`. El plan se ve y las sesiones se pueden hacer con sus pesos, pero no hay ajustes automáticos, propuestas ni revisión semanal; en gestionar solo está "Terminar antes". Al llegar la fecha de fin pasa a `completed`.

## 11. Escenarios de verificación

1. Crear un plan de 12 semanas, 4 días, 60 min, ganar músculo → tarjeta con 48 sesiones, 3 bloques, 3 descargas y test final; solo ejercicios del catálogo.
2. "Ajustar · Solo 3 días" → v2 con 36 sesiones; la v1 queda `replaced`.
3. Activar con sesiones planificadas a mano en esas fechas → `week_has_sessions`; con confirmación, se reemplazan.
4. Usuario sin pesos registrados → semana 1 `calibracion` y `calibrate = true` en sus ejercicios.
5. Completar una sesión con todas las series en el tope del rango y RIR 2 → el press de banca sube 2,5 kg y la sentadilla 5 kg en la próxima sesión, y las semanas siguientes se recalculan.
6. Completar solo el 50 % de las series → la sesión queda `missed`.
7. Molestia en la rodilla → los ejercicios de rodilla de los próximos 7 días cambian por variantes, ajuste `discomfort` aplicado; `revert` los devuelve.
8. Un ancla 3 sesiones sin subir → `variant_stall` abierta.
9. Día pasado sin hacer la sesión → `missed_session`; `move_today` la mueve a hoy.
10. Pausar 2 semanas → las pendientes y la fecha de fin se corren 2 semanas; una tercera semana de pausa → `pause_limit`.
11. `plan_routine_for_day` en un día con sesión del plan → `day_has_plan_session`; con `p_replace` → `substituted` y no cuenta como perdida.
12. Domingo 19:00 hora local → revisión creada y push enviada una sola vez.
13. Fin del plan → `completed`, reporte disponible y `get_week_plan` vuelve a la semana normal.
14. `has_entitlement` en `false` → `premium_required` al activar.

## 12. Entregables

1. El reporte de §0.
2. La migración idempotente: tablas, RLS, RPC y triggers.
3. Los cambios en `ellie-chat` (intención, generación, tarjetas y ctx-1).
4. Un JSON real de `training_plan_proposal`, de `get_week_plan` con plan y de `get_plan_session`.
5. Los smoke tests (`SET LOCAL ROLE authenticated`, JWT y `ROLLBACK`) con un `SELECT` final por escenario, no `RAISE NOTICE`.
6. Qué Edge Functions hay que desplegar y si hace falta un job de `pg_cron`.
