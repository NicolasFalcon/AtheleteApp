# ATHELETE · Pendientes del backend

**Para:** backend (Lovable / Supabase) y Nicolás.
**Mantenido por:** el equipo de la app móvil. Cada vez que la app necesite algo del backend que aún no existe, se añade aquí en lugar de improvisarlo en la app.
**Fuente de lo que ya existe:** [`BACKEND_SUMMARY.md`](BACKEND_SUMMARY.md).
**Última actualización:** 2026-10-03 (Sesión).

Prioridad: **Alta** (bloquea una pantalla o un dato es incorrecto) · **Media** (la app funciona con un sustituto local o aproximado) · **Baja** (mejora u operación).

## Resumen

| ID | Feature | Pendiente | Prioridad | ¿Bloquea? |
|---|---|---|---|---|
| BT-01 | Core 33 | Catálogo de retos y estados elegido / preparado | Alta | Sí: Intro, Explorar, Detalle y Listo |
| BT-02 | Core 33 | `completed_at` en `challenge_participations` | Media | No (aproximación con `start_date + 32`) |
| BT-03 | Core 33 | ~~"Intro vista" y descartes de la card de Inicio en el perfil~~ | — | **Resuelto** (2026-10-03) |
| BT-04 | Gamificación | Activar el modo `strict` | Media | No |
| BT-05 | Gamificación | Cerrar `UPDATE` de `profiles.points` e `INSERT` en `user_badges` | Media | No (depende de la web) |
| BT-06 | ELLIE / Nutrición | Confirmar si `ellie-chat` usa el género para calorías | Baja | No |
| BT-07 | Social | Decidir si `exercise_reps` cuenta en retos entre amigos | Baja | No (producto) |
| BT-08 | Social | Proceso de moderación (revisión de reportes en 24 h, contacto de soporte) | Alta antes de lanzar Comunidad | Sí, para publicar Comunidad |
| BT-09 | Storage | Tipos de archivo en `social-photos` y `profile-photos`, 5 MB en `profile-photos` | Media | No (la app valida) |
| BT-10 | Storage | Verificar la limpieza diaria de fotos (`social-photos-cleanup`, 03:17 UTC) | Baja | No |
| BT-11 | Documentación | Corregir `training_level` en `BACKEND_SUMMARY.md` | Alta | No (la app ya usa los valores reales) |
| BT-12 | Entrenos | ~~Favoritos de rutinas y ejercicios en una tabla~~ | — | **Resuelto** (2026-10-03) |
| BT-13 | Entrenos | Videos MoveKit (MP4 en loop + póster) por ejercicio | Alta para EXERCISE_01 | No (póster PLACEHOLDER) |
| BT-14 | Entrenos | Técnica estructurada: tempo, fases, pasos con título, consecuencia de cada error, recomendaciones completas | Media | No (se oculta lo que falta) |
| BT-15 | Entrenos | ~~`workout_templates.type` con valores cerrados~~ | — | **Resuelto** (2026-10-03) |
| BT-16 | Entrenos | Conteos y búsqueda en servidor cuando crezca la biblioteca | Baja | No |
| BT-17 | Sesión | ~~Peso planificado por ejercicio en las rutinas (`template_exercises`)~~ | — | **Resuelto** (2026-10-03) |
| BT-18 | Sesión | ~~Confirmar cuándo se calcula `volume_kg` y qué tipos devuelve `detect_session_prs`~~ | — | **Resuelto** (2026-10-03) |
| BT-19 | Sesión | ~~Sesiones `saved` antiguas: caducidad o limpieza~~ | — | **Resuelto** (2026-10-03) |
| BT-20 | Sesión | ~~`rest_taken_sec` y fases del descanso (opcional)~~ | — | **Resuelto** (2026-10-03) |
| BT-21 | Entrenos / Sesión | Estructurar `exercises.recommended_sets_reps` (hoy texto libre con 444 valores fuera de "N x M") | Media | No (la app lo lee con un parser tolerante) |
| BT-22 | Core 33 | `profiles.core33_invite_dismiss_count` para recuperar el tope de 2 descartes de la tarjeta de Inicio | Baja | No (la tarjeta vuelve cada 14 días, D-54) |
| BT-23 | Progreso | Agregados de entrenos en el servidor (minutos activos por día, volumen medio por sesión y mes) | Baja | No (la app agrega en el dispositivo) |
| BT-24 | Logros | Progreso de logros y racha de hidratación completa desde el servidor | Media | No (la app lo mide con 30 días de hidratación) |

---

## Core 33

### BT-01 · Catálogo de retos y estados elegido / preparado
- **Qué falta:** hoy Core 33 no tiene catálogo en la base de datos. Hay un único reto con hábitos elegidos de presets en la app (`core33.ts`), y una participación es `active` desde que se crea. No existe "reto elegido pero no iniciado".
- **Por qué:** el flujo v2 (handoff §8) separa **elegir** de **empezar**:
  - Explorar retos → Detalle → "Elegir este reto" → "Tu Core 33 está listo" → "Comenzar Día 1".
  - La entrada inteligente necesita saber si hay un reto preparado.
- **Quién lo necesita:**
  - Core 33: Intro, Explorar retos, Detalle de reto, Tu Core 33 está listo, activo y completado;
  - la entrada única de la app (`resolveCore33Entry`);
  - la card de Inicio, que no debe mostrarse con un reto preparado;
  - Progreso · Retos.
- **Propuesta:**
  - Tabla `core33_challenges`:
    - `id uuid PK`, `slug text UNIQUE`, `title`, `category`, `level`, `description`, `cover_path`, `sort_order int`, `is_active bool`;
    - `habits jsonb`: 3 hábitos fijos `{index, title, pillar}`.
    - Seed con los 5 retos del handoff:
      - Construye fuerza;
      - Muévete cada día;
      - Recupera mejor;
      - Palabra cumplida;
      - Come con intención.
  - En `challenge_participations`:
    - `challenge_id uuid NULL → core33_challenges` (NULL = participaciones antiguas con hábitos propios; MIGRATION_PROGRESS §1, decisión 6: los retos activos siguen con su modelo);
    - `chosen_at timestamptz`, `started_at timestamptz NULL`;
    - nuevo estado `prepared` en `status` (elegido, no iniciado).
  - Una sola participación `prepared` o `active` por usuario: índice único parcial `(user_id) WHERE status IN ('prepared','active')`, como protección. Las RPC no usan `ON CONFLICT` contra ese índice.
  - RPC:
    - `choose_core33_challenge(_challenge_id)`: crea o reemplaza la participación `prepared`.
    - `start_core33_challenge()`: `prepared → active`, `start_date = hoy local`, `started_at = now()`.
    - `cancel_prepared_core33()`.
- **Prioridad:** Alta. **Bloquea** la migración de Core 33 v2.

### BT-02 · `completed_at` en `challenge_participations`
- **Qué falta:** las participaciones no guardan cuándo se completaron.
- **Por qué:** la card "Empieza otro Core 33" de Inicio (HOME_11) debe aparecer **desde el día siguiente** al completado.
  - Hoy la app aproxima la fecha del día 33 con `start_date + 32`.
  - Si alguien completa tarde, la card puede salir el mismo día del completado.
- **Quién lo necesita:** Inicio (card de descubrimiento) y, más adelante, la celebración y el historial de Core 33.
- **Propuesta:**
  - `challenge_participations.completed_at timestamptz NULL`;
  - se rellena al pasar a `completed`, con un trigger o en la RPC que lo cierre;
  - backfill de las existentes con `start_date + 32 días`.
- **Prioridad:** Media. **No bloquea.**

### BT-03 · "Intro vista" y descartes de la card de Core 33 en el perfil · ✅ resuelto (2026-10-03)
- **Aplicado por backend:** `profiles.core33_intro_seen_at`, `core33_completed_at` y `core33_invite_dismissed_at` (`timestamptz NULL`).
- **En la app:**
  - "Ahora no" escribe `core33_invite_dismissed_at` (UPDATE directo, RLS del dueño). La card vuelve a los 14 días. Un descarte anterior al día 33 del último Core 33 terminado ya no cuenta.
  - El "Ahora no" que había en AsyncStorage se sube una vez y se borra.
  - La herramienta dev "Restablecer card de Core 33" pone la columna a `null`.
  - `core33_intro_seen_at` y `core33_completed_at`: solo tipos y funciones de servicio (`markCore33IntroSeen`, `markCore33Completed`) para el módulo Core 33.
- **Cambio de regla (D-54):** con una sola fecha la app ya no puede saber cuántas veces se descartó la card, así que **desaparece el tope de dos descartes**: la card vuelve cada 14 días hasta que el usuario actúe. Se recupera cuando exista `profiles.core33_invite_dismiss_count` (ver BT-22).

---

## Gamificación

### BT-04 · Activar el modo `strict`
- **Qué falta:** `gamification_config.mode = 'strict'`.
- **Por qué:** en modo `log` el servidor acepta los puntos que envía la app y eventos desconocidos.
- **Requisito:** revisar antes la auditoría de `gamification_events.metadata.validation.strict_would` y ajustar el catálogo. La app móvil ya usa los nombres nuevos.
- **Quién:** backend, con aviso de Nicolás.
- **Prioridad:** Media. **No bloquea.**

### BT-05 · Cerrar `UPDATE` de `profiles.points` e `INSERT` en `user_badges`
- **Qué falta:** quitar las políticas que permiten al cliente escribir puntos y badges.
- **Por qué:** solo `award_gamification_event` debe otorgarlos. La app móvil ya no escribe directamente.
- **Requisito:** actualizar el `GamificationContext` de la **web** para que use solo la RPC.
- **Prioridad:** Media. **No bloquea** (depende de la web).

## ELLIE / Nutrición

### BT-06 · Género en `ellie-chat`
- **Qué falta:** confirmar si la edge function `ellie-chat` (planes nutricionales) usa el género para estimar calorías. Su código no está en el repo de la app.
- **Por qué:** el onboarding v2 ya no pide el género (`gender` puede ser `null`, BK-06).
- **Propuesta:** si lo usa, la app lo pediría al activar un plan cuando falte, sin añadirlo al onboarding.
- **Prioridad:** Baja.

## Social

### BT-07 · `exercise_reps` en retos entre amigos
- **Qué falta:** una decisión de producto. Hoy la métrica está bloqueada entre amigos (solo en el reto oficial).
- **Prioridad:** Baja. **No bloquea.**

### BT-08 · Proceso de moderación
- **Qué falta:**
  - quién revisa la cola (`moderation_queue`) y el compromiso de respuesta en 24 h que pide Apple;
  - el contacto de soporte publicado en la ficha de la App Store.
- **Por qué:** guía 1.2 de la App Store (contenido de usuarios).
- **Prioridad:** Alta **antes de publicar Comunidad**.

## Storage

### BT-09 · Tipos de archivo y tamaño
- **Qué falta:** restringir JPG/PNG/WebP en `social-photos` y `profile-photos`, y el límite de 5 MB en `profile-photos`, desde Cloud → Storage.
- **Quién:** Nicolás (manual).
- **Prioridad:** Media. Mientras tanto la app valida el tipo.

### BT-10 · Verificar la limpieza diaria de fotos
- **Qué falta:** tras las primeras publicaciones con foto, comprobar que `social-photos-cleanup` (03:17 UTC):
  - borra las fotos de posts eliminados en un día como mucho;
  - conserva 30 días las retiradas por moderación.
- **Prioridad:** Baja.

## Documentación

### BT-11 · `training_level` en `BACKEND_SUMMARY.md`
- **Qué falta:** el §1 dice `beginner | intermediate | advanced`, pero el CHECK real (`profiles_training_level_check`, comprobado contra Supabase el 2026-10-02) acepta `principiante | intermedio | avanzado`.
- **Por qué:** con los valores del documento, el guardado del onboarding fallaba (`23514`). La app ya usa los valores reales.
- **Propuesta:** corregir el §1 (o, si se prefiere el inglés, cambiar el CHECK y avisar para ajustar la app).
- **Prioridad:** Alta (documentación incorrecta). **No bloquea.**

---

## Entrenos

### BT-12 · Favoritos de rutinas y ejercicios · ✅ resuelto (2026-10-03)
- **Aplicado por backend:** `user_favorites (user_id, item_type 'routine' | 'exercise', item_id, created_at)`, PK `(user_id, item_type, item_id)`. RLS: select / insert / delete solo los propios; sin update.
- **En la app:** `user_favorites` es la fuente de verdad (UI optimista; si falla se revierte con un toast). Al iniciar sesión, los favoritos de AsyncStorage se suben una vez con upsert y se borran las claves locales (marca `@athelete/favorites-migrated-v1:<userId>`).

### BT-13 · Videos MoveKit
- **Qué falta:** los loops del ejercicio (MP4, cámara fija, sin audio) y un póster (primer fotograma limpio). `exercises.video_url` existe, pero no hay assets MoveKit ni un campo de póster.
- **Propuesta:** subir los MP4 a Storage (bucket público de solo lectura), rellenar `video_url` y añadir `poster_url`. La app tiene un único punto de integración (`MoveKitPlayer.tsx`). Reproducir video requerirá una dependencia nativa (decisión aparte).
- **Prioridad:** Alta para EXERCISE_01. **No bloquea** (póster PLACEHOLDER).

### BT-14 · Técnica estructurada del ejercicio
- **Qué falta** (la biblioteca solo tiene listas de texto):
  - tempo ("2-1-1") y fases del loop (nombre, duración, paso de técnica asociado), para los segmentos y la etiqueta de fase;
  - título por paso de la técnica completa (Agarre, Trayectoria, Respiración…);
  - consecuencia de cada error común ("Pierdes tensión y cargas el esternón.");
  - recomendaciones completas: muchas filas traen "-" en series / reps (la app oculta la prescripción).
- **Propuesta:** columnas JSONB en `exercises` (`tempo`, `phases`, `technique_steps [{title, text}]`, `common_mistakes [{title, consequence}]`), manteniendo las listas actuales hasta migrar.
- **Prioridad:** Media. **No bloquea.**

### BT-15 · Tipo de rutina · ✅ resuelto (2026-10-03)
- **Aplicado por backend:** `workout_templates.routine_category` (`fuerza | cuerpo_completo | tren_superior | tren_inferior | core | movilidad | acondicionamiento | hiit | cardio`, NULL permitido). La calcula el servidor; **la app nunca la escribe**.
- **En la app:** las tarjetas por tipo y la lista agrupan por `routine_category`. Una rutina con NULL solo aparece en "Todas". Se eliminó el mapeo local del texto libre `type` (que sigue existiendo para el asistente de rutinas).

### BT-16 · Conteos y búsqueda en servidor
- **Qué falta:** Entrenos carga toda la biblioteca y filtra en el dispositivo (conteos por tipo, zona y equipamiento). Sirve con el tamaño actual.
- **Propuesta:** cuando la biblioteca crezca, una RPC de conteos y búsqueda paginada.
- **Prioridad:** Baja. **No bloquea.**

---

## Sesión

### BT-17 · Peso planificado en las rutinas · ✅ resuelto (2026-10-03)
- **Aplicado por backend:** `template_exercises.planned_weight_kg numeric(6,2) NULL`, `>= 0`.
- **En la app:** el kg inicial de cada serie sale, en este orden, de: 1) la serie anterior de la sesión, 2) el último peso usado en ese ejercicio, 3) `planned_weight_kg`, 4) vacío. Se copia a `workout_session_exercises.planned_weight_kg` y se conserva al editar una rutina.
- **Pendiente de diseño:** no hay UI para editar el peso planificado (no está en el diseño).

### BT-18 · Volumen y récords de sesión · ✅ resuelto (2026-10-03)
- **Confirmado por backend:**
  - el trigger calcula `volume_kg` al completar la sesión (sin contar calentamiento);
  - `detect_session_prs` devuelve los tipos `max_weight`, `weight_reps`, `max_reps`, `duration` y `distance`.
- **En la app:** el Resumen lee `volume_kg` de la respuesta y, si es NULL (sin pesos), muestra "—" (nunca kcal estimadas). La hoja de récords formatea los cinco tipos y registra `value_duration_sec` / `value_distance_m`.
- **Nota:** si se completa una sesión con series pendientes en la cola local, el volumen se recalcula cuando llegan las series; el Resumen muestra el valor al abrirlo.

---

### BT-19 · Sesiones guardadas antiguas · ✅ resuelto (2026-10-03)
- **Aplicado por backend:** `workout_sessions.cancel_reason` (`'user'` | `'expired'`, NULL permitido) y un job que pasa las sesiones `saved` con más de 14 días a `canceled` con `cancel_reason = 'expired'`.
- **En la app:** "Salir sin guardar" escribe `canceled` + `'user'`. Una sesión `in_progress` de otro día sin series se cancela con `'expired'`; si tiene series pasa a `saved`.

### BT-20 · Descanso real entre series · ✅ resuelto (2026-10-03)
- **Aplicado por backend:** `workout_session_sets.rest_actual_sec integer NULL`, `>= 0`.
- **En la app:** guarda el descanso real **antes** de cada serie (desde que empezó el descanso hasta que terminó o se saltó, sin pausas y con el +30 s). Se escribe en el mismo upsert del check; la primera serie de la sesión lleva NULL.

### BT-21 · Estructurar `recommended_sets_reps`
- **Qué falta:** `exercises.recommended_sets_reps` es un JSON por objetivo con valores de texto libre (`{"hypertrophy":"3x12-15"}`). 444 valores no siguen "N x M": `"2x15 each direction"`, `"2x30 sec each side"`, `"2x20m"`, `"3x max"`, `"3x12 each"`, `"3x40m"`, y filas con las claves `sets` y `reps` por separado.
- **Hoy la app:** lo lee con un parser tolerante (`parseSetsReps`) que devuelve `{sets, min, max, unit: reps | sec | m | max, perSide}` y, si no puede leer un valor, el texto original. Se usa en el Detalle de ejercicio, en el Detalle de rutina y en la Sesión (para filas de rutina sin reps ni tiempo).
- **Propuesta (sin aplicar):** una columna nueva, p. ej. `exercises.recommended_scheme jsonb`, con una lista `[{goal, sets, reps_min, reps_max, unit, per_side}]` (`goal`: strength | hypertrophy | endurance; `unit`: reps | sec | m | max), rellenada migrando los textos actuales y manteniendo la columna original hasta validar.
- **Sobre las series:** `workout_session_sets` ya tiene `duration_sec` y `distance_m`: la app los usa para las series en segundos y en metros. No hace falta nada nuevo.
- **Prioridad:** Media. **No bloquea.**

### BT-22 · Contador de descartes de la tarjeta de Core 33
- **Qué falta:** `profiles.core33_invite_dismiss_count int NOT NULL DEFAULT 0`.
- **Por qué:** con solo `core33_invite_dismissed_at` la app no sabe cuántas veces se descartó la tarjeta, así que quedó sin el tope de dos descartes (D-54): vuelve cada 14 días hasta que el usuario actúe.
- **Qué hará la app cuando exista:** incrementarlo en cada "Ahora no", ocultar la tarjeta definitivamente al llegar a 2 y reiniciarlo al completar otro Core 33 (un descarte anterior al día 33 del último reto terminado deja de contar, como hoy). La regla de 14 días no cambia.
- **Prioridad:** Baja. **No bloquea.**

### BT-23 · Agregados de entrenos para Progreso
- **Qué falta:** el Resumen de Progreso descarga todas las sesiones completadas desde el 1 de enero (o 120 días atrás) y las agrega en el dispositivo: minutos activos por día (`ended_at − started_at − paused_total_sec`, la misma regla que el anillo de Inicio) y volumen medio por sesión y mes (`volume_kg`).
- **Propuesta:** (a) una columna generada `workout_sessions.active_seconds` con esa regla, para que la app y el servidor coincidan; (b) una vista o RPC `get_progress_summary(_from date)` que devuelva por día: sesiones, `active_seconds` y, por mes, el promedio de `volume_kg` (sin contar NULL).
- **Prioridad:** Baja (rendimiento y coherencia). **No bloquea.**

### BT-24 · Progreso de logros desde el servidor
- **Qué falta:** la app mide el avance hacia los logros con lo que tiene: racha de entrenos, días de Core 33 y 30 días de hidratación. Por eso una racha de hidratación mayor a 30 días se corta, y `quiz_master`, `first_custom_workout` y los logros de una sola vez (`first_*`) no muestran progreso.
- **Propuesta:** una RPC `get_badge_progress()` que devuelva por badge `{badge_id, current, target}` para el usuario (rachas completas, quizzes perfectos, rutinas propias), y una categoría por badge (`constancia | retos | fuerza | habitos`) en `badges` para que la app no la mantenga a mano.
- **Prioridad:** Media. **No bloquea.**

### BT-25 · Varias conversaciones con ELLIE
- **Qué falta:** `chat_messages` guarda un único hilo por usuario (`user_id, role, content, created_at`). "Nueva conversación" solo puede borrar el hilo entero (`clearEllieChatHistory`); no hay lista de conversaciones ni títulos.
- **Propuesta:** tabla `ellie_conversations (id, user_id, title, created_at, updated_at)` y `chat_messages.conversation_id` (nullable para el hilo antiguo, que pasaría a ser la conversación inicial). La función `ellie-chat` no cambia: la app sigue enviando los mensajes de la conversación activa.
- **Prioridad:** Media. **No bloquea** (el diseño no tiene lista de conversaciones).

### BT-26 · Límite de uso de ELLIE visible
- **Qué falta:** la app no conoce la cuota de mensajes: solo ve el status HTTP (429/402 se leen como "límite alcanzado") y un `{error}` de texto. No puede avisar "te quedan N mensajes" ni cuándo se renueva.
- **Propuesta:** que `ellie-chat` devuelva `X-RateLimit-Remaining` y `X-RateLimit-Reset` (y en el 429 un cuerpo `{error, code:'rate_limit', resetAt}`), o una RPC `get_ellie_usage()`.
- **Prioridad:** Media. **No bloquea.**

### BT-27 · Streaming real de la respuesta
- **Qué falta:** React Native lee la respuesta completa (`response.text()`); no hay texto que aparezca mientras ELLIE escribe, solo el indicador de "escribiendo".
- **Propuesta:** exponer la respuesta SSE de forma que se pueda leer por trozos (o aceptar `react-native-sse`/`expo/fetch`), sin cambiar el servidor.
- **Prioridad:** Baja.

### BT-28 · Tarjeta de recomendación y propuesta proactiva
- **Qué falta:** la función solo devuelve `generate_workout_plan`, `generate_nutrition_plan` o texto. El diseño muestra además una tarjeta de recomendación (p. ej. "Movilidad de cadera") y, en la portada, una propuesta proactiva con respuesta "Sí, ajústalo / Mejor completo".
- **Propuesta:** una herramienta `recommend_content` (`{title, subtitle, kind, target}`) y un endpoint o campo en el contexto que devuelva la propuesta del día con sus dos respuestas.
- **Prioridad:** Baja.

### BT-29 · Artículos para "Para leer con ELLIE"
- **Qué falta:** no existe fuente de artículos (título, categoría, minutos, imagen). La portada usa tres temas fijos que abren el chat con una pregunta.
- **Propuesta:** tabla `ellie_reads (id, title, category, minutes, image_url, prompt, active)`.
- **Prioridad:** Baja.

### BT-30 · Eliminar cuenta (requisito de Apple)
- **Qué falta:** no existe ningún flujo de borrado de cuenta en el backend (ni función, ni RPC). La app tiene la UI (Ajustes → Cuenta → "Eliminar cuenta", con doble confirmación), pero la acción final solo avisa de que aún no está disponible. Apple (App Store 5.1.1(v)) lo exige para apps con creación de cuenta.
- **Propuesta:** una Edge Function `delete-account` (con service role, autenticada por el JWT del usuario) que borre: la foto de `profile-photos/<user_id>/avatar`, las filas del usuario en todas las tablas (o `ON DELETE CASCADE` desde `profiles`) y por último `auth.users`. La app solo llamaría a la función y cerraría sesión. Conviene devolver `{ok:true}` y que sea idempotente.
- **Prioridad:** Alta (bloquea la revisión de App Store). **No bloquea el QA.**

### BT-31 · Preferencias de notificaciones en el servidor
- **Qué falta:** los tres interruptores de Ajustes (entreno, hidratación, novedades de ELLIE) se guardan solo en el teléfono (AsyncStorage) y no programan ni cancelan nada: no hay push ni recordatorios locales.
- **Propuesta:** columna `profiles.notification_prefs jsonb` (`{workouts, hydration, updates}`) y, cuando exista el envío, que lea esa preferencia (push) o que la app programe recordatorios locales a partir de `training_days_per_week`.
- **Prioridad:** Media. **No bloquea.**

---

## Historial
- 2026-10-02: documento creado con BT-01 a BT-11.
- 2026-10-03: BT-12 a BT-16 (módulo Entrenos).
- 2026-10-03: BT-17 a BT-20 (módulo Sesión).
- 2026-10-03: BT-18 resuelto.
- 2026-10-03: lote de backend aplicado: BT-03, BT-12, BT-15, BT-17, BT-19 y BT-20 resueltos; BT-21 nuevo (estructurar `recommended_sets_reps`).
- 2026-10-03: BT-22 (contador de descartes de la tarjeta de Core 33).
- 2026-10-03: BT-23 y BT-24 (módulo Progreso).
- 2026-10-04: BT-25 a BT-29 (módulo ELLIE).
- 2026-10-04: BT-30 y BT-31 (módulo Perfil y Ajustes).
