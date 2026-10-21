# v2.15 · Sueño, Tu semana, Variantes, Respira · Contratos backend ↔ app

Todas las RPC se llaman con el JWT del usuario (`supabase.rpc(...)`).
- Sin sesión → `{ ok:false, error:'unauthorized' }`. Con la clave pública, la llamada se rechaza por permisos.
- Errores: `{ ok:false, error, field? }`.
- "Hoy" es el día local según `profiles.timezone`, o `_tz` si se envía. Si no hay zona válida, se usa `America/Santiago`.
- Las semanas empiezan el lunes.
- Las tablas son de solo lectura para su dueño. Se escribe solo con estas RPC.

## 1. Sueño

### Tabla `sleep_nights`
`id, user_id, night_date, source, bedtime_at, wake_at, duration_min, quality, wake_feeling, stages, resting_hr, hrv_ms, created_at, updated_at`

- `night_date`: el día en que se despierta.
- `source`: `manual | apple_health`.
- `quality`: 1–5. Solo en manual.
- `wake_feeling`: `exhausted | tired | normal | rested | energized`. Solo en manual.
- `stages`: `{ awake_min, rem_min, core_min, deep_min, segments:[{stage,start,end}] }`. Solo en Health.
- Única por `(user_id, night_date, source)`. Si el mismo día hay noche de Health y manual, manda la de Health.

### log_sleep_manual(_night_date, _bedtime_at, _wake_at, _quality = null, _wake_feeling = null)
- Es un upsert: Editar usa la misma llamada.
- `duration_min = wake_at − bedtime_at`, como máximo 18 h.
- `_night_date` puede ir desde hoy hasta 60 días atrás.
- → `{ ok, night }`
- Errores: `invalid_input` con `field`: `night_date | wake_at | quality | wake_feeling`.

### upsert_sleep_from_health(_nights jsonb)
Entrada: un lote de 1 a 14 noches:
```json
[{ "night_date": "YYYY-MM-DD?", "bedtime_at": "iso", "wake_at": "iso", "duration_min": 0,
   "stages": {...}, "resting_hr": 58, "hrv_ms": 55 }]
```
- Si falta `night_date`: se usa el día local de `wake_at`.
- Si falta `duration_min`: se usa `rem + core + deep`, o `wake − bedtime` si no hay fases.
- Es idempotente por `(night_date, apple_health)`: si se reenvía, se actualiza y no se duplica.
- → `{ ok, upserted }`
- Error: `invalid_input` con `field: 'nights' | 'nights[i]'`.

### get_sleep_overview(_tz = null)
```json
{ "ok": true, "date": "YYYY-MM-DD",
  "source": "apple_health | manual | none",
  "last_night": { "...fila de sleep_nights sin user_id" },
  "wake_feeling": "tired | null",
  "recovery": { "score": 86, "level": "low|medium|high", "headline_code": "ready|moderate|easy",
                "estimate": true,
                "components": { "sleep": 87, "physiology": 71, "load": 100,
                                "weights": { "sleep": 0.6, "physiology": 0.2, "load": 0.2 } } },
  "nights_7": [{ "night_date", "duration_min", "bedtime_at", "wake_at", "source" }],
  "avg_7_min": 450, "consistency_min": 18, "delta_vs_prev_week_min": -12,
  "yesterday_load": { "level": "low|medium|high", "minutes": 0, "volume_kg": 0 } }
```
- `last_night`: la noche más reciente de los últimos 7 días (si hay Health ese día, la de Health).
- `wake_feeling`: lo que la persona marcó a mano esa misma noche, aunque mande Health. ELLIE lo usa.
- `recovery`: es `null` si `last_night` no es de Apple Health o si es anterior a ayer (regla 25.2.1).
- `nights_7`: una noche por día, de los 7 días que terminan hoy.
- `consistency_min`: desviación típica de la hora de acostarse, en minutos. Es `null` con menos de 2 noches.
- `delta_vs_prev_week_min`: `avg_7_min` menos el promedio de los 7 días anteriores. Es `null` si no hay datos.
- `yesterday_load`: sale de las `workout_sessions` completadas ayer.
  - `high`: ≥ 75 min o ≥ 10.000 kg.
  - `medium`: ≥ 30 min o ≥ 4.000 kg.
  - `low`: el resto.

### Fórmula de recuperación (estimación, 0–100)
Solo se calcula con una noche de Apple Health.
1. **Sueño (S)**
   - `D = min(duration_min / 480, 1) × 100`: la duración frente a 8 h.
   - Si hay fases: `Q = min(((rem + deep) / (rem + core + deep)) / 0,40, 1) × 100`. Un 40 % o más de REM + profundo da la puntuación máxima.
   - `S = 0,7·D + 0,3·Q`. Sin fases, `S = D`.
2. **Fisiología (P)**: frente a la media de las 7 noches de Health anteriores.
   - VFC: `50 + (hrv / media − 1) × 250`, limitado a 0–100. Un +20 % da 100.
   - FC en reposo: `50 − (fc / media − 1) × 500`, limitado a 0–100. Un −10 % da 100.
   - `P` es el promedio de las dos que haya.
3. **Carga de ayer (L)**: `low` = 100, `medium` = 70, `high` = 40.
4. **Puntuación**
   - `score = 0,6·S + 0,2·P + 0,2·L`.
   - Sin VFC ni FC (o sin línea base): `score = 0,75·S + 0,25·L`.
5. **Nivel**
   - ≥ 70: `high` / `ready`.
   - 40–69: `medium` / `moderate`.
   - < 40: `low` / `easy`.

Se muestra siempre como **estimación** (`estimate: true`).

## 2. Tu semana (F-02)

### Tablas
- `weekly_plans`: `id, user_id, week_start (lunes), origin (ellie|manual), answers, activated_at, created_at, updated_at`, más `preview_answers` y `preview_days` (la vista previa de ELLIE todavía sin activar).
  - Única por `(user_id, week_start)`.
- `weekly_plan_days`: `plan_id, date, kind (session|rest|unavailable|empty), routine_id, minutes (15–90, en pasos de 5), moved_from, skipped_resolution (rescheduled|kept)`.
  - PK `(plan_id, date)`.
- El plan está **activo** si `activated_at` no es nulo. Solo un plan activo cuenta para `get_today_suggestion`.

### get_week_plan(_week_start = null, _tz = null)
`_week_start` tiene que ser lunes. Si no se envía, se usa la semana actual.
```json
{ "ok": true, "week_start": "YYYY-MM-DD", "today": "YYYY-MM-DD",
  "plan": { "id", "week_start", "origin", "answers", "active": true, "activated_at", "has_preview": false } | null,
  "days": [7 × { "date", "kind", "routine": { "id","title","type","duration","routine_category","exercise_count","thumb_key" } | null,
                 "minutes", "moved_from", "skipped_resolution",
                 "status": "done|today|missed|planned|rest|unavailable|empty",
                 "core33": { "active": true, "day": 5, "habits_done": 2 } | null }],
  "summary": { "sessions_done", "sessions_planned", "rest_days" },
  "missed": { "date", "routine_id", "proposed_date" } | null }
```
- `status`:
  - `done`: ese día hay una `workout_session` con `status='completed'` (`date` = ese día).
  - Si no, `rest`, `unavailable` o `empty` según `kind`.
  - Para una sesión: `today` si es hoy, `missed` si ya pasó y `planned` si es futura.
- `missed`: el primer día pasado con sesión, sin entreno y sin resolver.
  - `proposed_date`: el primer día desde hoy que esté `empty` (o, si no hay, `rest`).
  - Lo propone ELLIE; el servidor nunca reacomoda solo.

### set_week_day(_date, _patch)
- `_patch`: `{ kind?, routine_id?, minutes? }`.
- Si no existe el plan de esa semana, lo crea como `manual` y activo.
- Solo se puede cambiar hoy o un día futuro. Si no → `past_day`.
- `session` exige una rutina visible y no archivada; si no → `routine_not_found`.
- `minutes`: si no se envía, se usa la duración de la rutina, redondeada a 5 y entre 15 y 90.
- Una rutina de movilidad y un día `rest` (descanso activo) quedan siempre en **15 min** (regla 25.1.3).
- `unavailable` y `empty` quedan sin rutina y sin minutos.
- → `{ ok, plan_id, day }`

### move_week_day(_from, _to)
- Intercambia los dos días. Tienen que ser de la misma semana y desde hoy en adelante.
- `moved_from` apunta al día de origen de cada sesión.
- → `{ ok }` · Errores: `past_day`, `invalid_input`.

### clear_week(_week_start)
"Hazla tú": deja en `empty` los días desde hoy y el plan pasa a `origin: manual`.
→ `{ ok, plan_id, cleared }`

### plan_week_with_ellie(_answers, _tz = null)
- `_answers`: `{ days: [1..7] (ISO, 1 = lunes), focus: strength|hypertrophy|endurance|mixed, minutes: 30|45|60|75, week_start?: lunes }`.
- Genera una **vista previa sin activarla**. El plan activo que ya exista no se toca hasta que se llame a `activate_week_plan`.
- Reglas:
  - Los días no disponibles quedan como `unavailable` y los días pasados como `empty`.
  - Como máximo 3 sesiones seguidas; el cuarto día pasa a `rest` (15 min).
  - No se repite ninguna rutina en la semana.
  - Usa el mismo filtro de equipo y nivel que `get_today_suggestion`.
  - Da prioridad al foco y alterna zonas respecto al día anterior.
  - Se acerca a los minutos elegidos.
- → `{ ok, plan_id, week_start, preview: true, days: [7 × { date, kind, routine_id, minutes, routine }] }`
- Errores: `invalid_input` con `field`: `days | focus | minutes | week_start | answers`.

### activate_week_plan(_plan_id) · deactivate_week_plan(_plan_id)
- `activate_week_plan`: aplica la vista previa (solo a los días desde hoy; los pasados se conservan), pone `origin: ellie` y activa el plan.
  - Sin vista previa, solo reactiva el plan.
- `deactivate_week_plan`: desactiva el plan sin borrar nada.
- → `{ ok, plan_id, active }` · Error: `plan_not_found`.

### regenerate_week_day(_date)
"Otra con ELLIE": cambia solo ese día por otra rutina, sin repetir ninguna de la semana. Solo hoy o días futuros.
→ `{ ok, day: { ..., routine } }` · Errores: `past_day`, `no_candidates`.

### resolve_missed_day(_date, _action 'reschedule'|'keep', _to = null)
- `keep`: marca el día como `skipped_resolution = 'kept'`.
- `reschedule`: mueve la sesión a `_to` (o, si no se envía, al `proposed_date` de `get_week_plan`). Ese día tiene que estar `empty` o `rest`, ser de esa semana y desde hoy. El día original queda como `rescheduled`.
- → `{ ok, action, date? }` · Errores: `not_missed`, `no_free_day`, `invalid_input`.

### get_today_suggestion (cambio)
- Si el plan activo tiene hoy `session` → `{ ok, source:'weekly_plan', suggestion:{ routine_id, title, routine_category, zone, difficulty, duration (= minutos del día), origin, reason: 'De tu plan de la semana', reason_code:'weekly_plan', last_zone:null, date } }`.
- Si hoy es `rest` o `unavailable` → `{ ok, source:'weekly_plan', suggestion:null, reason_code:'rest_day', kind, date }`.
- Si hoy es `empty` o no hay plan activo → las mismas reglas de siempre.

## 3. Variantes

### list_exercise_variants(_exercise_id, _reason = null, _exclude_exercise_id = null, _locale = null)
- Devuelve ejercicios activos que tienen el mismo **músculo primario** y comparten al menos un **patrón** con el original.
- Excluye el propio ejercicio y `_exclude_exercise_id`.
- Filtra por `profiles.available_equipment` si no está vacío. Cuentan barra, mancuernas, cable, máquinas, bandas y kettlebell.
- `_reason`:
  - `machine_busy`: excluye máquina y cable.
  - `no_dumbbells`: excluye los que usan mancuernas.
  - `discomfort`: ordena por equipo `machine > cable > bodyweight > barbell > dumbbell`.
  - `null`: ordena por similitud (patrones y músculos compartidos, y la misma dificultad).
- Grupos de equipo:
  - `machine`: machine, sled.
  - `cable`: cable-machine.
  - `barbell`: barbell, weight-plate.
  - `dumbbell`: dumbbell, kettlebell.
  - `bodyweight`: el resto o sin equipo.
- Máximo **3** resultados. Nombres en `_locale` o `profiles.language` (si falta la traducción, en inglés).
```json
{ "ok": true,
  "original": { "id", "name", "primary_muscle": "chest", "pattern": "push", "equipment_group": "dumbbell" },
  "items": [{ "id", "name", "equipment": ["machine"], "equipment_group": "machine",
              "note": "En máquina", "thumb_key": "movekit/thumbs/<slug>.webp", "recommended": true }] }
```
- `recommended` es true solo en la primera, y solo si hay `_reason`.
- Errores: `exercise_not_found`, `invalid_input` con `field: 'reason'`.

### replace_routine_exercise(_routine_id, _template_exercise_id, _new_exercise_id)
- Rutina **propia** y no archivada: cambia el ejercicio en el sitio → `{ ok, copied:false, routine }`.
- Rutina **oficial o de otro dueño**: la duplica como rutina del usuario (`origin: user`, privada) con el cambio → `{ ok, copied:true, source_routine_id, routine }`.
  - La app tiene que usar `routine.id` a partir de ahí.
- `routine` tiene el formato de `get_routine`.
- Errores: `routine_not_found`, `exercise_not_found` (con `exercise_ids`), `invalid_input` con `field: 'template_exercise_id'`.

### Sesión: columnas nuevas en `workout_session_exercises`
- `original_exercise_id uuid null`: el ejercicio planificado que se sustituyó.
- `variant_reason text null`: `machine_busy | no_dumbbells | discomfort | other`.
- Cuando se usa una variante: `exercise_id` = la variante y `original_exercise_id` = el original.

## 4. Respira

Tabla `breathing_sessions`: `id, user_id, completed_at, duration_s (60–3600)`.

### log_breathing_session(_duration_s = 60)
- Llamar solo al llegar a 60 s.
- Si ya hay otra sesión registrada en los últimos 55 s, no se duplica (`deduped: true`).
- → `{ ok, week_start, week_count, deduped }`
- Error: `invalid_input` con `field: 'duration_s'` (menos de 60).

### get_breathing_week(_tz = null)
→ `{ ok, week_start, week_count }`: las sesiones desde el lunes local.

## 5. ELLIE
El contexto del servidor ahora incluye:
- `sleep`: `source`, `last_night`, `wake_feeling`, `lower_volume_hint`, `avg_7_min`, `nights_7`, `recovery_today` (estimación o null), `yesterday_load`.
- `week_plan`: `active`, `summary`, `missed`, `days` (`date`, `kind`, `status`, `minutes`, `routine`).
- `breathing_week_count`.

Si `wake_feeling` es `exhausted` o `tired`, ELLIE propone bajar el volumen de hoy (regla 25.2.4).
