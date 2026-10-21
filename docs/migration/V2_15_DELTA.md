# V2.15 · Delta (reconocimiento, sin código)

Fuente: handoff §25 y el índice visual, sección "Entrega v2.15" (22 IDs nuevos). Fecha: 2026-10-20.
Decisiones ya cerradas (no se discuten aquí):
- variantes solo en Sesión;
- "Técnica" (MoveKit) en lugar de "3D";
- halo mini en las acciones de IA;
- sueño con el token Recovery Blue;
- "Sonidos y vibración" y "Ver guías de nuevo" en Ajustes;
- Ruta Premium se ignora;
- el modo voz se elimina.

## 1. Features

| § | Feature | IDs | Tipo | Hoy en la app | Datos que necesita |
|---|---|---|---|---|---|
| 25.1 | Tu semana | WEEK_01–05 | Nuevo | **No existe.** No hay pantalla ni modelo de plan. `get_today_suggestion` ya prevé `source: 'weekly_plan'` (F-02), pero la tabla no existe. | Por día: rutina, minutos, descanso, no disponible, vacío, movido. Respuestas del plan: días, foco y duración. Día saltado y cómo se resolvió. Core 33 de cada día, que ya existe. Biblioteca de rutinas con `list_routines`, que ya existe. |
| 25.2 | Sueño | SLEEP_01–04 | Nuevo | **No existe.** No hay HealthKit: `HealthSettingsScreen` es un placeholder (DA-97). | Manual: hora de dormir, hora de despertar, calidad 1–5 y sensación (5 niveles). Health: duración, horario, fases, 7 noches, FC en reposo, VFC, carga de ayer y puntuación de recuperación. |
| 25.3 | Respira | BREATHE_01–05 | Nuevo | **No existe.** | Sesiones completadas esta semana, para la tile. |
| 25.4 | Guías | COACH_01 | Nuevo | **No existe.** | Guías vistas por pantalla y si las guías están activadas. Se guarda en el dispositivo. |
| 25.5 | Inicio | HOME_18–20 | Cambio | **Parcial.** Inicio v2 existe, pero falta la tira Tu semana y las tiles Sueño + Respira. La card Ruta es la antigua (`RouteInviteCard` / `RouteDoneCard`). | Tira: el plan de la semana (25.1). Tiles: última noche (25.2) y conteo de Respira (25.3). Ruta: última ruta, que ya existe. |
| 25.6 | Variantes en Sesión | SESSION_10–12 | Nuevo | **No existe.** Sesión v2 ya tiene el botón "Técnica" (`SessionViews.tsx:517`). | Alternativas con el mismo músculo y el mismo patrón, y equipo de cada una. Guardar en la rutina. Registrar la variante en la sesión. |
| 25.7 | Quiz · sonido | — (sin captura) | Cambio | **Parcial.** Hay háptica por respuesta (`QuizQuestionScreen.tsx:80`). No hay sonido ni librería de audio instalada. | Ninguno (front). |
| 25.8 | Sonidos | — | Nuevo | **No existe.** No hay `expo-audio` ni archivos de sonido. | El silencio se guarda en el dispositivo. |
| 25.9 | ELLIE · portada | ELLIE_08 (sustituye a ELLIE_01) | Cambio | **Parcial.** `EllieHome` v2 existe con la composición v2.12: sigue la sección "Para leer con ELLIE" (`EllieHome.tsx:218`) y queda el acceso a voz (`EllieScreen.tsx:147` → `EllieVoice`). | Historial de conversaciones (ya existe). |

## 2. Backend · Lista para Lovable

> Texto listo para copiar. Contratos al estilo de `docs/backend/*_SHAPES.md`: RPC con JWT, `{ ok, … }` y errores `unauthorized` / `invalid_input`.

### 2.1 Sueño (no existe nada hoy)

**Tabla `sleep_nights`** (RLS: solo el dueño):

| Campo | Tipo y regla |
|---|---|
| `id` | uuid, PK |
| `user_id` | uuid, FK a profiles |
| `night_date` | date: el día en que se despierta, en la zona de `profiles.timezone` |
| `source` | text: `manual \| apple_health` |
| `bedtime_at` | timestamptz |
| `wake_at` | timestamptz |
| `duration_min` | int |
| `quality` | smallint 1–5. Solo manual; null en Health. |
| `wake_feeling` | text: `exhausted \| tired \| normal \| rested \| energized`. Solo manual. |
| `stages` | jsonb, null en manual: `{ awake_min, rem_min, core_min, deep_min, segments: [{ stage, start, end }] }` |
| `resting_hr` | numeric, null en manual |
| `hrv_ms` | numeric, null en manual |
| `created_at` | timestamptz |
| `updated_at` | timestamptz |

- Único por `(user_id, night_date, source)`.
- Si hay noche de Health y manual el mismo día, manda Health.

**RPC:**
- `log_sleep_manual(_night_date date, _bedtime_at timestamptz, _wake_at timestamptz, _quality int, _wake_feeling text)`.
  - Es un upsert: así funciona Editar.
  - Devuelve `{ ok, night }`.
- `upsert_sleep_from_health(_nights jsonb)`.
  - Recibe un lote de hasta 14 noches que la app lee de HealthKit (incluye `stages`, `resting_hr` y `hrv_ms`).
  - Es idempotente por `(night_date, source)`.
  - Devuelve `{ ok, upserted }`.
- `get_sleep_overview(_tz text = null)`. Devuelve:

```json
{ "ok": true, "source": "apple_health | manual | none",
  "last_night": { "...fila de sleep_nights" },
  "recovery": { "score": 84, "level": "low | medium | high", "headline_code": "ready | moderate | easy" },
  "nights_7": [{ "night_date", "duration_min", "bedtime_at", "wake_at" }],
  "avg_7_min": 0, "consistency_min": 0, "delta_vs_prev_week_min": 0,
  "yesterday_load": { "level": "low | medium | high", "minutes": 0, "volume_kg": 0 } }
```

- `recovery` es null si `source` no es `apple_health`: sin dispositivo no se estima nada (regla 25.2.1).
- La fórmula de `score` la decide el servidor y la tiene que documentar. Entradas: duración contra 8 h, fases, VFC y FC en reposo contra la media de 7 días, y carga de ayer.
- `yesterday_load` sale de `workout_sessions`, que ya existe.

**ELLIE (`ellie-chat`):**
- Añadir al contexto del servidor la noche de hoy y el promedio de 7 noches.
- Si `wake_feeling` es `exhausted` o `tired`, incluir una pista para proponer bajar el volumen de hoy (regla 25.2.4).
- Hoy el contexto incluye perfil, entrenos, agua, nutrición, récords y escaneos, pero **no sueño**.

### 2.2 Tu semana (F-02, citado en `get_today_suggestion` pero no existe)

**Tabla `weekly_plans`** (RLS: dueño):

| Campo | Tipo |
|---|---|
| `id` | uuid |
| `user_id` | uuid |
| `week_start` | date: el lunes, en la zona del perfil |
| `origin` | text: `ellie \| manual` |
| `answers` | jsonb: `{ days: [1..7], focus: 'strength \| hypertrophy \| endurance \| mixed', minutes: 30 \| 45 \| 60 \| 75 }`; null si es manual |
| `activated_at` | timestamptz |
| `created_at` | timestamptz |
| `updated_at` | timestamptz |

- Único por `(user_id, week_start)`.

**Tabla `weekly_plan_days`:**

| Campo | Tipo |
|---|---|
| `plan_id` | FK |
| `date` | date |
| `kind` | text: `session \| rest \| unavailable \| empty` |
| `routine_id` | uuid, null |
| `minutes` | int 15–90, en pasos de 5 |
| `moved_from` | date, null |
| `skipped_resolution` | text: `rescheduled \| kept`, null |

- PK `(plan_id, date)`.

**RPC:**
- `get_week_plan(_week_start date = null, _tz text = null)`. Devuelve:
  - `{ ok, plan, days: [7 × { date, kind, routine: {id,title,type,duration,exercise_count,thumb_key}|null, minutes, moved_from, status: 'done|today|missed|planned|rest|unavailable|empty', core33: {active,day,habits_done}|null }], summary: { sessions_done, sessions_planned, rest_days }, missed: { date, routine_id, proposed_date }|null }`.
  - `status: done` se cruza con `workout_sessions` completadas ese día.
- `set_week_day(_date date, _patch jsonb)`.
  - `_patch` admite `kind`, `routine_id` y `minutes`.
  - Solo hoy o días futuros; si no, devuelve `past_day`.
  - Movilidad o descanso activo fuerzan 15 minutos (regla 25.1.3).
- `move_week_day(_from date, _to date)`. Intercambia los dos días.
- `clear_week(_week_start date)`. Es "Hazla tú": deja los días desde hoy en `empty`.
- `plan_week_with_ellie(_answers jsonb, _tz text = null)`.
  - Genera y devuelve la vista previa sin activarla.
  - Reglas: como máximo 3 días de entreno seguidos, nada en días no disponibles y no repetir rutinas. Usa el mismo filtrado de equipo y nivel que `get_today_suggestion`.
- `activate_week_plan(_plan_id uuid)`.
- `regenerate_week_day(_date date)`. Es "Otra con ELLIE": cambia solo ese día y excluye las rutinas ya usadas en la semana.
- `resolve_missed_day(_date date, _action 'reschedule|keep')`.
  - ELLIE solo propone el día; el usuario confirma. El servidor nunca reacomoda solo.
- `get_today_suggestion`: si `weekly_plan_days` de hoy tiene `kind = session`, devuelve esa rutina con `source: 'weekly_plan'`. Si es `rest` o `unavailable`, devuelve `suggestion: null` con un `source: 'weekly_plan'` y `reason_code: 'rest_day'` nuevo.

### 2.3 Variantes (Sesión)

**RPC `list_exercise_variants(_exercise_id uuid, _reason text = null, _exclude_exercise_id uuid = null, _locale text = null)`:**
- Devuelve otros ejercicios activos que comparten el **músculo primario** y el **patrón** (`movement_patterns`) del original.
- Excluye el propio ejercicio y `_exclude_exercise_id` (la variante ya aplicada).
- `_reason`:
  - `machine_busy`: excluye máquinas.
  - `no_dumbbells`: excluye mancuernas.
  - `discomfort`: ordena por equipo `machine > cable > bodyweight > barbell > dumbbell`.
  - null: ordena por similitud.
- Filtra por `profiles.available_equipment` si no está vacío.
- Máximo 3 resultados.
- Devuelve:
  - `{ ok, original: { id, name, primary_muscle, pattern }, items: [{ id, name, equipment: [slug], equipment_group: 'barbell|machine|cable|bodyweight|dumbbell', note, thumb_key, recommended: bool }] }`.
  - `recommended` es true solo en la primera, y solo si hay `_reason`.
- Usa los catálogos que ya existen (`muscles`, `equipment`, `movement_patterns`). Con `list_exercises` actual no basta: no excluye equipo ni agrupa.

**"Guardar en la rutina":**
- Si la rutina es propia: basta `update_user_routine`, que ya existe.
- Si es oficial o de otro dueño: falta una RPC `replace_routine_exercise(_routine_id, _template_exercise_id, _new_exercise_id)` que, si la rutina no es propia, la **duplique como `user`** y devuelva la copia. Hay que confirmarlo con producto si no se quiere el duplicado.

**Sesión (opcional, recomendado):**
- Añadir a la tabla de ejercicios de sesión `original_exercise_id uuid null` y `variant_reason text null`.
- Hoy se guarda `exercise_id` + `template_exercise_id`, y la variante quedaría registrada sin saber de qué ejercicio viene.

### 2.4 Respira

- **Mínimo, recomendado:** tabla `breathing_sessions (id, user_id, completed_at timestamptz, duration_s int default 60)` con RLS de dueño.
- RPC `log_breathing_session()`. Devuelve `{ ok, week_count }`.
- RPC `get_breathing_week(_tz)`. Devuelve `{ ok, week_count }`.
- Solo se registra al llegar a 60 s.
- Así se resuelve el contador de la semana, que no se reinicia (25.10.7), y ELLIE puede usarlo.
- **Alternativa sin backend:** contarlo en el dispositivo (AsyncStorage). Se pierde al reinstalar o al cambiar de dispositivo.

## 3. Nativo · Sueño desde HealthKit

- **Ya existe:**
  - el entitlement `com.apple.developer.healthkit`;
  - `NSHealthShareUsageDescription` y `NSHealthUpdateUsageDescription` en `Info.plist`.
- **Falta cambiar el texto de lectura:** hoy dice "lee tus entrenos". Debe mencionar sueño, frecuencia cardíaca y VFC, o App Review lo puede rechazar.
- **Librería propuesta:** `@kingstinct/react-native-healthkit`.
  - Usa Nitro Modules y es compatible con la New Architecture de RN 0.85.
  - Necesita `react-native-nitro-modules`.
  - Antes de instalar hay que comprobar la versión exacta compatible con RN 0.85 / Expo 56.
  - El proyecto es bare con `ios/`: se instala con pods. El config plugin no aplica automáticamente.
  - Descartada: `react-native-health`, que es puente antiguo y está poco mantenida.
- **Tipos que se leen:**
  - `HKCategoryTypeIdentifierSleepAnalysis`: fases `asleepCore`, `asleepDeep`, `asleepREM`, `awake` e `inBed` (fases desde iOS 16);
  - `HKQuantityTypeIdentifierRestingHeartRate`;
  - `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`.
  - Solo lectura: no hace falta escribir sueño.
- **Flujo:**
  1. Se piden permisos al tocar "Conectar Apple Health".
  2. Se leen las últimas 14 noches.
  3. Se envían con `upsert_sleep_from_health`.
  4. Se repite al abrir la app o Sueño.
  - No hace falta background delivery para v2.15.
- **Limitación:** HealthKit no dice si se negó el permiso de lectura. Hay que tratar "0 noches" como "sin datos" y diseñar ese caso (25.10.6).
- Solo iOS. En Android las tiles muestran siempre el flujo manual.

## 4. Solo front

- **Guías (25.4):**
  - Componente overlay con recorte y ficha.
  - Anclas estables por `ref` o `testID`, no por texto (25.10.9).
  - Visto por pantalla en AsyncStorage.
  - "Ver guías de nuevo" en Ajustes las reinicia.
  - La guía de Core 33 va sin elemento iluminado.
  - Depende de que existan Tu semana y las variantes para sus pasos.
- **Tarjetas de Inicio (25.5):**
  - Tira Tu semana: necesita `get_week_plan`.
  - Tiles Sueño y Respira: necesitan `get_sleep_overview` y el conteo de Respira. La tile de Sueño tiene que reflejar el registro manual (25.10.5).
  - La card Ruta rediseñada usa datos que ya existen, sin variante Premium.
- **Respira (25.3):** pantalla completa animada con Reanimated, que ya está instalado. El ambiente de ruido marrón es un archivo en bucle (ver 5).
- **Sonido del Quiz (25.7):**
  - Servicio `athSound` sobre `expo-audio`, que es dependencia nueva (SDK 56) y es el único añadido nativo.
  - La háptica de 25.7 se hace con `react-native-haptic-feedback`, que ya está.
  - Usa el ajuste "Sonidos y vibración".
  - Core 33 suena `day-close`.
- **Portada de ELLIE (25.9):**
  - Rehacer `EllieHome` según ELLIE_08: cabecera con historial, halo de 168 pt en anillo, CTA con halo mini, 2×2 + Escanear e input en flujo.
  - Quitar "Para leer con ELLIE".
- **Retirada del modo voz (B-27):**
  - Borrar `EllieVoiceScreen`, la ruta `EllieVoice`, `features/ellie/voice/*`, `EllieVoice` en `ChatParts` y `onVoice` en `EllieScreen`.
  - Desinstalar `expo-speech` y `expo-speech-recognition`.
  - Quitar `NSMicrophoneUsageDescription` y `NSSpeechRecognitionUsageDescription`, salvo que otro módulo use el micrófono (la cámara de Scan no lo usa).
- **Sesión:**
  - Pill "⟲ Variante" junto a "Técnica".
  - Hojas de lista y de guardar, toast y etiqueta en la ficha.
  - La lógica de exclusión vive en el servidor (2.3).

## 5. Sonidos · ¿basta la tabla 25.8?

**No del todo.**
- La tabla describe cada evento: piezas, notas, Hz, tiempos, paneo y reverb.
- Le faltan envolventes ADSR por pieza, volúmenes absolutos de casi todos los eventos, ratio e índice del mallet en `point`, `impact`, `complete` y `day-close`, y el envío de reverb por evento.
- Todo eso sí está en `ath-sound.js` (161 líneas). **La fuente fiable para generar los archivos es el JS, no la tabla.**

**Script propuesto:**
- Cargar `ath-sound.js` en Chromium headless (Playwright) y sustituir `AudioContext` por `OfflineAudioContext`.
- Renderizar cada evento a WAV de 48 kHz estéreo.
- Convertir a `.caf` con `afconvert`, nativo de macOS.

**Falta decidir o definir:**
1. **Formato:**
   - El handoff dice `sounds/<evento>.mp3`; aquí se pide `.caf` o `.wav`.
   - Propuesta: `.caf` (AAC o PCM) en iOS y `.wav` en Android.
2. **Eventos con parámetro, que dan más de un archivo:**

| Evento | Archivos |
|---|---|
| `tick-urgent` | 4, para k = 1–4 |
| `point` | 12 pasos de escala |
| `correct` | 2: normal y racha |
| `complete` | 3: bajo, medio y perfecto |
| `tick`, `tick-final`, `wrong`, `impact`, `day-close` | 1 cada uno |

   Total: unos 26 archivos.
3. **Aleatoriedad:** la reverb y el ruido usan `Math.random`. Hay que fijar una semilla para que el render sea reproducible.
4. **Volumen:** falta un objetivo de sonoridad (p. ej. −16 LUFS) y un pico máximo.
5. **Ambiente de Respira:**
   - Va fuera de `ath-sound.js`: ruido marrón con paso bajo de 420 Hz.
   - Necesita un bucle de 4 s **sin clic** (crossfade en el render).
   - Los fundidos se aplican en la app, no en el archivo.
6. **Modo silencio del teléfono (25.10.8):**
   - Propuesta: categoría de audio `ambient`, que respeta el interruptor de silencio y no corta la música del usuario.
   - Es una decisión de producto.
