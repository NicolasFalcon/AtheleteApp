# ATHELETE · Resumen del backend

**Última actualización:** 1 de octubre de 2026 (19:20 UTC)
**Para:** equipo de la app móvil (React Native).
**Alcance:** base de datos, RLS, funciones SQL, almacenamiento y edge functions. Todos los cambios son aditivos: no se renombró ni borró nada que use la app actual.

---

## 1. Tablas y columnas nuevas

### Gamificación
- `gamification_event_types`: catálogo de eventos (ver sección 7). Columnas: `event_type`, `points`, `points_source`, `allowed_badges`, `server_badges`, `requires_reference`, `reference_kind`, `daily_limit`, `once_per`, `is_active`.
- `gamification_event_aliases`: traduce formatos viejos de eventos a los nuevos.
- `gamification_config`: una sola fila con el modo de validación (`log` hoy, `strict` después).
- `gamification_events`: UNIQUE completa en (`user_id`, `event_type`, `reference_id`). Las referencias vacías pueden repetirse.
- `badges`: nuevos `first_pr`, `nutrition_activated`, `hydration_3_days`, `hydration_7_days`, `weekly_hydration_master`. `nutrition_started` se mantiene como alias antiguo.

### Perfil
- `profiles.avatar_key`, `profiles.gender`, `profiles.profile_photo_url` (opcionales).
- `profiles.training_level`: `beginner`, `intermediate` o `advanced`.
- `profiles.preferred_session_minutes`: de 5 a 240.
- `profiles.goal` acepta: `lose_weight`, `gain_muscle`, `maintain`, `improve_health`, `performance`.
- `profiles` sigue siendo privada: cada usuario solo lee su propia fila. Los datos públicos de otros se obtienen por RPC.
- Cuentas nuevas: se crea la fila de perfil al registrarse con `onboarding_completed = false`. La verificación de correo está desactivada.

### Series por ejercicio
- `workout_session_exercises`: única por (`session_id`, `position`).
- `workout_session_sets`: única por (`session_id`, `exercise_position`, `set_index`).
- `workout_sessions`: `paused_at`, `paused_total_sec`, `volume_kg`. El volumen lo calcula el servidor al completar (sin contar calentamiento); sin series queda vacío, nunca 0.
- `personal_records`: `source` (`manual` o `session`), `workout_session_id`, `session_set_id`. Única por (`user_id`, `session_set_id`).

### Comunidad
- **Amistad e identidad:** `social_settings` (con `username` y privacidad por categoría), `friend_requests`, `friendships`, `friend_invites`, `user_blocks`.
- **Publicaciones:** `social_posts`, `social_post_likes`, `social_post_comments`, `social_activity` (se borra a los 30 días).
- **Retos:** `social_challenges`, `social_challenge_participants`, `social_challenge_contributions`.
- **Notificaciones y moderación:** `social_notifications`, `content_reports`, `app_moderators`, `moderation_actions`, vista `moderation_queue` (solo devuelve filas a moderadores).
- `workout_templates`: `copied_from_post_id`, `copied_from_user_id`. (`created_by`, `copied_from_post_id`) no se repite.

**Qué se genera solo (sin RPC de la app)** — confirmado con backend el 7 de octubre de 2026:
- **No hay posts automáticos.** La única forma de publicar es `create_post`, que llama el usuario; el `INSERT` directo en `social_posts` está bloqueado y ningún trigger crea publicaciones.
- **`social_activity`** (líneas breves de actividad, se borran a los 30 días; alimentan `get_friend_activity`) se escribe sola cuando el usuario:
  - completa una sesión de entrenamiento,
  - registra un récord,
  - consigue un logro,
  - completa Core 33.
- **`social_challenge_contributions`** (aportes a retos) se escribe sola cuando:
  - se completa una sesión, según la métrica del reto (sesiones, minutos, volumen…),
  - se completa un día de Core 33 con sus 3 hábitos,
  - el usuario llama a `add_manual_contribution` (solo retos oficiales).
- Revertir una sesión completada no deshace los aportes de un reto ya completado (ver §8.3).

### Almacenamiento
- `profile-photos` (privado). Ruta `{userId}/avatar`. Mostrar con URL firmada.
- `social-photos` (privado, 5 MB). Ruta `{autor}/{post_id}/archivo`. Mostrar con URL firmada. La limpieza diaria borra también las fotos huérfanas (sin post) de más de 24 h.

### Tareas programadas
- `social-maintenance-hourly` (minuto 7 de cada hora): cierra y caduca retos, limpia actividad antigua.
- `social-photos-cleanup-daily` (03:17 UTC): ver sección 6.

---

## 2. RPC (todas requieren sesión)

### Gamificación
- `award_gamification_event(_event_type, _points, _reference_id, _badge_ids, _metadata)` → `{awarded, event_id, points_added, total_points, new_badges, reason}`.
  - `reason`: `duplicate` si ya se otorgó; en modo `strict` también `unknown_event_type`, `invalid_reference`, `daily_limit`, etc.

### Series
- `detect_session_prs(_session_id)` → lista de `{session_set_id, exercise_id, pr_type, value_weight, value_reps, previous_*}`. No guarda nada. Para guardar: `INSERT INTO personal_records … ON CONFLICT (user_id, session_set_id) DO NOTHING`.

### Identidad y amistad
- `ensure_social_settings(_username)` → `{created, username}` o `{error: invalid_username | username_taken}`.
- `set_username(_username)` → `{ok, username}` o `{error}`.
- `find_user_by_username(_username)` → `{user_id, username, name, avatar_key, accepts_requests, relationship}` o `null` (no existe o hay bloqueo).
- `get_social_profiles(_user_ids uuid[])` → filas `id, username, name, avatar_key, profile_photo_url, goal, weight` (`weight` solo si se comparte).
- `get_social_profile(_user_id)` → `relationship`, `streak_days`, `hidden_categories` y, según privacidad y relación, `friends_since`, `sessions_total`, `badges_total`, `records`, `weight`, `recent_posts`.
- `send_friend_request(_target)` → `status`: `sent | pending | accepted | already_friends | not_accepting | unavailable | invalid`.
- `respond_friend_request(_request_id, _accept)` → `{status}` (`accepted`, `declined`, `not_found`).
- `cancel_friend_request(_request_id)` → `{status}`.
- `create_friend_invite()` → `{ok, invite_id, token, expires_at}` (máximo 5 activos).
- `redeem_friend_invite(_token)` → `{status: friends | already_friends | invalid_or_used, friend_id}`.
- `remove_friend(_friend uuid)` → `{ok, removed}`. Elimina la amistad (la app la usa en lugar de un `DELETE` directo en `friendships`).
- `block_user(_target)` → `{ok}`. Desbloquear: `DELETE` en `user_blocks`.

### Publicaciones
- `create_post(_type, _source_id, _body, _photo_path, _photo_width, _photo_height)` → `{ok, created, post_id}` o `{error}`.
  - Tipo `workout`: el `attachment` trae `volume_kg` (`null` sin series), `prs_count` y `top_pr` `{exercise, exercise_id, pr_type, value_weight, value_reps, unit}` (`null` sin récords). Los posts anteriores no tienen estas claves. Publicar de nuevo la misma sesión devuelve el mismo `post_id`.
  - `_source_id`: id de sesión, récord o rutina; `badge_id`; `core33:<participation_id>`; o id de reto.
- `get_feed(_limit, _before)` → posts con datos del autor y `liked_by_me`.
- `get_friend_activity(_limit)` → actividad de amigos.
- `delete_comment(_comment_id)` → `{ok}`.
- `save_shared_routine(_post_id)` → `{ok, created, template_id}`.
- **Directo con RLS (sin RPC):**
  - Me gusta: `INSERT … ON CONFLICT (post_id, user_id) DO NOTHING` / `DELETE`.
  - Comentar: `INSERT`.
  - Editar o borrar mi post: `UPDATE` de `body` o `deleted_at`.
  - Reportar: `INSERT … ON CONFLICT DO NOTHING`.
  - Notificación leída: `UPDATE` de `read_at`.

### Retos
- `create_friend_challenge(_metric, _goal, _duration_days, _invitee_ids)` → `{ok, challenge_id, title}` o `{error}`.
- `respond_challenge_invite(_challenge_id, _accept)` → `{ok, status}` (al aceptar, el reto pasa a `active`).
- `join_official_challenge(_challenge_id)`, `leave_challenge(_challenge_id)`, `cancel_friend_challenge(_challenge_id)`, `mark_challenge_celebrated(_challenge_id)` → `{ok, …}`.
- `add_manual_contribution(_challenge_id, _amount)` → `{ok, progress}` o `{error: amount_out_of_range | daily_limit | not_allowed}`.
- `get_challenge_board(_challenge_id)` → `{challenge, participants_total, board}` (ranking solo con el usuario y sus amigos).
- `get_my_challenges()` → `{active, invitations, recently_completed, official}`.

### Moderación (panel interno, no para la app)
- `is_moderator()`, `set_moderator(_user_id, _role | null)`, `moderate_content(_target_type, _target_id, restore | remove | dismiss, _note)`.

---

## 3. Qué debe cambiar la app móvil

1. **Eventos de puntos** (ver catálogo en sección 7):
   - Récord: `personal_record_created` con el id del récord.
   - Plan de nutrición: `nutrition_activated` con el id del plan.
   - Registro de nutrición (nuevo): `nutrition_logged` con `YYYY-MM-DD`.
   - Racha Core 33: `core33_streak_7` con el `participation_id` (el formato viejo `…:streak_7` se acepta como alias).
   - Quiz Master: `quiz_master_unlocked` sin referencia (la referencia vieja `quiz_master` se acepta como alias).
   - Hidratación (nuevo): `hydration_logged` con `YYYY-MM-DD`; el servidor decide los logros.
   - Día Core 33: `core33_day_completed` con `participation_id:YYYY-MM-DD`.
   - Quiz: los puntos de `quiz_completed` salen del intento guardado en `quiz_attempts`.
2. **Usar solo `award_gamification_event`:** no escribir `profiles.points` ni insertar en `user_badges`. Usar `total_points` y `new_badges` de la respuesta.
3. **Onboarding:** guardar `training_level`, `preferred_session_minutes` y aceptar el objetivo `performance`. `gender` es opcional.
4. **ELLIE:** agregar el objetivo "Rendimiento" (`performance`).
5. **Series:**
   - Al empezar, crear `workout_session_exercises` con lo planificado.
   - Cada serie: `INSERT … ON CONFLICT (session_id, exercise_position, set_index) DO UPDATE`.
   - Seguir escribiendo `completed_exercises`.
   - Pausa acumulada en `paused_total_sec`. "Guardar para después": `status = 'saved'`.
   - Al cerrar, llamar `detect_session_prs`.
6. **Comunidad:**
   - Todo lo sensible por las RPC de la sección 2.
   - Fotos: quitar EXIF, aceptar solo JPG/PNG/WebP en la app, subir a `{uid}/{post_id}/…` con un `post_id` generado en la app y pasarlo al publicar. Mostrar con URL firmada.
   - La actividad (`social_activity`) y los aportes a retos se generan solos al completar sesiones, récords, logros y Core 33. **No hay posts automáticos**: solo `create_post` publica.
7. **Fotos de perfil:** si la URL firmada falla (por ejemplo, bloqueo), mostrar `avatar_key` o el avatar por defecto.

---

## 4. Pruebas ejecutadas

Todas se ejecutaron en bloques que forzaban una excepción al final para deshacer los cambios; no quedó nada guardado.

- **Corrección BK-01 (ON CONFLICT):** duplicado rechazado, referencias vacías repetibles, puntos y badges correctos.
- **Gamificación, 2 rondas:** todo se otorga en modo log y `strict_would` indica qué haría strict. Los alias no consumen el límite diario del evento original. Quiz: el servidor calculó 40 puntos frente a 30 enviados por la app. Duplicado → `reason: "duplicate"`.
- **Series:**
  - Ejercicio y serie insertados dos veces → 1 fila cada uno; la serie se actualiza.
  - Récord insertado dos veces → 1 fila.
  - `detect_session_prs` devuelve los récords nuevos y deja de devolver el ya registrado.
  - Volumen 6000 kg sin la serie de calentamiento.
  - Serie de otro usuario → bloqueada.
- **Comunidad** (A, su amigo B, extraño C, D bloqueado por A):
  - Configuración social ×2 → la segunda `created: false`.
  - Solicitud ×2 → `pending` con el mismo id. Aceptar ×2 → la segunda `not_found`.
  - Invitación por enlace ×2 → segundo uso `invalid_or_used`.
  - Bloqueo ×2, me gusta ×2 (contador 1, 1 notificación), reporte ×2, post ×2 (mismo `post_id`), rutina guardada ×2 (misma copia), moderador ×2, reto oficial ×2, unirse ×2 → sin duplicados.
  - B ve post y actividad de A, no su perfil privado. C no ve post ni actividad ni puede dar me gusta; en el perfil solo ve nombre, objetivo y racha. D no ve nada de A y su solicitud devuelve `unavailable`.
  - Insertar un post directamente en la tabla → bloqueado. Post de foto sin foto → rechazado.
  - Cola de moderación: 1 fila al moderador, 0 al resto.
  - Reto oficial: se completa con un entreno, recompensa una sola vez, rechaza aporte manual de 101.
  - Reto entre amigos: rechaza invitar a un extraño y la métrica `exercise_reps`; al aceptar queda `active` con fecha de fin y el ranking muestra 2 personas.
- **Limpieza de fotos:** revisión completa del historial sin fotos que borrar. Tras añadir la protección, llamadas sin clave o con clave incorrecta → `401 unauthorized`.

---

## 5. Cambios del 1 de octubre de 2026

### Política de `profile-photos` (opción b)
Se reemplazó la lectura "cualquier usuario con sesión" por la función `can_view_profile_photo`. Puede ver la foto de una persona:
- ella misma;
- sus amigos;
- quien tiene una solicitud de amistad pendiente con ella (en cualquier sentido);
- quien puede ver alguna de sus publicaciones o comentarios vigentes (no borrados, ocultos ni retirados).

Nunca si hay bloqueo entre ambos. Subir, actualizar y borrar siguen limitados al dueño.

### Limpieza de fotos de publicaciones (edge function `social-photos-cleanup`)
- **Horario:** una vez al día, 03:17 UTC.
- **Post borrado por su autor:** la foto se elimina en la siguiente ejecución (máximo un día). Mientras tanto ya nadie puede verla.
- **Post retirado por moderación:** la foto se conserva 30 días por si se restaura, después se elimina.
- No modifica publicaciones; solo borra archivos. Es repetible sin efectos.
- **Protección:** exige el encabezado `x-cleanup-token`. El valor es una clave aleatoria guardada en el almacén de secretos de la base de datos; solo la tarea programada la lee. Sin la clave correcta responde `401`.

### Moderador
- `nicolas.falcon0@gmail.com` dado de alta como moderador `admin`.

---

## 6. Gamificación

### Modo actual: `log`
Todo se otorga como antes. Cada evento guarda en `metadata.validation` lo que haría el modo strict (`strict_would`). Los eventos no catalogados se otorgan y se marcan `unknown_event_type`. El catálogo se edita sin tocar la función.

**Badges del servidor en cada llamada:** los badges de la columna "Badges del servidor" (hoy los de hidratación) se evalúan en cada llamada, aunque la respuesta sea `duplicate`. En ese caso no se suman puntos, pero `new_badges` trae los logros recién cumplidos. Así la app puede enviar `hydration_logged` con la fecha del día en cada vaso y el logro llega al cumplir la meta.

### Catálogo de eventos activos

| Evento | Puntos | Origen de puntos | Badges permitidos | Badges del servidor | Referencia esperada | Límite diario | once_per |
|---|---|---|---|---|---|---|---|
| `workout_completed` | 50 | fijo | first_workout, week_consistency | — | id de `workout_sessions` | 3 | reference |
| `custom_workout_created` | 150 | fijo | first_custom_workout | — | id de `workout_templates` | 5 | reference |
| `personal_record_created` | 25 | fijo | first_pr | — | id de `personal_records` | 10 | reference |
| `nutrition_activated` | 40 | fijo | nutrition_started | — | id de `nutrition_plans` | 3 | reference |
| `nutrition_logged` | 10 | fijo | — | — | fecha `YYYY-MM-DD` | 1 | reference |
| `hydration_logged` | 0 | fijo | hydration_3_days, hydration_7_days, weekly_hydration_master | los mismos (los decide el servidor) | fecha `YYYY-MM-DD` | — | reference |
| `quiz_completed` | desde el intento | `quiz_attempts` | first_quiz | — | id de `quiz_attempts` | 10 | reference |
| `quiz_master_unlocked` | 0 | fijo | quiz_master | — | sin referencia | — | user |
| `core33_day_completed` | 20 | fijo | — | — | `participation_id:YYYY-MM-DD` | 1 | reference |
| `core33_streak_7` | 0 | fijo | streak_7_days | — | `participation_id` | — | reference |
| `core33_completed` | 500 | fijo | core33_finisher | — | `participation_id` | 1 | reference |
| `social_challenge_completed` | 0 | fijo | — | — | id del reto (uso interno del servidor) | — | reference |

**Desactivados (no se borran):** `workout_canceled`, `pr_recorded`, `nutrition_plan_activated`, `hydration_goal_met`.

### Alias activos
| Llega como | Condición en la referencia | Se registra como | Transformación |
|---|---|---|---|
| `core33_day_completed` | termina en `:streak_7` | `core33_streak_7` | se queda con lo anterior a `:` |
| `quiz_completed` | es exactamente `quiz_master` | `quiz_master_unlocked` | referencia vacía |

### Cómo activar el modo strict
1. Revisar en `gamification_events` los registros con `metadata->'validation'->>'strict_would'` distinto de aceptado y ajustar el catálogo si hace falta.
2. Ejecutar: `UPDATE gamification_config SET mode = 'strict';`
3. Volver atrás si es necesario: `UPDATE gamification_config SET mode = 'log';`

En strict: se ignoran los puntos enviados por la app, se rechazan eventos desconocidos, referencias que no existen o no pertenecen al usuario, y se aplican límites diarios y `once_per`.

---

## 7. Pendientes y responsables

| Pendiente | Responsable | Cuándo |
|---|---|---|
| Restringir tipos de archivo (JPG, PNG, WebP) en `social-photos` y `profile-photos`, y límite de 5 MB en `profile-photos`, desde Cloud → Storage | Nicolás (manual) | Cuanto antes; mientras tanto la app valida el tipo |
| Activar modo `strict` | Backend, con aviso de Nicolás | Cuando la app móvil use los nombres nuevos |
| Cerrar el `UPDATE` directo de `profiles.points` y el `INSERT` directo en `user_badges` | Backend, con aviso de Nicolás | Cuando web y móvil usen solo `award_gamification_event` |
| Decidir si las repeticiones cuentan en retos entre amigos (métrica `exercise_reps` hoy bloqueada) | Producto | Sin fecha |

## 8. Conflictos y adaptaciones respecto al documento social
1. **`workout_templates.source`:** la app móvil crea las rutinas propias con `custom` (la web las deja vacías). Para compartir se aceptan ambas (probado: una rutina `custom` se publicó correctamente). Las copias guardadas desde un post usan `shared`.
2. **Vista `social_profiles`:** reemplazada por la RPC `get_social_profiles` para no exponer una vista con permisos elevados.
3. **Revertir una sesión completada** no deshace un reto ya completado ni su recompensa.
4. **Avisos de seguridad:** 39 avisos del tipo "función con permisos elevados ejecutable por usuarios con sesión" (incluida `can_view_profile_photo`, que necesita la política de fotos). Son intencionales. Hay además un aviso previo de extensión en el esquema público.

---

## 7. Lote del 3 de octubre de 2026

### Tablas y columnas nuevas
- **`user_favorites`** (`user_id uuid`, `item_type 'routine' | 'exercise'`, `item_id uuid`, `created_at`). PK (`user_id`, `item_type`, `item_id`). RLS: select, insert y delete solo los propios; no hay update.
- **`template_exercises.planned_weight_kg`** `numeric(6,2)` NULL, `>= 0`.
- **`workout_session_sets.rest_actual_sec`** `integer` NULL, `>= 0`: descanso real antes de esa serie.
- **`workout_sessions.cancel_reason`** `text` NULL, solo `'user'` o `'expired'`.
- **`profiles.core33_completed_at`**, **`core33_intro_seen_at`**, **`core33_invite_dismissed_at`** (`timestamptz` NULL).
- **`workout_templates.routine_category`** `text` NULL: `fuerza | cuerpo_completo | tren_superior | tren_inferior | core | movilidad | acondicionamiento | hiit | cardio`. La calcula el servidor; la app nunca la escribe.

### Tarea programada
- Las sesiones `saved` con más de 14 días pasan a `canceled` con `cancel_reason = 'expired'`.

### Qué hace la app con esto
- Favoritos: `user_favorites` es la fuente de verdad; los favoritos locales se suben una vez y se borran.
- Peso inicial de cada serie: serie anterior → último peso usado → `planned_weight_kg` → vacío.
- `rest_actual_sec` se escribe en el mismo upsert de la serie; la primera serie de la sesión lleva NULL.
- "Salir sin guardar": `canceled` + `'user'`. `in_progress` de otro día sin series: `canceled` + `'expired'`; con series: `saved`.
- Core 33 "Ahora no": `core33_invite_dismissed_at`. `core33_intro_seen_at` y `core33_completed_at` quedan para el módulo Core 33.
- Tarjetas y listas de rutinas por tipo: las 9 `routine_category` se agrupan en las 5 tarjetas del diseño (NULL → solo en "Todas").
- Series y reps: `exercises.recommended_sets_reps` se lee con un parser tolerante (ver BT-21 en `BACKEND_TODO.md`).

## 8. Lote del 4 de octubre de 2026

### Tablas, columnas y funciones nuevas
- **`profiles.core33_invite_dismiss_count`** `integer NOT NULL DEFAULT 0`, `>= 0`: veces que se descartó la tarjeta de Core 33 de Inicio.
- **`profiles.notification_prefs`** `jsonb NOT NULL`, por defecto `{"workouts": true, "hydration": true, "updates": false}`.
- **`badges.category`** `text` NULL: `constancia | retos | fuerza | habitos`.
- **RPC `get_progress_summary(_from date, _tz text)`**: por día `{date, sessions, active_seconds}` y por mes `{month, avg_volume_kg, sessions}` de las sesiones completadas del usuario (la columna de fin es `workout_sessions.ended_at`).
- **RPC `get_badge_progress()`**: por badge `current`, `target`, `earned` y `category`.
- **Edge Function `delete-account`**: POST sin body con el JWT del propio usuario; borra sus datos y fotos y, al final, el usuario de auth. Idempotente. Respuestas: 200 `{ok:true}`, 409 `last_admin`, 401, 500 `{ok:false, step}`.

### Qué hace la app con esto
- Core 33 "Ahora no": suma 1 al contador y actualiza la fecha; con 2 descartes la tarjeta no vuelve (la regla de 14 días se mantiene).
- Ajustes: los 3 interruptores leen y escriben `notification_prefs`.
- Progreso · Resumen: usa `get_progress_summary` con la zona horaria del dispositivo.
- Logros y vitrina del Perfil: usan `get_badge_progress` (13 logros, incluye `nutrition_activated`).
- Eliminar cuenta: llama a `delete-account` y, con 200, limpia lo local y cierra sesión.

### Meta de agua (BT-34, 4 de octubre de 2026)
- Las medallas de hidratación del servidor y `get_badge_progress` usan como meta **`profiles.daily_water_goal × 250 ml`** (por defecto 14 vasos = 3.500 ml), comparada con `daily_hydration_logs.water_ml`.
- `daily_water_goal` sigue siendo un número de **vasos de 250 ml** (no hay columna en ml).
- La app (Nutrición, Inicio, Progreso y ELLIE) calcula la misma meta con `GLASS_ML` y `DEFAULT_WATER_GOAL_GLASSES`. Pendiente de producto: valor por defecto 14 u 10 vasos (DP-01 en `BACKEND_TODO.md`).

