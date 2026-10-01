# Comunidad · Propuesta de esquema (tablas, RLS y almacenamiento)

Estado: **revisada por producto (2026-09-30)**. Las 16 preguntas están decididas (§12) y aplicadas en todo el documento. No hay migraciones ni código; nada de esto está creado en Supabase.
Fecha: 2026-09-30 · Rama: `feature-migration` · Decisión previa que lo pide: MIGRATION_PROGRESS §1, decisión 7 ("antes de cualquier UI, documento de esquema de tablas y RLS para aprobación").

Fuentes:
- Handoff v2 §11 (Social / Comunidad), §5 (Social Post, Shared Routine, Friend Row, Session Pause Layer, Rest Timer) y §7 (inventario COMUNIDAD y WORKOUT SESSION).
- `Social.dc.html` (pantallas SOCIAL_01 a SOCIAL_14) y `Session.dc.html` (sesión, pausa y descanso), con los datos de ejemplo de su lógica.
- El repo: `src/types/supabase.ts`, `src/services/supabase/*`, `src/hooks/usePersonalRecords.ts` y `src/shared/domain/*`.

La definición SQL de las tablas actuales, sus políticas RLS y la función `award_gamification_event` **no están en este repo**. Lo que aquí se dice de ellas sale del código cliente y se marca como **[verificar en backend]** cuando es una suposición.

---

## 0. Resumen

- **14 tablas nuevas:**
  - privacidad e identidad: `social_settings` (incluye el nombre de usuario);
  - amistad: `friend_requests`, `friendships`, `friend_invites` (enlace de invitación);
  - publicaciones: `social_posts`, `social_post_likes`, `social_post_comments`;
  - actividad breve: `social_activity`;
  - retos: `social_challenges`, `social_challenge_participants`, `social_challenge_contributions`;
  - notificaciones: `social_notifications` (solo dentro de la app);
  - moderación: `user_blocks`, `content_reports` (requisito de App Store para contenido de usuarios).
- **Cambios en tablas existentes:** 2 columnas en `workout_templates` para las copias de rutinas compartidas, y una política de lectura nueva en el bucket `profile-photos`.
- **Un bucket privado nuevo**, `social-photos`.
- **La autorización se centraliza en 4 funciones SQL** (`is_blocked`, `are_friends`, `can_see_category`, `can_view_post`) que reutilizan todas las políticas. Así la regla de visibilidad se escribe una sola vez.
- **Ninguna escritura sensible se hace directamente desde el cliente.** Aceptar amistad, publicar, guardar rutina, unirse a un reto y sumar progreso pasan por RPC `SECURITY DEFINER` o por triggers.
- **Prerrequisito, §13 · series por ejercicio:** las sesiones no guardan series, pesos ni repeticiones. Sin eso no hay volumen, ni retos de repeticiones automáticos, ni récords automáticos. Social v1 sale sin depender de ello (calorías en lugar de volumen; repeticiones solo manuales en el reto oficial).
- **Dependencias de backend:** BK-01 (puntos del reto oficial) y BK-02 (tipos).

---

## 1. Reglas del handoff que el esquema hace cumplir

| Regla (handoff §11 / §2) | Cómo la respeta el esquema |
|---|---|
| Sin Stories | El contenido publicado no caduca: `social_posts` no tiene `expires_at` (solo caducan las invitaciones, que no son contenido) |
| Sin Reels / vídeo | `social_posts` admite **una** foto (`photo_path`); el bucket solo acepta `image/jpeg`, `image/png` y `image/webp` |
| Sin filtros | No hay columnas de filtro ni de edición de imagen; la foto se guarda tal cual (solo redimensionada) |
| Sin hashtags | `body` es texto plano, sin tabla de etiquetas ni búsqueda por texto en posts |
| Métricas no editables | El adjunto se guarda como **instantánea** (`attachment jsonb`) que escribe el servidor; el cliente no puede modificarla (§4.5) |
| No puntos por likes ni comentarios | Ningún trigger de likes o comentarios llama a `award_gamification_event`. Solo el **reto oficial** da puntos (Q1, `CHECK` en §4.10) |
| No economía adicional | No hay saldo, monedas ni tienda; el reto oficial reutiliza los puntos existentes |
| Comparación solo entre amigos | Los rankings se calculan con una RPC que filtra a **yo + mis amigos**. El número total de participantes de un reto oficial es un agregado sin nombres |
| Comentarios planos, sin hilos | `social_post_comments` no tiene `parent_id` |
| Peso corporal apagado por defecto | `social_settings.share_body_weight boolean NOT NULL DEFAULT false` |
| "Actividad menor de amigos como línea, no como post" | Tabla aparte, `social_activity`, que nunca recibe likes ni comentarios |
| Contenido generado por usuarios (App Store 1.2) | Reportar contenido y bloquear usuarios desde el lanzamiento (§4.12) |

---

## 2. Lo que existe hoy (comprobado en el código)

| Tabla / objeto | Columnas relevantes (según `src/types/supabase.ts` o el uso en servicios) | Uso para Comunidad |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `name`, `avatar_key`, `profile_photo_url`, `goal`, `weight`, `birth_date`, `gender`… Además `points` (se lee en `profile-overview.ts` y `ellie.ts`, pero **no está en los tipos**, BK-02). **No tiene nombre de usuario** | Identidad social: nombre, avatar, objetivo. **No se abre a otros usuarios** porque tiene peso, fecha de nacimiento y metas de nutrición (§5.1) |
| `workout_sessions` | `id`, `user_id`, `workout_id` (→ `workout_templates`, nullable), `workout_title`, `status` (`in_progress`/`completed`/`canceled`), `completed`, `duration` (min), `calories_burned`, `completed_exercises` (**array de IDs, sin series ni pesos**), `total_exercises`, `date`, `started_at`, `ended_at` | Origen de "entreno completado", de los retos de entrenos y minutos y de la racha. Ver §13 |
| `workout_templates` | `id`, `created_by`, `title`, `type` (`strength`/`cardio`/`fullbody`/`mobility`/`hiit`), `difficulty`, `duration`, `image_url`, `is_public`, `source`, `created_by_ai`… | Rutinas compartidas y sus copias; el `type` clasifica las sesiones de fuerza y de movilidad |
| `template_exercises` | `template_id`, `exercise_id`, `name`, `sets`, `reps`, `duration`, `rest_time`, `sort_order`, `notes` | Lo que se copia al guardar una rutina; la prescripción de la sesión (§13) |
| `exercises` | `id`, `slug`, `name`, `thumbnail_url`… | Miniaturas de la rutina compartida; ejercicio de un reto de repeticiones |
| `personal_records` | `id`, `user_id`, `exercise_id`, `pr_type` (`max_weight`/`weight_reps`/`max_reps`/`duration`/`distance`), `value_*`, `unit`, `recorded_at` (**no está en los tipos**, BK-02). Se crean **a mano** desde "Registrar PR"; se pueden borrar | Post "Nuevo récord" y la línea de actividad |
| `user_badges` | `user_id`, `badge_id`, `earned_at` (no está en los tipos) | Post "Logro" y la línea de actividad |
| `challenge_participations` + `habit_logs` | Core 33: `status` (`active`/`completed`), `habits` json, `start_date`; `habit_logs(participation_id, date, habit_index, completed)` | Retos de "días con los 3 hábitos" y post "Core 33 completado". **No hay tabla `challenges`**: Core 33 no tiene catálogo en BD |
| RPC `award_gamification_event(_event_type, _reference_id, _points, _badge_ids, _metadata)` | Idempotente por evento y referencia (devuelve `already_processed`). **Falla con `42P10`** (BK-01): su `ON CONFLICT` no tiene una restricción única que lo respalde | Puntos y badge al completar el reto oficial |
| Bucket `profile-photos` | Privado; ruta `{userId}/avatar`; ≤ 3 MB; JPG/PNG/WebP; se lee con URL firmada de 1 h | Los amigos tienen que poder ver el avatar del otro (§7.3) |
| Notificaciones | **No hay tabla**: `useNotificationsOverview` deriva "nudges" de ELLIE en el cliente | Hace falta una tabla para las notificaciones sociales (§4.11) |

Consecuencias para el diseño:
1. **"Volumen" (kg) y "Repeticiones de un ejercicio"** (SOCIAL_13, SOCIAL_08, SOCIAL_11 tipo 4) no se pueden calcular con los datos actuales. En v1 se muestran calorías (Q7) y las repeticiones solo se registran a mano en el reto oficial (Q6). La solución completa está en §13.
2. **"Récord si lo hubo" al terminar un entreno**: la app no detecta récords durante la sesión. En v1 se enlaza un récord registrado a mano mientras duraba esa sesión; los récords automáticos llegan con §13.
3. **La racha y el número de sesiones del perfil de un amigo** se calculan hoy en el cliente leyendo **todas** las sesiones propias. Para un amigo hace falta un agregado en servidor (`get_social_profile`, §5.2), no abrir `workout_sessions`.

---

## 3. Convenciones

- Claves `uuid` (`gen_random_uuid()`); tiempos `timestamptz` en UTC; `created_at DEFAULT now()`.
- Todos los `user_id` / `*_id` de usuario referencian `auth.users(id) ON DELETE CASCADE`. Borrar la cuenta borra todo su contenido social.
- Enumeraciones como `text` + `CHECK`, no `enum` de Postgres. Así es más fácil añadir valores sin migraciones bloqueantes y se mantiene el estilo de las tablas actuales (`status text`).
- **Regla `ON CONFLICT`**: cada `INSERT … ON CONFLICT (cols)` de este documento se apoya en una `PRIMARY KEY` o `UNIQUE` **no parcial** sobre exactamente esas columnas. No se usa `ON CONFLICT` contra índices parciales ni de expresión, porque producen el mismo `42P10` si el `WHERE` no coincide. La tabla completa está en §9.
- RLS **activada en todas las tablas**. Las funciones `SECURITY DEFINER` llevan `SET search_path = public` y validan `auth.uid()` dentro.
- Contadores (`like_count`, `comment_count`) desnormalizados con triggers, para que el feed no haga `count(*)` por post.

---

## 4. Tablas

### 4.1 `social_settings` — identidad y privacidad social (SOCIAL_14)

Una fila por usuario. Se crea al entrar por primera vez en Comunidad, con la RPC `ensure_social_settings()` (`INSERT … ON CONFLICT (user_id) DO NOTHING`), que también pide elegir el nombre de usuario.

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | uuid **PK** → auth.users | |
| `username` | `citext` NOT NULL **UNIQUE** CHECK (`username ~ '^[a-z0-9_.]{3,24}$'`) | Q3: la búsqueda es **solo por nombre de usuario exacto**. `citext` hace que "Carlos" y "carlos" sean el mismo. Se elige o cambia con la RPC `set_username` (devuelve "ya está en uso" sin `ON CONFLICT`) |
| `audience` | text NOT NULL DEFAULT `'friends'` CHECK in (`friends`,`public`) | "Solo amigos" / "Público". Público = visible **solo en tu perfil** (Q2), nunca en un feed |
| `share_workouts` | boolean NOT NULL DEFAULT true | Entrenamientos |
| `share_records` | boolean NOT NULL DEFAULT true | Récords personales |
| `share_achievements` | boolean NOT NULL DEFAULT true | Logros (medallas y retos completados) |
| `share_photos` | boolean NOT NULL DEFAULT true | Fotos de las publicaciones |
| `share_routines` | boolean NOT NULL DEFAULT true | Rutinas (que los amigos puedan guardarlas) |
| `share_body_weight` | boolean NOT NULL DEFAULT **false** | Peso corporal: "nunca se muestra salvo que lo actives" |
| `allow_friend_requests` | boolean NOT NULL DEFAULT true | Q12: apagado = **nadie** puede enviarte solicitudes; tú sí puedes enviarlas y tus amistades actuales no cambian |
| `updated_at` | timestamptz | |

- Sin interruptor "Aparecer en búsquedas" (Q3): la búsqueda exacta por nombre de usuario ya obliga a conocerlo.
- La nutrición **no tiene interruptor**: nunca se comparte en v1 (Q14).
- Si un usuario aún no tiene fila, las funciones aplican **estos mismos valores por defecto** (`COALESCE`), así nunca se expone de más. Sin fila tampoco tiene `username`, así que no se le puede encontrar.

### 4.2 `friend_requests` — solicitudes (SOCIAL_05)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `sender_id` | uuid NOT NULL → auth.users | |
| `receiver_id` | uuid NOT NULL → auth.users | |
| `status` | text NOT NULL DEFAULT `'pending'` CHECK in (`pending`,`accepted`,`declined`,`cancelled`) | "Ignorar" = `declined` sin avisar al remitente |
| `created_at`, `responded_at` | timestamptz | |

Restricciones:
- `CHECK (sender_id <> receiver_id)`.
- **Una sola solicitud pendiente por pareja**, en cualquier dirección: índice único parcial `UNIQUE (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)) WHERE status = 'pending'`. Es una **protección**, no un destino de `ON CONFLICT`. La RPC comprueba antes de insertar y devuelve el estado actual.
- Índices: `(receiver_id, status, created_at DESC)` para "Solicitudes recibidas" y `(sender_id, status)` para "Enviadas".

Flujo, solo por RPC (sin `INSERT`/`UPDATE` directos):
- `send_friend_request(target)`:
  - rechaza si ya son amigos, si hay bloqueo en cualquier dirección o si hay una pendiente;
  - rechaza si `target.allow_friend_requests = false` (Q12). El remitente ve un mensaje neutro ("No acepta solicitudes ahora"), no que fue rechazado;
  - **si el otro ya me envió una pendiente, la acepta** en lugar de crear otra.
- `respond_friend_request(id, accept)`: solo el receptor; si acepta, crea la amistad.
- `cancel_friend_request(id)`: solo el remitente.
- Al apagar `allow_friend_requests`, las solicitudes **ya recibidas** siguen pendientes y se pueden aceptar (Q12: "amigos actuales no cambian"; aplicado también a lo que ya estaba en curso).

### 4.3 `friendships` — amistades

Una fila por pareja, guardada en orden canónico.

| Columna | Tipo | Notas |
|---|---|---|
| `user_low` | uuid NOT NULL → auth.users | el menor de los dos ids |
| `user_high` | uuid NOT NULL → auth.users | el mayor |
| `created_at` | timestamptz | "Amigos desde marzo" |
| `request_id` | uuid NULL → friend_requests ON DELETE SET NULL | trazabilidad |
| `invite_id` | uuid NULL → friend_invites ON DELETE SET NULL | si nació de un enlace |

- **PK `(user_low, user_high)`** + `CHECK (user_low < user_high)`.
- Índice `(user_high)`; la PK ya cubre `user_low`.
- Alta: `INSERT … ON CONFLICT (user_low, user_high) DO NOTHING`, respaldado por la PK.
- Baja ("Eliminar amigo"): `DELETE` por cualquiera de los dos. Bloquear también la borra (§4.12).

Helper: `are_friends(a uuid, b uuid) RETURNS boolean`, `STABLE`, que busca por PK con `LEAST/GREATEST`.

### 4.4 `friend_invites` — enlace de invitación (Q3)

Un enlace que tú generas y compartes fuera de la app (`athelete://amigo/{token}` + enlace universal).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `inviter_id` | uuid NOT NULL → auth.users | |
| `token` | text NOT NULL **UNIQUE** | 22 caracteres aleatorios (base64url de 16 bytes); no se deriva del usuario |
| `expires_at` | timestamptz NOT NULL DEFAULT `now() + interval '7 days'` | |
| `max_uses` | int NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 20) | |
| `uses` | int NOT NULL DEFAULT 0 | |
| `revoked_at` | timestamptz NULL | |
| `created_at` | timestamptz | |

- Índice `(inviter_id, created_at DESC)`.
- `redeem_friend_invite(token)`:
  - comprueba que no ha caducado, no está revocado, le quedan usos, no hay bloqueo y no eres tú;
  - **crea la amistad directamente** (`ON CONFLICT (user_low, user_high) DO NOTHING`) e incrementa `uses`.
  - **Decisión asumida, a confirmar:** quien comparte el enlace ya dio su consentimiento, así que no pasa por una solicitud. Por eso funciona aunque el que invita tenga `allow_friend_requests = false`, que es coherente con "tú sí puedes enviar" (Q12).
- Sin `SELECT` para nadie salvo el que invita (sus propios enlaces). El token solo se valida dentro de la RPC.

### 4.5 `social_posts` — publicaciones (SOCIAL_01, 02, 03, 13)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `author_id` | uuid NOT NULL → auth.users | |
| `type` | text NOT NULL CHECK in (`workout`,`record`,`routine`,`achievement`,`challenge`,`photo`) | El "entreno sin foto" (`light` en el prototipo) es `workout` con `photo_path IS NULL`. `photo` = publicación con foto y sin adjunto de Athelete (Q4) |
| `body` | text NULL CHECK (char_length(body) <= 280) | "Una frase". Opcional |
| `photo_path` | text NULL | Ruta en `social-photos`. Permitida en `workout` y `photo`; **obligatoria** en `photo` |
| `photo_width`, `photo_height` | int NULL | Para reservar el hueco sin saltos |
| `audience` | text NOT NULL CHECK in (`friends`,`public`) | Se copia de `social_settings.audience` al publicar; el chip "Amigos" del composer lo muestra |
| `attachment` | jsonb NULL | **Instantánea no editable** de las métricas (ver abajo). La escribe la RPC. NULL solo en `photo` |
| `workout_session_id` | uuid NULL → workout_sessions ON DELETE SET NULL | origen si `type='workout'` |
| `personal_record_id` | uuid NULL → personal_records ON DELETE SET NULL | origen si `type='record'` |
| `routine_template_id` | uuid NULL → workout_templates ON DELETE SET NULL | origen si `type='routine'` |
| `badge_id` | text NULL | origen si `type='achievement'` (id de `user_badges.badge_id`) |
| `challenge_id` | uuid NULL → social_challenges ON DELETE SET NULL | origen si `type='challenge'` |
| `source_key` | text NOT NULL | Clave de idempotencia: `'workout:'||session_id`, `'record:'||pr_id`, `'routine:'||template_id`, `'badge:'||badge_id`, `'challenge:'||challenge_id`, `'core33:'||participation_id`, `'photo:'||id` |
| `like_count`, `comment_count` | int NOT NULL DEFAULT 0 | triggers |
| `hidden_at` | timestamptz NULL | Ocultado por moderación (§4.12) |
| `created_at` | timestamptz | |
| `edited_at` | timestamptz NULL | solo cambia `body` |
| `deleted_at` | timestamptz NULL | borrado lógico por el autor |

Restricciones e índices:
- **`UNIQUE (author_id, source_key)`**: no se puede publicar dos veces el mismo entreno, récord o logro. `create_post` usa `ON CONFLICT (author_id, source_key) DO NOTHING RETURNING …` y, si ya existía, devuelve el post existente.
- **Q4 · nunca solo texto**: `CHECK (attachment IS NOT NULL OR photo_path IS NOT NULL)` + `CHECK (type <> 'photo' OR (photo_path IS NOT NULL AND attachment IS NULL))` + `CHECK (photo_path IS NULL OR type IN ('workout','photo'))`.
- Coherencia del origen por tipo (p. ej. `workout` exige `workout_session_id`): trigger `BEFORE INSERT`, porque las FK `SET NULL` pueden vaciarlo después (Q8).
- Índice `(author_id, created_at DESC) WHERE deleted_at IS NULL AND hidden_at IS NULL`, que sirve para el feed y para el perfil.
- **Sin índice de feed público** (Q2): el contenido `public` solo se lee en el perfil de su autor.

**`attachment`** (lo escribe el servidor a partir del origen; el cliente solo envía el id del origen):
- `workout`: `{ title, duration_min, exercises_done, exercises_total, workout_type, calories, record: {exercise, value, unit} | null }`. **Calorías en lugar de volumen** (Q7). Cuando exista §13 se añade `volume_kg` sin romper los posts antiguos.
- `record`: `{ exercise_id, exercise_name, pr_type, value, unit, delta, previous_best }`.
- `routine`: `{ title, difficulty, duration_min, type, exercises: [{exercise_id, name, sets, reps, duration, rest_time, sort_order}] }`. Es la instantánea que se copia al guardar (§4.9).
- `achievement`: `{ badge_id, title, icon }` o, para Core 33, `{ kind: 'core33', days_completed: 33 }`.
- `challenge`: `{ title, metric, goal, final_value, rank_among_friends, badge_id, points }`.

Publicar: RPC `create_post(type, source_id, body, photo_path)`. La RPC:
1. comprueba que el origen es del autor; por ejemplo, la sesión es suya y está `completed`;
2. comprueba que la categoría está compartida en su privacidad (si `share_records = false`, no deja publicar un récord, y el composer ni lo ofrece). Con `share_photos = false`, el composer no ofrece foto;
3. arma `attachment` y aplica `ON CONFLICT`.

El cliente **no tiene `INSERT` directo** en `social_posts`. Los posts **siempre los publica el usuario** (Q5).

### 4.6 `social_post_likes` — me gusta

| Columna | Tipo |
|---|---|
| `post_id` | uuid → social_posts ON DELETE CASCADE |
| `user_id` | uuid → auth.users ON DELETE CASCADE |
| `created_at` | timestamptz |

- **PK `(post_id, user_id)`**. Dar like = `INSERT … ON CONFLICT (post_id, user_id) DO NOTHING`; quitarlo = `DELETE`.
- Índice `(user_id)`, para borrar la cuenta y para "mis likes".
- Trigger `AFTER INSERT/DELETE`: recalcula `like_count`, crea o borra la notificación al autor y **no otorga puntos**.

### 4.7 `social_post_comments` — comentarios planos (SOCIAL_03)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `post_id` | uuid NOT NULL → social_posts ON DELETE CASCADE | |
| `author_id` | uuid NOT NULL → auth.users | |
| `body` | text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 500) | |
| `created_at` | timestamptz | |
| `hidden_at` | timestamptz NULL | moderación |
| `deleted_at` | timestamptz NULL | |

- Sin `parent_id`, así que no hay hilos.
- Índice `(post_id, created_at)`.
- Trigger: `comment_count` + notificación al autor del post. Sin puntos.

### 4.8 `social_activity` — líneas de actividad ("Carlos · nuevo récord")

Actividad breve **automática** (Q5) que **no es un post**: no tiene likes ni comentarios. La escriben triggers del servidor, nunca el cliente. **Solo la ven los amigos**, aunque la audiencia sea pública.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL → auth.users | quién hizo la actividad |
| `kind` | text NOT NULL CHECK in (`workout_completed`,`record`,`badge`,`core33_completed`,`challenge_completed`,`streak`) | |
| `category` | text NOT NULL CHECK in (`workouts`,`records`,`achievements`) | para aplicar la privacidad |
| `ref_key` | text NOT NULL | `'session:'||id`, `'pr:'||id`… |
| `summary` | jsonb NOT NULL | `{ title }` mínimo, para pintar la línea |
| `created_at` | timestamptz | |

- **`UNIQUE (user_id, kind, ref_key)`**: los triggers insertan con `ON CONFLICT (user_id, kind, ref_key) DO NOTHING`.
- Índice `(user_id, created_at DESC)`.
- La línea agrupada del prototipo ("Carlos y Sofía ya completaron sus 4 entrenos esta semana") se **agrupa al leer** (RPC del feed), no se guarda agrupada.
- **Retención: 30 días** (Q9). Un job diario borra lo anterior.

### 4.9 Rutinas compartidas (SOCIAL_04) — sin tabla nueva

- **Qué se puede compartir** (Q15): solo rutinas **creadas por el usuario**, es decir, `workout_templates` con:
  - `created_by = auth.uid()`;
  - `source = 'custom'`;
  - `created_by_ai IS NOT TRUE`;
  - `copied_from_post_id IS NULL`.

  No se comparten las rutinas de la biblioteca, las de ELLIE ni las copias guardadas de otros (para respetar al autor original). [Verificar en backend los valores reales de `source`; en el cliente `buildTemplatePayload` usa `'custom'` por defecto.]
- **Compartir** = un `social_posts` con `type = 'routine'` y la instantánea de ejercicios en `attachment`.
- **Guardar rutina** = RPC `save_shared_routine(post_id)`:
  1. comprueba `can_view_post(post_id)` y `share_routines` del autor;
  2. crea un `workout_templates` del usuario con `created_by = auth.uid()`, `is_public = false` y `source = 'shared'`, más sus `template_exercises` a partir de la instantánea;
  3. devuelve el id de la copia.

  La copia es "Tuya" y editable sin tocar la original (handoff §5).

Cambios en `workout_templates`:

| Columna nueva | Tipo | Notas |
|---|---|---|
| `copied_from_post_id` | uuid NULL → social_posts ON DELETE SET NULL | de qué publicación se guardó |
| `copied_from_user_id` | uuid NULL → auth.users ON DELETE SET NULL | "Compartida por Mateo" en la copia |

- **`UNIQUE (created_by, copied_from_post_id)`**: guardar dos veces la misma publicación devuelve la copia existente (`ON CONFLICT (created_by, copied_from_post_id) DO NOTHING`). Postgres permite varias filas con `NULL`, así que no afecta a las rutinas normales.
- Nuevo valor `'shared'` en `workout_templates.source` y en `WorkoutSourceType` de la app [verificar si `source` tiene CHECK en backend].
- Por qué instantánea y no leer la plantilla original: no hay que abrir las políticas de `workout_templates` a los amigos, y lo guardado es exactamente lo que se compartió aunque el autor la edite o la borre después.
- "Empezar" desde la rutina compartida: guarda la copia y empieza la sesión sobre ella. Así `workout_sessions.workout_id` siempre apunta a una plantilla propia.

### 4.10 Retos sociales (SOCIAL_07 a SOCIAL_12)

Una sola tabla de retos para oficiales y entre amigos. Comparten participantes, progreso y celebración. **Core 33 no entra aquí**: sigue en `challenge_participations` (MIGRATION_PROGRESS §1, decisión 6).

#### `social_challenges`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `kind` | text NOT NULL CHECK in (`official`,`friends`) | |
| `creator_id` | uuid NULL → auth.users | NULL en oficiales; obligatorio en `friends` (CHECK) |
| `title` | text NOT NULL | En `friends` se genera: "4 entrenamientos esta semana" |
| `metric` | text NOT NULL CHECK in (`workouts`,`strength_sessions`,`minutes_trained`,`exercise_reps`,`core33_habit_days`,`mobility_minutes`) | Los 6 tipos de SOCIAL_11 paso 1 |
| `exercise_id` | uuid NULL → exercises | Obligatorio si `metric = 'exercise_reps'` (CHECK) |
| `goal` | int NOT NULL CHECK (goal > 0) | Rangos por métrica del prototipo: entrenos 1–14, fuerza 1–10, minutos 30–900, reps 10–1000, hábitos 1–14, movilidad 15–300 (validación en la RPC) |
| `duration_days` | int NOT NULL; CHECK in (3, 7, 14) para `friends` | "3 días / 1 semana / 2 semanas" |
| `starts_at` | timestamptz NULL | En `friends`: NULL hasta que acepta el primer invitado ("El reto empieza cuando acepte alguien") |
| `ends_at` | timestamptz NULL | `starts_at + duration_days` |
| `invite_expires_at` | timestamptz NULL | `friends`: `created_at + 7 días` (Q16) |
| `status` | text NOT NULL CHECK in (`pending`,`active`,`completed`,`cancelled`,`expired`) | |
| `allow_manual` | boolean NOT NULL DEFAULT false | `CHECK (NOT allow_manual OR kind = 'official')` (Q6) |
| `points` | int NOT NULL DEFAULT 0 | `CHECK (points = 0 OR kind = 'official')` (Q1) |
| `badge_id` | text NULL | "Semana de tracción"… (nuevos `BadgeId`). Entre amigos puede haber badge sin puntos (p. ej. "Constancia") [verificar con diseño] |
| `cover_path` | text NULL | Foto del oficial (asset de la app o bucket) |
| `slug` | text NULL UNIQUE | Solo oficiales, para crearlos de forma idempotente desde el panel o seed |
| `created_at` | timestamptz | |

- **Q6 · repeticiones**: `CHECK (metric <> 'exercise_reps' OR kind = 'official')`. Crear reto entre amigos no ofrece "Repeticiones de un ejercicio" hasta que exista §13; entonces se quita el CHECK.
- **Q16 · caducidad de invitaciones**: una invitación caduca **al empezar el reto o a los 7 días**, lo que ocurra antes.
  - Al aceptar el primer invitado, el reto pasa a `active` y las invitaciones que siguen pendientes pasan a `expired`.
  - Si nadie acepta en 7 días, el reto pasa a `expired`. Lo hace el job horario.
- Índices: `(kind, status, ends_at)` para el reto oficial vigente, `(status, invite_expires_at)` para el job y `(creator_id)`.
- Los **oficiales los crea el equipo** (service role o panel), nunca un usuario.

#### `social_challenge_participants`

| Columna | Tipo | Notas |
|---|---|---|
| `challenge_id` | uuid → social_challenges ON DELETE CASCADE | |
| `user_id` | uuid → auth.users ON DELETE CASCADE | |
| `role` | text NOT NULL CHECK in (`creator`,`invited`,`joined`) | `joined` = oficial |
| `status` | text NOT NULL CHECK in (`invited`,`active`,`declined`,`expired`,`left`,`completed`) | |
| `invited_by` | uuid NULL → auth.users | "Andrea te invita" |
| `progress` | int NOT NULL DEFAULT 0 | Suma cacheada de las aportaciones (trigger) |
| `joined_at`, `completed_at` | timestamptz NULL | |
| `final_rank_among_friends` | int NULL | Se fija al cerrar el reto (SOCIAL_12: "Primero de tus amigos en terminar") |
| `celebrated_at` | timestamptz NULL | Si ya vio la celebración |

- **PK `(challenge_id, user_id)`**. Invitar y unirse usan `ON CONFLICT (challenge_id, user_id) DO UPDATE SET status = …`, respaldado por la PK.
- Índices: `(user_id, status)` para "mis retos" y `(challenge_id, progress DESC)` para el ranking.
- Solo se puede invitar a **amigos** (la RPC lo comprueba).
- **Sin sugerencias** de "Personas de tus retos" (Q13): los participantes de un reto oficial que no son amigos nunca se exponen.

#### `social_challenge_contributions`

Cada aporte de progreso, para poder recalcular y auditar.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `challenge_id`, `user_id` | uuid NOT NULL | FK compuesta → participants ON DELETE CASCADE |
| `amount` | int NOT NULL CHECK (amount > 0) | |
| `source` | text NOT NULL CHECK in (`workout_session`,`habit_day`,`manual`) | Cuando exista §13 se añade `session_set` |
| `source_key` | text NOT NULL | `'session:'||id`, `'habit:'||participation_id||':'||date`, `'manual:'||gen_random_uuid()` |
| `occurred_at` | timestamptz NOT NULL | debe caer entre `starts_at` y `ends_at` (trigger) |
| `created_at` | timestamptz | |

- **`UNIQUE (challenge_id, user_id, source_key)`**: el trigger de sesiones inserta con `ON CONFLICT (challenge_id, user_id, source_key) DO NOTHING`. Si la sesión se marca completada dos veces, no suma dos veces. Los manuales llevan una clave única nueva, así que siempre insertan.
- Trigger `AFTER INSERT/DELETE`: recalcula `progress`. Si `progress >= goal` y no estaba completado, marca `completed`, notifica y, **solo si es oficial**, otorga recompensa (§6.4).
- **Manual** ("Registra una serie hecha fuera de Athelete", Q6): RPC `add_manual_contribution(challenge_id, amount)`.
  - Solo si `allow_manual`, que solo es posible en retos oficiales.
  - `amount` entre 1 y 100 por registro y un máximo de 300 al día por persona y reto.

Lecturas por RPC (no hay `SELECT` libre de participantes ajenos):
- `get_challenge_board(challenge_id)`: devuelve **solo yo + mis amigos** con su progreso y posición relativa, y además `participants_total` (número sin nombres, "18.420 atletas"). Es lo que exige "comparación solo entre amigos".
- `get_my_challenges()`: lista para SOCIAL_07 (activos, invitaciones, completados recientes).

### 4.11 `social_notifications` — notificaciones sociales (solo dentro de la app, Q10)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `recipient_id` | uuid NOT NULL → auth.users | |
| `actor_id` | uuid NULL → auth.users | NULL en avisos del sistema (reto oficial nuevo) |
| `type` | text NOT NULL CHECK in (`friend_request`,`friend_accepted`,`post_like`,`post_comment`,`challenge_invite`,`challenge_started`,`challenge_completed`,`challenge_ending`) | |
| `post_id`, `comment_id`, `challenge_id`, `request_id` | uuid NULL (FK ON DELETE CASCADE) | |
| `dedupe_key` | text NOT NULL | `'like:'||post_id||':'||actor_id`, `'comment:'||comment_id`, `'invite:'||challenge_id`… |
| `read_at` | timestamptz NULL | |
| `created_at` | timestamptz | |

- **`UNIQUE (recipient_id, dedupe_key)`**: dar y quitar like varias veces no genera spam (`ON CONFLICT (recipient_id, dedupe_key) DO NOTHING`; al quitar el like se borra la fila).
- Índices: `(recipient_id, created_at DESC)` y `(recipient_id) WHERE read_at IS NULL` para el contador.
- No se notifica al propio actor ni entre usuarios bloqueados.
- La pantalla Notificaciones actual mezclará estas filas con los nudges de ELLIE ("actividad social nueva", MIGRATION_PROGRESS §3).
- **v1 sin push** (Q10). La tabla ya sirve de cola si después se añade APNs/FCM.

### 4.12 Moderación: `user_blocks` y `content_reports` (Q11, antes de lanzar)

Requisito de App Store (guía 1.2, contenido generado por usuarios): filtrar contenido inaceptable, poder reportarlo, poder bloquear usuarios y responder a los reportes.

#### `user_blocks`

| Columna | Tipo | Notas |
|---|---|---|
| `blocker_id` | uuid → auth.users ON DELETE CASCADE | |
| `blocked_id` | uuid → auth.users ON DELETE CASCADE | |
| `created_at` | timestamptz | |

- **PK `(blocker_id, blocked_id)`** + `CHECK (blocker_id <> blocked_id)`. Índice `(blocked_id)`.
- Bloquear, con la RPC `block_user(target)`: `INSERT … ON CONFLICT (blocker_id, blocked_id) DO NOTHING`. En la misma transacción:
  - borra la amistad;
  - cancela las solicitudes pendientes en ambas direcciones;
  - quita a ambos de los retos entre amigos que compartan y que estén `pending`.

  Los retos activos se mantienen, pero el otro deja de verse en el ranking.
- Efecto: `is_blocked(a, b)` (en cualquier dirección) hace que **ninguno vea nada del otro**: perfil, posts, comentarios, actividad, ranking y búsqueda. Además, no pueden enviarse solicitudes ni invitar al otro.
- El bloqueado **no recibe aviso**.

#### `content_reports`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `reporter_id` | uuid NOT NULL → auth.users | |
| `target_type` | text NOT NULL CHECK in (`post`,`comment`,`user`) | |
| `target_id` | uuid NOT NULL | |
| `reason` | text NOT NULL CHECK in (`spam`,`harassment`,`nudity`,`violence`,`self_harm`,`other`) | |
| `details` | text NULL CHECK (char_length(details) <= 500) | |
| `status` | text NOT NULL DEFAULT `'open'` CHECK in (`open`,`actioned`,`dismissed`) | |
| `created_at`, `resolved_at` | timestamptz | |

- **`UNIQUE (reporter_id, target_type, target_id)`**: reportar dos veces no duplica (`ON CONFLICT … DO NOTHING`).
- Índice `(status, created_at)` para la cola de revisión.
- Al reportar, **el contenido se oculta para quien reporta** de inmediato (filtro en `can_view_post`).
- Con **3 reportes distintos**, un trigger pone `hidden_at` en el post o comentario para todos, hasta que el equipo lo revise.
- La revisión la hace el equipo con service role (panel o SQL). El compromiso de respuesta en 24 h que pide Apple es un proceso, no esquema; queda anotado en §11.
- RLS: `INSERT` propio; `SELECT` solo de los propios reportes; sin `UPDATE`/`DELETE` para usuarios.

---

## 5. Identidad y perfil social

### 5.1 No se abre `profiles`

`profiles` tiene peso, fecha de nacimiento, género y metas de nutrición. Sus políticas actuales no están en el repo [verificar]; lo razonable es que sean "solo el dueño", y **deben seguir así**. Para mostrar a otros usuarios se usa una vista con lo mínimo:

`social_profiles` (vista `security_invoker = false`, propiedad de un rol sin login, o RPC equivalente):

| Columna | Origen |
|---|---|
| `id`, `username`, `name`, `avatar_key`, `profile_photo_url` | `profiles` + `social_settings` |
| `goal` | `profiles.goal` (SOCIAL_06 lo muestra; la vista previa de SOCIAL_14 dice "tu nombre, tu objetivo y tu racha") |
| `weight` | `profiles.weight` **solo si** `share_body_weight` y el visitante puede verlo; si no, NULL |

Filtro de la vista:
- se ve si no hay bloqueo **y** se da una de estas condiciones: el visitante es el dueño, son amigos, hay una solicitud pendiente entre los dos, o comparten un reto entre amigos;
- **no** aparecen desconocidos.

Encontrar a alguien (Q3), solo con estas dos RPC:
- `find_user_by_username(username)`: coincidencia **exacta** (`citext`). Devuelve nombre, `avatar_key`, si acepta solicitudes y la relación. Si hay bloqueo o la persona no tiene `username`, devuelve vacío. No hay búsqueda parcial ni listado.
- `redeem_friend_invite(token)` (§4.4).

### 5.2 `get_social_profile(user_id)` (SOCIAL_06)

RPC `SECURITY DEFINER`. Devuelve los agregados sin exponer filas:

| Campo | Cálculo | Privacidad |
|---|---|---|
| `relationship` | `self` / `friends` / `request_sent` / `request_received` / `none` | — |
| `friends_since` | `friendships.created_at` | solo amigos |
| `streak_days`, `sessions_total` | sobre `workout_sessions` completadas (misma regla que `profile-overview.ts`) | `share_workouts` |
| `badges_total` | `user_badges` | `share_achievements` |
| `records` (top 3) | `personal_records` | `share_records` |
| `common_challenges` | retos donde participamos los dos | solo amigos |
| `recent_posts` (2) | `social_posts` visibles para mí | `can_view_post` |
| `hidden_categories` | lista de lo que no comparte (la nutrición siempre, Q14) | para la línea "Carlos no comparte peso corporal ni nutrición." |

Por relación:
- **Amigos:** todo lo anterior, según sus interruptores.
- **No amigos con `audience = 'public'`:** lo mismo, salvo `friends_since` y `common_challenges` (Q2: lo público se ve **solo aquí**, en el perfil).
- **No amigos con `audience = 'friends'`:** solo nombre, avatar, objetivo, racha y el botón Agregar (o "No acepta solicitudes", Q12).

---

## 6. Contenido que genera la app y cuándo

Principio (Q5): **la app prepara, el usuario publica**.
- Los **posts** siempre los crea el usuario: la publicación "llega preparada" (SOCIAL_13) y él toca Publicar.
- Las **líneas de actividad** sí son automáticas, respetando la privacidad.
- El **progreso de retos** se suma solo.

### 6.1 Disparadores

| Evento | Dónde ocurre hoy | Qué genera | Cómo |
|---|---|---|---|
| **Entreno completado** | `completeWorkoutSession` (`fitness.ts`): `workout_sessions.status → 'completed'` | 1) Línea `workout_completed`. 2) Aportes a retos activos según la métrica: `workouts` +1; `strength_sessions` +1 si la plantilla es `type='strength'`; `minutes_trained` +`duration`; `mobility_minutes` +`duration` si `type='mobility'`. 3) En la app, el Resumen de cierre ofrece "Compartir" → SOCIAL_13 con el adjunto | Trigger `AFTER UPDATE OF status ON workout_sessions WHEN NEW.status='completed' AND OLD.status<>'completed'`. Idempotente por `source_key` |
| **Récord personal** | `usePersonalRecords.addRecord` (manual) | Línea `record` (si `share_records`). En la app, toast "¿Compartir tu récord?" → composer con adjunto Récord | Trigger `AFTER INSERT ON personal_records` |
| **Logro** | `award_gamification_event` inserta en `user_badges` (BK-01) | Línea `badge` (si `share_achievements`). Opción de compartir desde Logros | Trigger `AFTER INSERT ON user_badges` |
| **Core 33 completado** | `core33.ts` → `challenge_participations.status → 'completed'` | Línea `core33_completed`. Post de logro "Core 33" ofrecido (SOCIAL_01 p4) | Trigger `AFTER UPDATE OF status ON challenge_participations` |
| **Día de hábitos Core 33** | `habit_logs` con los 3 hábitos del día completos | Aporte +1 a retos `core33_habit_days` | Trigger `AFTER INSERT/UPDATE ON habit_logs`: cuenta los 3 `completed` del día; `source_key = 'habit:'||participation_id||':'||date` |
| **Reto completado** | `social_challenge_participants.progress >= goal` | Línea `challenge_completed`; notificación a los demás participantes amigos; celebración SOCIAL_12; puntos solo si es oficial (Q1); "Compartir" → post `challenge` | Trigger de aportes (§4.10) |
| **Reto entre amigos cerrado / invitación caducada** | `ends_at` o `invite_expires_at` pasado | `status='completed'` con `final_rank_among_friends`, o `expired` | Job programado cada hora (`pg_cron`) [verificar disponibilidad en el plan] |
| **Rutina compartida** | El usuario toca "Compartir" en una rutina propia (Q15) | Post `routine` (no hay línea automática) | RPC `create_post` |

### 6.2 Deshacer

- **Borrar un récord** (la app lo permite): borra su línea de actividad (trigger `AFTER DELETE`). El post, si lo hubo, **conserva la instantánea** y queda con `personal_record_id = NULL` (Q8). Lo mismo si se borra una sesión o una rutina.
- **Borrar un post**: borrado lógico; desaparece con sus comentarios y likes para todos.
- **Sesión cancelada después de completada** (no ocurre hoy): el trigger `AFTER UPDATE` borra los aportes con su `source_key`.

### 6.3 Lo que el diseño muestra y hoy no se puede calcular

| Dato del diseño | Pantalla | Falta | Decisión v1 |
|---|---|---|---|
| Volumen "9.120 kg" | SOCIAL_01 p2, SOCIAL_13 | Series y peso por ejercicio (§13) | **Calorías** (`workout_sessions.calories_burned`) en su lugar (Q7) |
| "Récord si lo hubo" en el entreno | SOCIAL_13 | Detección de récords en sesión (§13) | Se enlaza un récord registrado a mano mientras duraba esa sesión |
| Reto "Repeticiones de un ejercicio" / "100 dominadas" automático | SOCIAL_08, SOCIAL_11 | Repeticiones por ejercicio (§13) | Solo en el **oficial**, con registro manual; oculto en "Crear reto" (Q6) |
| Ejercicios "6 de 6" | SOCIAL_13 | — | Sí existe: `completed_exercises.length` / `total_exercises` |

### 6.4 Puntos y badges

- Nunca por likes, comentarios, publicar ni agregar amigos.
- **Solo al completar el reto oficial** (Q1): `award_gamification_event('social_challenge_completed', reference = challenge_id||':'||user_id, points = challenge.points, badge_ids = [challenge.badge_id])`.
- **Depende de BK-01.** La tabla de eventos de esa RPC necesita `UNIQUE (user_id, event_type, reference_id)` para que su `ON CONFLICT` funcione [verificar la definición en backend].

---

## 7. Fotos

### 7.1 Bucket `social-photos`

| Aspecto | Propuesta |
|---|---|
| Visibilidad | **Privado** (`public = false`). Lectura solo con URL firmada |
| Ruta | `{author_id}/{post_id}/{uuid}.jpg`. El `post_id` se reserva antes de subir (RPC `reserve_post_id()`) o se sube a `{author_id}/drafts/{uuid}` y la RPC lo mueve al publicar |
| Tipos | `image/jpeg`, `image/png`, `image/webp` (`allowed_mime_types` del bucket). HEIC del iPhone se convierte a JPEG en el cliente |
| Tamaño | Límite del bucket **5 MB**. El cliente redimensiona a **1600 px** de lado mayor y JPEG calidad 0,8 (≈ 300–700 KB) |
| Miniatura | Variante de **640 px** subida junto a la original (`…_640.jpg`) para el feed. Así no dependemos de Image Transformations, que solo existe en planes de pago [verificar plan] |
| Metadatos | **Quitar EXIF (GPS)** en el cliente antes de subir: una foto de gimnasio no debe revelar la ubicación |
| URL firmada | 1 h, con la misma caché que `profile-photo.ts` |

### 7.2 Políticas de `storage.objects` para `social-photos`

| Operación | Regla |
|---|---|
| INSERT | `bucket_id = 'social-photos' AND (storage.foldername(name))[1] = auth.uid()::text` |
| DELETE | igual que INSERT (el autor borra lo suyo) |
| UPDATE | no permitido |
| SELECT | dueño, **o** `can_view_post(((storage.foldername(name))[2])::uuid)` **y** `share_photos` del autor |

Al borrar un post, un trigger o la RPC borra sus objetos. Un job semanal limpia las subidas de `drafts/` de más de 24 h.

### 7.3 Avatares de otros usuarios (bucket existente `profile-photos`)

Hoy cada usuario solo firma su propia ruta `{userId}/avatar`. Sus políticas no están en el repo [verificar]. Para Comunidad hace falta añadir un `SELECT` en `profile-photos` con el mismo filtro que `social_profiles` (§5.1): dueño, amigos, solicitud pendiente o reto compartido, y sin bloqueo.

En una búsqueda por nombre de usuario se muestra el **avatar predefinido** (`avatar_key`, que es un asset local) o las iniciales, no la foto, hasta que haya relación. Así la foto real nunca llega a un desconocido.

---

## 8. RLS por tabla

Funciones de apoyo (`STABLE SECURITY DEFINER`, `search_path = public`):
- `is_blocked(a, b)`: existe un bloqueo en cualquier dirección.
- `are_friends(a, b)`: busca por PK en `friendships`.
- `can_see_category(owner, category)`: `owner = auth.uid()` **o** (`NOT is_blocked(auth.uid(), owner)` **y** (`are_friends(auth.uid(), owner)` **o** `audience(owner) = 'public'`) **y** el interruptor de esa categoría está activo).
- `can_view_post(post_id)`: post no borrado ni oculto, no reportado por mí **y** (`author = auth.uid()` **o** ((`are_friends` **o** `post.audience = 'public'`) **y** `can_see_category(author, category_of(type))`)).

Las categorías por tipo son: `workout` → workouts, `record` → records, `achievement` / `challenge` → achievements, `routine` → routines y `photo` → photos. Además, cualquier post con `photo_path` exige `share_photos`; con `share_photos = false`, el post de entreno se ve sin foto y el post `photo` no se ve.

La privacidad se evalúa **al leer**: si apago "Récords", mis récords anteriores dejan de verse (Q2b). Los posts públicos de alguien que no es tu amigo solo se leen desde `get_social_profile` (Q2); la RPC del feed filtra a amigos.

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `social_settings` | dueño (`username` de otros solo vía `social_profiles` y `find_user_by_username`) | dueño (RPC `ensure_social_settings`) | dueño (`username` vía `set_username`) | — (cascade con la cuenta) |
| `friend_requests` | remitente o receptor | **solo RPC** | **solo RPC** | — |
| `friendships` | si `auth.uid()` es uno de los dos | **solo RPC** (`respond_friend_request`, `redeem_friend_invite`) | — | uno de los dos |
| `friend_invites` | el que invita | el que invita (RPC `create_friend_invite`, límite 5 activos) | el que invita (solo `revoked_at`) | — |
| `social_posts` | `can_view_post(id)` | **solo RPC** `create_post` | autor, y solo `body`/`edited_at`/`deleted_at` (trigger que bloquea el resto de columnas) | — (borrado lógico) |
| `social_post_likes` | si `can_view_post(post_id)` | `user_id = auth.uid()` **y** `can_view_post(post_id)` | — | `user_id = auth.uid()` |
| `social_post_comments` | `can_view_post(post_id)`, no borrado ni oculto y sin bloqueo con su autor | `author_id = auth.uid()` **y** `can_view_post(post_id)` | autor (solo `body`) | autor del comentario **o** autor del post (borrado lógico) |
| `social_activity` | `can_see_category(user_id, category)` **y** (`are_friends` o es mía): solo amigos, nunca pública | **nadie** (solo triggers) | nadie | nadie (triggers y job de retención) |
| `social_challenges` | oficiales: cualquier autenticado; `friends`: participantes (cualquier estado, incluido `invited`) | `friends`: **solo RPC** `create_friend_challenge` (comprueba que todos los invitados son amigos y no están bloqueados); oficiales: service role | **solo RPC** (cancelar: el creador mientras está `pending`) | — |
| `social_challenge_participants` | la propia fila; y filas de **amigos** en retos donde yo participo. Rankings y total por RPC | **solo RPC** (invitar, unirse) | **solo RPC** (aceptar, rechazar, abandonar, `celebrated_at`) | — |
| `social_challenge_contributions` | las propias | **solo** triggers y RPC `add_manual_contribution` | nadie | propias **manuales** en las últimas 24 h (corregir un error) |
| `social_notifications` | `recipient_id = auth.uid()` | **nadie** (triggers) | destinatario, solo `read_at` | destinatario |
| `user_blocks` | `blocker_id = auth.uid()` (mi lista de bloqueados) | **solo RPC** `block_user` | — | `blocker_id = auth.uid()` (desbloquear) |
| `content_reports` | `reporter_id = auth.uid()` | `reporter_id = auth.uid()` | — | — |
| `workout_templates` (cambio) | **sin cambios** en sus políticas | la copia la crea la RPC `save_shared_routine` | igual que hoy (la copia es del usuario) | igual que hoy |

"Solo RPC" = sin política de `INSERT`/`UPDATE` para `authenticated`; la escritura la hace la función `SECURITY DEFINER` tras sus comprobaciones.

---

## 9. Restricciones únicas y su `ON CONFLICT` (lección de BK-01)

| Escritura | `ON CONFLICT` | Restricción que lo respalda |
|---|---|---|
| Crear `social_settings` | `(user_id) DO NOTHING` | PK `social_settings(user_id)` |
| Elegir nombre de usuario | **sin `ON CONFLICT`**; `set_username` captura `unique_violation` y responde "ya está en uso" | `UNIQUE social_settings(username)` |
| Crear amistad (solicitud o enlace) | `(user_low, user_high) DO NOTHING` | PK `friendships(user_low, user_high)` |
| Crear enlace de invitación | **sin `ON CONFLICT`** (token aleatorio; si colisiona, se reintenta) | `UNIQUE friend_invites(token)` |
| Publicar | `(author_id, source_key) DO NOTHING` | `UNIQUE social_posts(author_id, source_key)` |
| Like | `(post_id, user_id) DO NOTHING` | PK `social_post_likes(post_id, user_id)` |
| Línea de actividad | `(user_id, kind, ref_key) DO NOTHING` | `UNIQUE social_activity(user_id, kind, ref_key)` |
| Invitar / unirse a reto | `(challenge_id, user_id) DO UPDATE` | PK `social_challenge_participants(challenge_id, user_id)` |
| Aporte automático a reto | `(challenge_id, user_id, source_key) DO NOTHING` | `UNIQUE social_challenge_contributions(challenge_id, user_id, source_key)` |
| Notificación | `(recipient_id, dedupe_key) DO NOTHING` | `UNIQUE social_notifications(recipient_id, dedupe_key)` |
| Guardar rutina compartida | `(created_by, copied_from_post_id) DO NOTHING` | `UNIQUE workout_templates(created_by, copied_from_post_id)` |
| Reto oficial (seed) | `(slug) DO UPDATE` | `UNIQUE social_challenges(slug)` |
| Bloquear | `(blocker_id, blocked_id) DO NOTHING` | PK `user_blocks(blocker_id, blocked_id)` |
| Reportar | `(reporter_id, target_type, target_id) DO NOTHING` | `UNIQUE content_reports(reporter_id, target_type, target_id)` |
| Solicitud pendiente | **sin `ON CONFLICT`**; la RPC comprueba antes | índice único parcial (protección) |
| Serie de sesión (§13) | `(session_id, exercise_position, set_index) DO UPDATE` | `UNIQUE workout_session_sets(session_id, exercise_position, set_index)` |
| Récord automático (§13) | `(user_id, session_set_id) DO NOTHING` | `UNIQUE personal_records(user_id, session_set_id)` |

Prueba obligatoria antes de dar por buena la migración: un test SQL (pgTAP o script) que ejecute cada `ON CONFLICT` de la tabla dos veces seguidas y compruebe que la segunda no falla.

---

## 10. Orden de implementación sugerido

1. **Prerrequisitos de backend:** BK-01 (arreglar `award_gamification_event`) y BK-02 (regenerar tipos).
2. `social_settings` (con `username`), `friend_requests`, `friendships`, `friend_invites`, `user_blocks`, vista `social_profiles` y política de lectura en `profile-photos` → pantallas Amigos, Perfil de amigo y Privacidad.
3. `social_posts`, likes, comentarios, `content_reports`, bucket `social-photos` y `social_notifications` → Feed, Crear publicación, Publicación y comentarios, Compartir entreno. **Reportar y bloquear tienen que estar en la UI antes de publicar la versión** (Q11).
4. Columnas en `workout_templates` + `save_shared_routine` → Rutina compartida.
5. `social_activity` y triggers en `workout_sessions` / `personal_records` / `user_badges` / `challenge_participations`.
6. Retos: tablas, triggers de aportes, `get_challenge_board`, job de cierre y caducidad → Retos, Oficial, Entre amigos, Invitación, Crear reto y Completado.
7. **Independiente y recomendable antes del paso 6:** series por ejercicio (§13). Destraba Pausa/Descanso, volumen, récords automáticos y retos de repeticiones.

Cada paso es una migración aparte, con su prueba de RLS: un usuario A, su amigo B, un extraño C y un usuario D bloqueado por A, y qué ve cada uno.

---

## 11. Fuera de alcance de esta propuesta (señalado para no olvidarlo)

- Push notifications (APNs/FCM) y su preferencia por tipo (Q10: v1 solo in-app).
- **Proceso de moderación**: quién revisa la cola de `content_reports`, el compromiso de respuesta (Apple pide actuar en 24 h) y un contacto de soporte publicado en la ficha de la App Store.
- Límites de frecuencia (publicaciones, comentarios y solicitudes por hora) en las RPC.
- Exportar o borrar datos sociales a petición (GDPR): con `ON DELETE CASCADE` el borrado de cuenta ya los elimina.
- Enlace universal (`apple-app-site-association`) para el enlace de invitación; con `athelete://` basta para desarrollo.

---

## 12. Decisiones de producto

Todas decididas el 2026-09-30 y aplicadas en el documento.

| # | Pregunta | Decisión | Aplicada en |
|---|---|---|---|
| Q1 | Puntos en retos sociales | ✅ **Decidida**: puntos **solo en el reto oficial**. Entre amigos, 0 puntos | §4.10 (`CHECK points`), §6.4 |
| Q2 | Audiencia "Público" | ✅ **Decidida**: lo público se ve **solo en el perfil**; no hay feed público | §4.1, §4.5 (sin índice público), §5.2, §8 |
| Q2b | Apagar una categoría oculta lo anterior | ✅ **Decidida**: **sí**, se aplica al leer | §8 |
| Q3 | Búsqueda | ✅ **Decidida**: sin interruptor nuevo. Búsqueda **solo por nombre de usuario exacto** o **enlace de invitación** | §4.1 (`username`), §4.4, §5.1 |
| Q4 | Publicación sin adjunto | ✅ **Decidida**: cada post lleva **adjunto de Athelete o foto**; nunca solo texto | §4.5 (tipo `photo` + CHECK) |
| Q5 | Publicación automática | ✅ **Decidida**: los posts **siempre los publica el usuario**; la actividad breve es automática | §4.5, §4.8, §6 |
| Q6 | Repeticiones y registro manual | ✅ **Decidida**: registro manual **solo en el reto oficial** (con topes); retos de repeticiones **ocultos entre amigos** hasta tener series | §4.10, §6.3, §13 |
| Q7 | Volumen en "Compartir entreno" | ✅ **Decidida**: **calorías** en lugar de volumen | §4.5 (`attachment`), §6.3 |
| Q8 | Borrar el origen de un post | ✅ **Decidida**: el post **mantiene su instantánea** | §4.5, §6.2 |
| Q9 | Retención de la actividad breve | ✅ **Decidida**: **30 días** | §4.8 |
| Q10 | Notificaciones push | ✅ **Decidida**: **solo in-app** en v1 | §4.11, §11 |
| Q11 | Moderación | ✅ **Decidida**: **reportar y bloquear** incluidos **antes de lanzar** (requisito de App Store) | §4.12, §8, §10 |
| Q12 | "Permitir solicitudes" apagado | ✅ **Decidida**: **nadie** puede enviarte solicitudes; tú sí puedes enviarlas; los amigos actuales no cambian | §4.1, §4.2 |
| Q13 | Sugerir "personas de tus retos" | ✅ **Decidida**: **no** | §4.10, §5.1 |
| Q14 | Nutrición en el perfil de amigo | ✅ **Decidida**: **nunca** en v1 | §4.1, §5.2 |
| Q15 | Qué rutinas se pueden compartir | ✅ **Decidida**: **solo las creadas por el usuario** | §4.9 |
| Q16 | Caducidad de la invitación a un reto | ✅ **Decidida**: caduca **al empezar el reto o a los 7 días** | §4.10 |

Decisiones derivadas que asumí al aplicarlas (confírmalas en la próxima revisión):

| # | Decisión asumida | Por qué |
|---|---|---|
| DA-S1 | El enlace de invitación crea la amistad **directamente** al abrirlo, sin solicitud | Quien lo comparte ya dio su consentimiento; funciona aunque tenga las solicitudes apagadas ("tú sí puedes enviar") |
| DA-S2 | Las solicitudes ya recibidas antes de apagar "Permitir solicitudes" siguen pendientes y se pueden aceptar | "Los amigos actuales no cambian", extendido a lo que ya estaba en curso |
| DA-S3 | Las copias guardadas de rutinas ajenas **no** se pueden volver a compartir | "Solo rutinas creadas por el usuario": respeta al autor original |
| DA-S4 | Fotos permitidas en posts de entreno y en el nuevo tipo `photo`; no en récord, logro, rutina ni reto | Handoff: "fotografías opcionales en publicaciones de entreno"; Q4 abre el post de solo foto |
| DA-S5 | En la búsqueda por nombre de usuario se ve el avatar predefinido o las iniciales, no la foto real, hasta que haya relación | Privacidad de la foto frente a desconocidos |
| DA-S6 | Con 3 reportes de personas distintas, el contenido se oculta para todos hasta revisarlo | Protección mientras el equipo responde |
| DA-S7 | El registro manual del reto oficial: 1–100 por registro y máximo 300 al día | Evita inflar el reto sin impedir sesiones fuera de la app |

---

## 13. Prerrequisito: series por ejercicio

Solo diseño; sin código ni migraciones. Afecta a Entrenamiento (sesión, pausa, descanso, resumen), Récords y Social.

### 13.1 Qué guarda hoy una sesión

`workout_sessions` guarda una fila por sesión:
- `completed_exercises`: un **array de IDs** de ejercicios marcados como hechos;
- `duration` en minutos, calculada como **tiempo de reloj** desde `started_at` (`calculateSessionDurationMinutes`, `fitness.ts`), así que **una pausa cuenta como entreno**;
- `calories_burned`, **estimadas** como la parte proporcional de las calorías de la plantilla según los ejercicios hechos.

No hay series, repeticiones, pesos ni descansos reales. La prescripción (`sets`, `reps`, `rest_time`) vive en `template_exercises` y la sesión no registra qué se hizo de verdad.

### 13.2 Qué pide el diseño v2

De `Session.dc.html` y el handoff §5 / §7:
- **Descanso entre series**: "Serie 1 de 3 · [ejercicio]" → "Serie 2 de 3" con **reps y peso** ("3 × 12 · 16 kg").
- **Descanso entre ejercicios** con cuenta atrás según la prescripción, "+30 s" y "Saltar descanso".
- **Pausa** con cronómetro congelado: "el tiempo en pausa no cuenta como tiempo de entreno".
- **Guardar para después** y reanudar en la serie donde se quedó.
- **Resumen**: "Registrar récord" **solo cuando Athelete detecta un récord nuevo o posible**.
- **Social**: volumen (kg), "récord si lo hubo" y retos de repeticiones acumuladas.

### 13.3 Cambio propuesto en el modelo

Dos tablas hijas de `workout_sessions`. No se cambia ninguna columna existente; `completed_exercises` se sigue escribiendo para no romper lecturas actuales (progreso, perfil, ELLIE) hasta que migren.

#### `workout_session_exercises`: qué ejercicios tiene la sesión y en qué orden

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid NOT NULL → workout_sessions ON DELETE CASCADE | |
| `position` | int NOT NULL | orden dentro de la sesión (1…n) |
| `exercise_id` | uuid NULL → exercises | NULL si el ejercicio de la plantilla no está en la biblioteca |
| `template_exercise_id` | uuid NULL → template_exercises ON DELETE SET NULL | de qué prescripción viene |
| `name` | text NOT NULL | instantánea del nombre (la plantilla puede cambiar) |
| `planned_sets`, `planned_reps`, `planned_weight_kg`, `planned_duration_sec`, `planned_rest_sec` | int / numeric NULL | instantánea de la prescripción al empezar |
| `status` | text NOT NULL CHECK in (`pending`,`in_progress`,`done`,`skipped`) | |
| `completed_at` | timestamptz NULL | |

- **`UNIQUE (session_id, position)`**. Índice `(exercise_id)` para el historial por ejercicio.

#### `workout_session_sets`: cada serie hecha

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid NOT NULL → workout_sessions ON DELETE CASCADE | |
| `user_id` | uuid NOT NULL → auth.users | desnormalizado para RLS e índices |
| `exercise_position` | int NOT NULL | FK compuesta → `workout_session_exercises(session_id, position)` |
| `exercise_id` | uuid NULL → exercises | desnormalizado para consultas de récords |
| `set_index` | int NOT NULL CHECK (set_index >= 1) | 1, 2, 3… |
| `reps` | int NULL CHECK (reps BETWEEN 0 AND 1000) | |
| `weight_kg` | numeric(6,2) NULL CHECK (weight_kg >= 0) | total de la serie (2 × 14 kg = 28) |
| `load_note` | text NULL | cómo se muestra ("2 × 14 kg"), si difiere |
| `duration_sec` | int NULL | planchas, isométricos |
| `distance_m` | int NULL | cardio |
| `is_warmup` | boolean NOT NULL DEFAULT false | no cuenta para volumen ni récords |
| `rest_taken_sec` | int NULL | descanso real tras la serie (+30 s / saltar) |
| `completed_at` | timestamptz NOT NULL DEFAULT now() | |

- **`UNIQUE (session_id, exercise_position, set_index)`**: marcar o corregir una serie es `INSERT … ON CONFLICT (session_id, exercise_position, set_index) DO UPDATE`. Funciona sin conexión y con reintentos: el mismo envío dos veces no duplica.
- Índices: `(user_id, exercise_id, completed_at DESC)` para el historial y los récords, y `(session_id)`.
- RLS: **solo el dueño** (como `workout_sessions` hoy [verificar]). Los amigos nunca leen series; solo agregados (volumen en la instantánea del post y aportes a retos).

#### Cambios en `workout_sessions` (columnas nuevas, todas opcionales)

| Columna | Tipo | Para qué |
|---|---|---|
| `paused_at` | timestamptz NULL | pausa en curso |
| `paused_total_sec` | int NOT NULL DEFAULT 0 | suma de pausas; `duration` pasa a ser `ended_at − started_at − paused_total_sec` |
| `volume_kg` | numeric(10,2) NULL | Σ `weight_kg × reps` de series no de calentamiento; lo calcula un trigger al completar |
| `status` | + valor `saved` | "Guardar para después" distinto de `in_progress` [verificar si `status` tiene CHECK] |

#### Cambios en `personal_records` (para récords automáticos)

| Columna | Tipo | Notas |
|---|---|---|
| `source` | text NOT NULL DEFAULT `'manual'` CHECK in (`manual`,`session`) | |
| `workout_session_id` | uuid NULL → workout_sessions ON DELETE SET NULL | |
| `session_set_id` | uuid NULL → workout_session_sets ON DELETE SET NULL | |

- **`UNIQUE (user_id, session_set_id)`**: una serie genera como mucho un récord (`ON CONFLICT (user_id, session_set_id) DO NOTHING`). Los manuales (`NULL`) no se ven afectados.

### 13.4 Qué destraba

| Área | Qué se puede hacer con series | Hoy |
|---|---|---|
| **Pausa y Descanso** (fase 7, primer bloque) | Descanso entre series con "Serie 2 de 3 · 12 reps · 16 kg"; pausa que no cuenta como entreno (`paused_total_sec`); reanudar en la serie exacta tras "Guardar para después" | Solo se marca el ejercicio entero; la pausa suma tiempo |
| **Récords automáticos** | Al completar una serie, comparar con el mejor récord del ejercicio por tipo (`max_weight`, `weight_reps`, `max_reps`) y proponer "Registrar récord" en el Resumen solo si lo supera (handoff: "solo cuando Athelete detecta un récord nuevo o posible") | Solo registro manual |
| **Social · Compartir entreno** | Volumen real en el adjunto (`volume_kg`) y "récord si lo hubo" enlazado a la serie | Calorías estimadas (Q7) |
| **Social · Retos de repeticiones** | Retos "100 dominadas" o "Repeticiones de un ejercicio" que suman solos desde las series (`source = 'session_set'`, `source_key = 'set:'||id`); se puede quitar el CHECK de Q6 y abrirlos entre amigos | Solo manual y solo en el oficial |
| **Progreso y ELLIE** | Curvas de carga por ejercicio, volumen semanal, recomendaciones de progresión con datos reales | Solo número de sesiones y minutos |
| **Calorías** | Mejor estimación con trabajo real (o Apple Health cuando llegue) | Proporcional a la plantilla |

### 13.5 Riesgos y decisiones abiertas

- **Historial**: las sesiones anteriores no tienen series. Su volumen queda `NULL` y nunca se muestra como 0.
- **Fricción en la sesión**: pedir reps y peso en cada serie puede romper el "modo foco" (handoff: "nada compite con el check"). Propuesta: prellenar con la prescripción o con lo hecho la última vez, de modo que el check confirma tal cual y editar es opcional. Esto lo decide diseño en la fase 7.
- **Unidades**: todo en kg en BD; libras solo en presentación, si algún día se añade.
- **Orden**: este cambio es independiente de Social y puede ir antes. Hacerlo antes del paso 6 de §10 evita lanzar retos de repeticiones manuales que luego haya que reconvertir.
