# Comunidad · Propuesta de esquema (tablas, RLS y almacenamiento)

Estado: **borrador para revisión**. No hay migraciones ni código. Nada de esto está creado en Supabase.
Fecha: 2026-09-30 · Rama: `feature-migration` · Decisión previa que lo pide: MIGRATION_PROGRESS §1, decisión 7 ("antes de cualquier UI, documento de esquema de tablas y RLS para aprobación").

Fuentes:
- Handoff v2 §11 (Social / Comunidad), §5 (Social Post, Shared Routine, Friend Row) y §7 (inventario COMUNIDAD).
- `Social.dc.html`: pantallas SOCIAL_01 a SOCIAL_14 y los datos de ejemplo de su lógica.
- El repo: `src/types/supabase.ts`, `src/services/supabase/*`, `src/hooks/usePersonalRecords.ts` y `src/shared/domain/*`.

La definición SQL de las tablas actuales, sus políticas RLS y la función `award_gamification_event` **no están en este repo**. Lo que aquí se dice de ellas sale del código cliente y se marca como **[verificar en backend]** cuando es una suposición.

---

## 0. Resumen

- **11 tablas nuevas**, todas con prefijo `social_` salvo las de amistad:
  - privacidad: `social_settings`;
  - amistad: `friend_requests`, `friendships`;
  - publicaciones: `social_posts`, `social_post_likes`, `social_post_comments`;
  - actividad breve: `social_activity`;
  - retos: `social_challenges`, `social_challenge_participants`, `social_challenge_contributions`;
  - notificaciones: `social_notifications`.
- **Cambios mínimos en tablas existentes**: 2 columnas en `workout_templates` para las copias de rutinas compartidas. No se toca nada más.
- **Un bucket privado nuevo**, `social-photos`.
- **La autorización se centraliza en 3 funciones SQL** (`are_friends`, `can_see_category`, `can_view_post`) que reutilizan todas las políticas. Así la regla de visibilidad se escribe una sola vez.
- **Ninguna escritura sensible se hace directamente desde el cliente.** Aceptar amistad, guardar rutina, unirse a un reto y sumar progreso pasan por RPC `SECURITY DEFINER` o por triggers.
- **Lo que hoy impide algunas pantallas del diseño:**
  - las sesiones no guardan series, pesos ni repeticiones, así que no hay "volumen" ni retos de repeticiones automáticos (§6.3);
  - los récords se registran a mano;
  - los puntos dependen de BK-01.

---

## 1. Reglas del handoff que el esquema hace cumplir

| Regla (handoff §11 / §2) | Cómo la respeta el esquema |
|---|---|
| Sin Stories | No hay contenido efímero: ninguna tabla tiene `expires_at` y los posts no caducan |
| Sin Reels / vídeo | `social_posts` admite **una** foto (`photo_path`); el bucket solo acepta `image/jpeg`, `image/png` y `image/webp` |
| Sin filtros | No hay columnas de filtro ni de edición de imagen; la foto se guarda tal cual (solo redimensionada) |
| Sin hashtags | `body` es texto plano, sin tabla de etiquetas ni índice de búsqueda por texto en posts |
| Métricas no editables | El adjunto se guarda como **instantánea** (`attachment jsonb`) que escribe el servidor; el cliente no puede modificarla (§4.4) |
| No puntos por likes ni comentarios | Ningún trigger de `social_post_likes` / `social_post_comments` llama a `award_gamification_event`. Los likes no tienen tipo de evento de gamificación |
| No economía adicional | No hay saldo, monedas ni tienda; solo la columna `points` del reto (si se aprueba la pregunta Q1) reutiliza los puntos existentes |
| Comparación solo entre amigos | Los rankings se calculan con una RPC que filtra a **yo + mis amigos**. El número total de participantes de un reto oficial es un agregado sin nombres |
| Comentarios planos, sin hilos | `social_post_comments` no tiene `parent_id` |
| Peso corporal apagado por defecto | `social_settings.share_body_weight boolean NOT NULL DEFAULT false` |
| "Actividad menor de amigos como línea, no como post" | Tabla aparte, `social_activity`, que nunca recibe likes ni comentarios |

---

## 2. Lo que existe hoy (comprobado en el código)

| Tabla / objeto | Columnas relevantes (según `src/types/supabase.ts` o el uso en servicios) | Uso para Comunidad |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `name`, `avatar_key`, `profile_photo_url`, `goal`, `weight`, `birth_date`, `gender`… Además `points` (se lee en `profile-overview.ts` y `ellie.ts`, pero **no está en los tipos**, BK-02) | Identidad social: nombre, avatar, objetivo. **No se abre a otros usuarios** porque tiene peso, fecha de nacimiento y metas de nutrición (§5.1) |
| `workout_sessions` | `id`, `user_id`, `workout_id` (→ `workout_templates`, nullable), `workout_title`, `status` (`in_progress`/`completed`/`canceled`), `completed`, `duration` (min), `calories_burned`, `completed_exercises` (**array de IDs, sin series ni pesos**), `total_exercises`, `date`, `started_at`, `ended_at` | Origen de "entreno completado", de los retos de entrenos y minutos y de la racha |
| `workout_templates` | `id`, `created_by`, `title`, `type` (`strength`/`cardio`/`fullbody`/`mobility`/`hiit`), `difficulty`, `duration`, `image_url`, `is_public`, `source`, `created_by_ai`… | Rutinas compartidas y sus copias; el `type` clasifica las sesiones de fuerza y de movilidad |
| `template_exercises` | `template_id`, `exercise_id`, `name`, `sets`, `reps`, `duration`, `rest_time`, `sort_order`, `notes` | Lo que se copia al guardar una rutina |
| `exercises` | `id`, `slug`, `name`, `thumbnail_url`… | Miniaturas de la rutina compartida; ejercicio de un reto de repeticiones |
| `personal_records` | `id`, `user_id`, `exercise_id`, `pr_type` (`max_weight`/`weight_reps`/`max_reps`/`duration`/`distance`), `value_*`, `unit`, `recorded_at` (**no está en los tipos**, BK-02). Se crean **a mano** desde "Registrar PR"; se pueden borrar | Post "Nuevo récord" y la línea de actividad |
| `user_badges` | `user_id`, `badge_id`, `earned_at` (no está en los tipos) | Post "Logro" y la línea de actividad |
| `challenge_participations` + `habit_logs` | Core 33: `status` (`active`/`completed`), `habits` json, `start_date`; `habit_logs(participation_id, date, habit_index, completed)` | Retos de "días con los 3 hábitos" y post "Core 33 completado". **No hay tabla `challenges`**: Core 33 no tiene catálogo en BD |
| RPC `award_gamification_event(_event_type, _reference_id, _points, _badge_ids, _metadata)` | Idempotente por evento y referencia (devuelve `already_processed`). **Falla con `42P10`** (BK-01): su `ON CONFLICT` no tiene una restricción única que lo respalde | Puntos y badge al completar un reto (si se aprueba Q1) |
| Bucket `profile-photos` | Privado; ruta `{userId}/avatar`; ≤ 3 MB; JPG/PNG/WebP; se lee con URL firmada de 1 h | Los amigos tienen que poder ver el avatar del otro (§7.3) |
| Notificaciones | **No hay tabla**: `useNotificationsOverview` deriva "nudges" de ELLIE en el cliente | Hace falta una tabla para las notificaciones sociales (§4.10) |

Consecuencias para el diseño:
1. **"Volumen" (kg) y "Repeticiones de un ejercicio"** (SOCIAL_13, SOCIAL_08, SOCIAL_11 tipo 4) no se pueden calcular con los datos actuales. Hace falta registrar series y repeticiones, que es el bloque "Pausa y Descanso (series por ejercicio)" de la fase 7. Hasta entonces, solo con registro manual (Q6).
2. **"Récord si lo hubo" al terminar un entreno**: la app no detecta récords durante la sesión. Con los datos de hoy solo se puede enlazar un récord registrado a mano el mismo día (Q7).
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

### 4.1 `social_settings` — privacidad social (SOCIAL_14)

Una fila por usuario. Se crea al entrar por primera vez en Comunidad (RPC `ensure_social_settings()`, `INSERT … ON CONFLICT (user_id) DO NOTHING`).

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | uuid **PK** → auth.users | |
| `audience` | text NOT NULL DEFAULT `'friends'` CHECK in (`friends`,`public`) | "Solo amigos" / "Público" |
| `share_workouts` | boolean NOT NULL DEFAULT true | Entrenamientos |
| `share_records` | boolean NOT NULL DEFAULT true | Récords personales |
| `share_achievements` | boolean NOT NULL DEFAULT true | Logros (medallas y retos completados) |
| `share_photos` | boolean NOT NULL DEFAULT true | Fotos de las publicaciones |
| `share_routines` | boolean NOT NULL DEFAULT true | Rutinas (que los amigos puedan guardarlas) |
| `share_body_weight` | boolean NOT NULL DEFAULT **false** | Peso corporal: "nunca se muestra salvo que lo actives" |
| `allow_friend_requests` | boolean NOT NULL DEFAULT true | "Cualquiera puede enviarte una" |
| `discoverable` | boolean NOT NULL DEFAULT true | Aparecer en la búsqueda por nombre (Q3; el diseño no tiene interruptor) |
| `updated_at` | timestamptz | |

Si un usuario aún no tiene fila, las funciones aplican **estos mismos valores por defecto** (`COALESCE`). Así nunca se expone de más.

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
  - rechaza si ya son amigos, si `target.allow_friend_requests = false` o si hay una pendiente;
  - **si el otro ya me envió una pendiente, la acepta** en lugar de crear otra.
- `respond_friend_request(id, accept)`: solo el receptor; si acepta, crea la amistad.
- `cancel_friend_request(id)`: solo el remitente.

### 4.3 `friendships` — amistades

Una fila por pareja, guardada en orden canónico.

| Columna | Tipo | Notas |
|---|---|---|
| `user_low` | uuid NOT NULL → auth.users | el menor de los dos ids |
| `user_high` | uuid NOT NULL → auth.users | el mayor |
| `created_at` | timestamptz | "Amigos desde marzo" |
| `request_id` | uuid NULL → friend_requests ON DELETE SET NULL | trazabilidad |

- **PK `(user_low, user_high)`** + `CHECK (user_low < user_high)`.
- Índice `(user_high)`; la PK ya cubre `user_low`.
- Alta: `INSERT … ON CONFLICT (user_low, user_high) DO NOTHING`, respaldado por la PK.
- Baja ("Eliminar amigo"): `DELETE` por cualquiera de los dos.

Helper: `are_friends(a uuid, b uuid) RETURNS boolean`, `STABLE`, que busca por PK con `LEAST/GREATEST`.

### 4.4 `social_posts` — publicaciones (SOCIAL_01, 02, 03, 13)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `author_id` | uuid NOT NULL → auth.users | |
| `type` | text NOT NULL CHECK in (`workout`,`record`,`routine`,`achievement`,`challenge`) | El "entreno sin foto" (`light` en el prototipo) es `workout` con `photo_path IS NULL`. Texto solo: ver Q4 |
| `body` | text NULL CHECK (char_length(body) <= 280) | "Una frase". Opcional |
| `photo_path` | text NULL | Ruta en `social-photos`. Solo se permite con `type = 'workout'` (CHECK) — "fotografías opcionales en publicaciones de entreno" |
| `photo_width`, `photo_height` | int NULL | Para reservar el hueco sin saltos |
| `audience` | text NOT NULL CHECK in (`friends`,`public`) | Se copia de `social_settings.audience` al publicar; el chip "Amigos" del composer lo muestra |
| `attachment` | jsonb NOT NULL | **Instantánea no editable** de las métricas (ver abajo). La escribe la RPC |
| `workout_session_id` | uuid NULL → workout_sessions ON DELETE SET NULL | origen si `type='workout'` |
| `personal_record_id` | uuid NULL → personal_records ON DELETE SET NULL | origen si `type='record'` |
| `routine_template_id` | uuid NULL → workout_templates ON DELETE SET NULL | origen si `type='routine'` |
| `badge_id` | text NULL | origen si `type='achievement'` (id de `user_badges.badge_id`) |
| `challenge_id` | uuid NULL → social_challenges ON DELETE SET NULL | origen si `type='challenge'` |
| `source_key` | text NOT NULL | Clave de idempotencia: `'workout:'||session_id`, `'record:'||pr_id`, `'routine:'||template_id`, `'badge:'||badge_id`, `'challenge:'||challenge_id`, `'core33:'||participation_id` |
| `like_count`, `comment_count` | int NOT NULL DEFAULT 0 | triggers |
| `created_at` | timestamptz | |
| `edited_at` | timestamptz NULL | solo cambia `body` |
| `deleted_at` | timestamptz NULL | borrado lógico (Q8) |

Restricciones e índices:
- **`UNIQUE (author_id, source_key)`**: no se puede publicar dos veces el mismo entreno, récord o logro. `create_post` usa `ON CONFLICT (author_id, source_key) DO NOTHING RETURNING …` y, si ya existía, devuelve el post existente.
- CHECK de coherencia, uno por tipo. Ejemplo: `type <> 'workout' OR workout_session_id IS NOT NULL OR deleted_at IS NOT NULL`. Las FK `SET NULL` hacen que la regla solo se exija al crear; se implementa como trigger `BEFORE INSERT`.
- Índices:
  - `(author_id, created_at DESC) WHERE deleted_at IS NULL`, para el feed y el perfil de amigo;
  - `(created_at DESC) WHERE deleted_at IS NULL AND audience = 'public'`, solo si hay contenido público fuera de amigos (Q2).

**`attachment`** (lo escribe el servidor a partir del origen; el cliente solo envía el id del origen):
- `workout`: `{ title, duration_min, exercises_done, exercises_total, workout_type, volume_kg: null, record: {exercise, value, unit} | null }`. `volume_kg` queda en `null` hasta tener series (§2).
- `record`: `{ exercise_id, exercise_name, pr_type, value, unit, delta, previous_best }`.
- `routine`: `{ title, difficulty, duration_min, type, exercises: [{exercise_id, name, sets, reps, duration, rest_time, sort_order}] }`. Es la instantánea que se copia al guardar (§4.8).
- `achievement`: `{ badge_id, title, icon }` o, para Core 33, `{ kind: 'core33', days_completed: 33 }`.
- `challenge`: `{ title, metric, goal, final_value, rank_among_friends, badge_id, points }`.

Publicar: RPC `create_post(type, source_id, body, photo_path)`. La RPC:
1. comprueba que el origen es del autor; por ejemplo, la sesión es suya y está `completed`;
2. comprueba que la categoría está compartida en su privacidad. Si `share_records = false`, no deja publicar un récord, y el composer ni lo ofrece;
3. arma `attachment` y aplica `ON CONFLICT`.

El cliente **no tiene `INSERT` directo** en `social_posts`.

### 4.5 `social_post_likes` — me gusta

| Columna | Tipo |
|---|---|
| `post_id` | uuid → social_posts ON DELETE CASCADE |
| `user_id` | uuid → auth.users ON DELETE CASCADE |
| `created_at` | timestamptz |

- **PK `(post_id, user_id)`**. Dar like = `INSERT … ON CONFLICT (post_id, user_id) DO NOTHING`; quitarlo = `DELETE`.
- Índice `(user_id)`, para borrar la cuenta y para "mis likes".
- Trigger `AFTER INSERT/DELETE`: recalcula `like_count`, crea o borra la notificación al autor y **no otorga puntos**.

### 4.6 `social_post_comments` — comentarios planos (SOCIAL_03)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `post_id` | uuid NOT NULL → social_posts ON DELETE CASCADE | |
| `author_id` | uuid NOT NULL → auth.users | |
| `body` | text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 500) | |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz NULL | |

- Sin `parent_id`, así que no hay hilos.
- Índice `(post_id, created_at)`.
- Trigger: `comment_count` + notificación al autor del post. Sin puntos.

### 4.7 `social_activity` — líneas de actividad ("Carlos · nuevo récord")

Actividad breve que **no es un post**: no tiene likes ni comentarios. La escriben triggers del servidor, nunca el cliente.

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
- Retención: 30 días (Q9). Un job diario borra lo anterior.

### 4.8 Rutinas compartidas (SOCIAL_04) — sin tabla nueva

- **Compartir** = un `social_posts` con `type = 'routine'` y la instantánea de ejercicios en `attachment`.
- **Guardar rutina** = RPC `save_shared_routine(post_id)`:
  1. comprueba `can_view_post(post_id)` y `share_routines` del autor;
  2. crea un `workout_templates` del usuario con `created_by = auth.uid()`, `is_public = false` y `source = 'shared'`, más sus `template_exercises` a partir de la instantánea;
  3. devuelve el id de la copia.

  La copia es "Tuya" y editable sin tocar la original (handoff §5).

Cambios en `workout_templates` (los únicos sobre tablas existentes):

| Columna nueva | Tipo | Notas |
|---|---|---|
| `copied_from_post_id` | uuid NULL → social_posts ON DELETE SET NULL | de qué publicación se guardó |
| `copied_from_user_id` | uuid NULL → auth.users ON DELETE SET NULL | "Compartida por Mateo" en la copia |

- **`UNIQUE (created_by, copied_from_post_id)`**: guardar dos veces la misma publicación devuelve la copia existente (`ON CONFLICT (created_by, copied_from_post_id) DO NOTHING`). Postgres permite varias filas con `NULL`, así que no afecta a las rutinas normales.
- Nuevo valor `'shared'` en `workout_templates.source` y en `WorkoutSourceType` de la app [verificar si `source` tiene CHECK en backend].
- Por qué instantánea y no leer la plantilla original: no hay que abrir las políticas de `workout_templates` a los amigos, y lo guardado es exactamente lo que se compartió aunque el autor la edite o la borre después.
- "Empezar" desde la rutina compartida: guarda la copia y empieza la sesión sobre ella. Así `workout_sessions.workout_id` siempre apunta a una plantilla propia.

### 4.9 Retos sociales (SOCIAL_07 a SOCIAL_12)

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
| `goal` | int NOT NULL CHECK (goal > 0) | Rangos por métrica del prototipo: entrenos 1–14, fuerza 1–10, minutos 30–900, reps 10–1000, hábitos 1–14, movilidad 15–300 (CHECK por métrica o validación en la RPC) |
| `duration_days` | int NOT NULL CHECK in (3, 7, 14) para `friends` | "3 días / 1 semana / 2 semanas" |
| `starts_at` | timestamptz NULL | En `friends`: NULL hasta que acepta el primer invitado ("El reto empieza cuando acepte alguien") |
| `ends_at` | timestamptz NULL | `starts_at + duration_days` |
| `status` | text NOT NULL CHECK in (`pending`,`active`,`completed`,`cancelled`) | |
| `allow_manual` | boolean NOT NULL DEFAULT false | SOCIAL_08 permite "Registra una serie hecha fuera de Athelete" en el oficial; en `friends` "se cuenta solo con lo que registráis en Athelete" |
| `points` | int NOT NULL DEFAULT 0 | Puntos al completarlo (Q1) |
| `badge_id` | text NULL | "Semana de tracción", "Constancia"… (nuevos `BadgeId`) |
| `cover_path` | text NULL | Foto del oficial (asset de la app o bucket) |
| `slug` | text NULL UNIQUE | Solo oficiales, para crearlos de forma idempotente desde el panel o seed |
| `created_at` | timestamptz | |

- Índices: `(kind, status, ends_at)` para el reto oficial vigente y `(creator_id)`.
- Los **oficiales los crea el equipo** (service role o panel), nunca un usuario.

#### `social_challenge_participants`

| Columna | Tipo | Notas |
|---|---|---|
| `challenge_id` | uuid → social_challenges ON DELETE CASCADE | |
| `user_id` | uuid → auth.users ON DELETE CASCADE | |
| `role` | text NOT NULL CHECK in (`creator`,`invited`,`joined`) | `joined` = oficial |
| `status` | text NOT NULL CHECK in (`invited`,`active`,`declined`,`left`,`completed`) | |
| `invited_by` | uuid NULL → auth.users | "Andrea te invita" |
| `progress` | int NOT NULL DEFAULT 0 | Suma cacheada de las aportaciones (trigger) |
| `joined_at`, `completed_at` | timestamptz NULL | |
| `final_rank_among_friends` | int NULL | Se fija al cerrar el reto (SOCIAL_12: "Primero de tus amigos en terminar") |
| `celebrated_at` | timestamptz NULL | Si ya vio la celebración |

- **PK `(challenge_id, user_id)`**. Invitar y unirse usan `ON CONFLICT (challenge_id, user_id) DO UPDATE SET status = …`, respaldado por la PK.
- Índices: `(user_id, status)` para "mis retos" y `(challenge_id, progress DESC)` para el ranking.
- Solo se puede invitar a **amigos** (la RPC lo comprueba).

#### `social_challenge_contributions`

Cada aporte de progreso, para poder recalcular y auditar.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `challenge_id`, `user_id` | uuid NOT NULL | FK compuesta → participants ON DELETE CASCADE |
| `amount` | int NOT NULL CHECK (amount > 0) | |
| `source` | text NOT NULL CHECK in (`workout_session`,`habit_day`,`manual`) | |
| `source_key` | text NOT NULL | `'session:'||id`, `'habit:'||participation_id||':'||date`, `'manual:'||gen_random_uuid()` |
| `occurred_at` | timestamptz NOT NULL | debe caer entre `starts_at` y `ends_at` (trigger) |
| `created_at` | timestamptz | |

- **`UNIQUE (challenge_id, user_id, source_key)`**: el trigger de sesiones inserta con `ON CONFLICT (challenge_id, user_id, source_key) DO NOTHING`. Si la sesión se marca completada dos veces, no suma dos veces. Los manuales llevan una clave única nueva, así que siempre insertan.
- Trigger `AFTER INSERT/DELETE`: recalcula `progress`. Si `progress >= goal` y no estaba completado, marca `completed`, notifica y otorga recompensa (§6.4).
- Manual: RPC `add_manual_contribution(challenge_id, amount)`. Solo si `allow_manual`, con `amount` entre 1 y 100 por registro y un máximo diario (Q6).

Lecturas por RPC (no hay `SELECT` libre de participantes ajenos):
- `get_challenge_board(challenge_id)`: devuelve **solo yo + mis amigos** con su progreso y posición relativa, y además `participants_total` (número sin nombres, "18.420 atletas"). Es lo que exige "comparación solo entre amigos".
- `get_my_challenges()`: lista para SOCIAL_07 (activos, invitaciones, completados recientes).

### 4.10 `social_notifications` — notificaciones sociales

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
- No se notifica al propio actor (`actor_id <> recipient_id`).
- La pantalla Notificaciones actual mezclará estas filas con los nudges de ELLIE ("actividad social nueva", MIGRATION_PROGRESS §3). Push: fuera de alcance (Q10).

---

## 5. Identidad y perfil social

### 5.1 No se abre `profiles`

`profiles` tiene peso, fecha de nacimiento, género y metas de nutrición. Sus políticas actuales no están en el repo [verificar]; lo razonable es que sean "solo el dueño", y **deben seguir así**. Para mostrar a otros usuarios se usa una vista con lo mínimo:

`social_profiles` (vista `security_invoker = false`, propiedad de un rol sin login, o RPC equivalente):

| Columna | Origen |
|---|---|
| `id`, `name`, `avatar_key`, `profile_photo_url` | `profiles` |
| `goal` | `profiles.goal` (SOCIAL_06 lo muestra; la vista previa de SOCIAL_14 dice "tu nombre, tu objetivo y tu racha") |
| `weight` | `profiles.weight` **solo si** `share_body_weight` y el visitante puede verlo; si no, NULL |

Filtro de la vista: el visitante es el dueño, o es amigo, o el usuario es `discoverable`. Solo ese caso permite verlo en la búsqueda (nombre y avatar).

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
| `hidden_categories` | lista de lo que no comparte | para la línea "Carlos no comparte peso corporal ni nutrición." |

Si no es amigo y su `audience = 'friends'`: solo nombre, avatar, objetivo, racha (la vista previa de SOCIAL_14 la incluye siempre) y el botón Agregar.

---

## 6. Contenido que genera la app y cuándo

Principio: **la app prepara, el usuario publica**.
- Los **posts** siempre los crea el usuario: la publicación "llega preparada" (SOCIAL_13) y él toca Publicar.
- Las **líneas de actividad** sí son automáticas, respetando la privacidad.
- El **progreso de retos** se suma solo.

Ver Q5 si se quiere publicación automática.

### 6.1 Disparadores

| Evento | Dónde ocurre hoy | Qué genera | Cómo |
|---|---|---|---|
| **Entreno completado** | `completeWorkoutSession` (`fitness.ts`): `workout_sessions.status → 'completed'` | 1) Línea `workout_completed`. 2) Aportes a retos activos según la métrica: `workouts` +1; `strength_sessions` +1 si la plantilla es `type='strength'`; `minutes_trained` +`duration`; `mobility_minutes` +`duration` si `type='mobility'`. 3) En la app, la pantalla de fin de sesión ofrece "Compartir" → SOCIAL_13 con el adjunto | Trigger `AFTER UPDATE OF status ON workout_sessions WHEN NEW.status='completed' AND OLD.status<>'completed'`. Idempotente por `source_key` |
| **Récord personal** | `usePersonalRecords.addRecord` (manual) | Línea `record` (si `share_records`). En la app, toast "¿Compartir tu récord?" → composer con adjunto Récord | Trigger `AFTER INSERT ON personal_records` |
| **Logro** | `award_gamification_event` inserta en `user_badges` (BK-01) | Línea `badge` (si `share_achievements`). Opción de compartir desde Logros | Trigger `AFTER INSERT ON user_badges` |
| **Core 33 completado** | `core33.ts` → `challenge_participations.status → 'completed'` | Línea `core33_completed`. Post de logro "Core 33" ofrecido (SOCIAL_01 p4) | Trigger `AFTER UPDATE OF status ON challenge_participations` |
| **Día de hábitos Core 33** | `habit_logs` con los 3 hábitos del día completos | Aporte +1 a retos `core33_habit_days` | Trigger `AFTER INSERT/UPDATE ON habit_logs`: cuenta los 3 `completed` del día; `source_key = 'habit:'||participation_id||':'||date` |
| **Reto completado** | `social_challenge_participants.progress >= goal` | Línea `challenge_completed`; notificación a los demás participantes amigos; celebración SOCIAL_12; recompensa (Q1); "Compartir" → post `challenge` | Trigger de aportes (§4.9) |
| **Reto entre amigos cerrado** | `ends_at` pasado | `status='completed'`, fija `final_rank_among_friends` | Job programado cada hora (`pg_cron`) [verificar disponibilidad en el plan] |
| **Rutina compartida** | El usuario toca "Compartir" en una rutina propia | Post `routine` (no hay línea automática) | RPC `create_post` |

### 6.2 Deshacer

- **Borrar un récord** (la app lo permite): borra su línea de actividad (trigger `AFTER DELETE`). El post, si lo hubo, conserva la instantánea y queda con `personal_record_id = NULL` (Q8).
- **Sesión cancelada después de completada** (no ocurre hoy): el trigger `AFTER UPDATE` borra los aportes con su `source_key`.

### 6.3 Lo que el diseño muestra y hoy no se puede calcular

| Dato del diseño | Pantalla | Falta | Mientras tanto |
|---|---|---|---|
| Volumen "9.120 kg" | SOCIAL_01 p2, SOCIAL_13 | Series/peso por ejercicio en la sesión | Ocultar la métrica (o mostrar calorías, que sí existen) |
| "Récord si lo hubo" en el entreno | SOCIAL_13 | Detección de récords en sesión | Enlazar un récord registrado a mano el mismo día durante esa sesión |
| Reto "Repeticiones de un ejercicio" / "100 dominadas" automático | SOCIAL_08, SOCIAL_11 | Repeticiones por ejercicio | Solo con `allow_manual` (Q6) |
| Ejercicios "6 de 6" | SOCIAL_13 | — | Sí existe: `completed_exercises.length` / `total_exercises` |

### 6.4 Puntos y badges

- Nunca por likes, comentarios, publicar ni agregar amigos.
- Solo, si se aprueba (Q1), al **completar un reto**: `award_gamification_event('social_challenge_completed', reference = challenge_id||':'||user_id, points = challenge.points, badge_ids = [challenge.badge_id])`.
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

Hoy cada usuario solo firma su propia ruta `{userId}/avatar`. Sus políticas no están en el repo [verificar]. Para Comunidad hace falta añadir un `SELECT` en `profile-photos` cuando el visitante puede ver `social_profiles` de ese usuario (amigo o `discoverable`). **Es el único cambio sobre un recurso existente fuera de `workout_templates`.**

---

## 8. RLS por tabla

Funciones de apoyo (`STABLE SECURITY DEFINER`, `search_path = public`):
- `are_friends(a, b)`: busca por PK en `friendships`.
- `can_see_category(owner, category)`: `owner = auth.uid()` **o** (`are_friends(auth.uid(), owner)` **o** `audience(owner) = 'public'`) **y** el interruptor de esa categoría está activo.
- `can_view_post(post_id)`: post no borrado **y** (`author = auth.uid()` **o** ((`are_friends` **o** `post.audience = 'public'`) **y** `can_see_category(author, category_of(type))`)).

Las categorías por tipo son: `workout` → workouts, `record` → records, `achievement` / `challenge` → achievements y `routine` → routines.

La privacidad se evalúa **al leer**: si apago "Récords", mis récords anteriores dejan de verse (Q2b).

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `social_settings` | dueño | dueño (o RPC `ensure_social_settings`) | dueño | — (cascade con la cuenta) |
| `friend_requests` | remitente o receptor | **solo RPC** | **solo RPC** | — |
| `friendships` | si `auth.uid()` es uno de los dos | **solo RPC** (`respond_friend_request`) | — | uno de los dos |
| `social_posts` | `can_view_post(id)` | **solo RPC** `create_post` | autor, y solo `body`/`edited_at` (trigger que bloquea el resto de columnas) | autor (borrado lógico vía UPDATE de `deleted_at`, o RPC) |
| `social_post_likes` | si `can_view_post(post_id)` (para el contador y "le gustó a…") | `user_id = auth.uid()` **y** `can_view_post(post_id)` | — | `user_id = auth.uid()` |
| `social_post_comments` | `can_view_post(post_id)` **y** no borrado | `author_id = auth.uid()` **y** `can_view_post(post_id)` | autor (solo `body`) | autor del comentario **o** autor del post (borrado lógico) |
| `social_activity` | `can_see_category(user_id, category)` **y** (`are_friends` o es mía) — la actividad es solo para amigos, nunca pública | **nadie** (solo triggers) | nadie | nadie (triggers y job de retención) |
| `social_challenges` | oficiales: cualquier autenticado; `friends`: participantes (cualquier estado, incluido `invited`) | `friends`: **solo RPC** `create_friend_challenge` (comprueba que todos los invitados son amigos); oficiales: service role | **solo RPC** (cancelar: el creador mientras está `pending`) | — |
| `social_challenge_participants` | la propia fila; y filas de **amigos** en retos donde yo participo. Rankings y total por RPC | **solo RPC** (invitar, unirse) | **solo RPC** (aceptar, rechazar, abandonar, `celebrated_at`) | — |
| `social_challenge_contributions` | las propias | **solo** triggers y RPC `add_manual_contribution` | nadie | propias **manuales** en las últimas 24 h (corregir un error) |
| `social_notifications` | `recipient_id = auth.uid()` | **nadie** (triggers) | destinatario, solo `read_at` | destinatario |
| `workout_templates` (cambio) | **sin cambios** en sus políticas | la copia la crea la RPC `save_shared_routine` | igual que hoy (la copia es del usuario) | igual que hoy |

"Solo RPC" = sin política de `INSERT`/`UPDATE` para `authenticated`; la escritura la hace la función `SECURITY DEFINER` tras sus comprobaciones.

---

## 9. Restricciones únicas y su `ON CONFLICT` (lección de BK-01)

| Escritura | `ON CONFLICT` | Restricción que lo respalda |
|---|---|---|
| Crear `social_settings` | `(user_id) DO NOTHING` | PK `social_settings(user_id)` |
| Crear amistad | `(user_low, user_high) DO NOTHING` | PK `friendships(user_low, user_high)` |
| Publicar | `(author_id, source_key) DO NOTHING` | `UNIQUE social_posts(author_id, source_key)` |
| Like | `(post_id, user_id) DO NOTHING` | PK `social_post_likes(post_id, user_id)` |
| Línea de actividad | `(user_id, kind, ref_key) DO NOTHING` | `UNIQUE social_activity(user_id, kind, ref_key)` |
| Invitar / unirse a reto | `(challenge_id, user_id) DO UPDATE` | PK `social_challenge_participants(challenge_id, user_id)` |
| Aporte automático a reto | `(challenge_id, user_id, source_key) DO NOTHING` | `UNIQUE social_challenge_contributions(challenge_id, user_id, source_key)` |
| Notificación | `(recipient_id, dedupe_key) DO NOTHING` | `UNIQUE social_notifications(recipient_id, dedupe_key)` |
| Guardar rutina compartida | `(created_by, copied_from_post_id) DO NOTHING` | `UNIQUE workout_templates(created_by, copied_from_post_id)` |
| Reto oficial (seed) | `(slug) DO UPDATE` | `UNIQUE social_challenges(slug)` |
| Solicitud pendiente | **sin `ON CONFLICT`**; la RPC comprueba antes | índice único parcial (protección) |

Prueba obligatoria antes de dar por buena la migración: un test SQL (pgTAP o script) que ejecute cada `ON CONFLICT` de la tabla dos veces seguidas y compruebe que la segunda no falla.

---

## 10. Orden de implementación sugerido (cuando se apruebe)

1. **Prerrequisito: BK-01** (arreglar `award_gamification_event`) y BK-02 (regenerar tipos).
2. `social_settings`, `friend_requests`, `friendships`, vista `social_profiles`, política de lectura en `profile-photos` → pantallas Amigos, Perfil de amigo y Privacidad.
3. `social_posts`, likes, comentarios, bucket `social-photos`, `social_notifications` → Feed, Crear publicación, Publicación y comentarios, Compartir entreno.
4. Columnas en `workout_templates` + `save_shared_routine` → Rutina compartida.
5. `social_activity` y triggers en `workout_sessions` / `personal_records` / `user_badges` / `challenge_participations`.
6. Retos: tablas, triggers de aportes, `get_challenge_board`, job de cierre → Retos, Oficial, Entre amigos, Invitación, Crear reto y Completado.

Cada paso es una migración aparte, con su prueba de RLS: un usuario A, su amigo B y un extraño C, y qué ve cada uno.

---

## 11. Fuera de alcance de esta propuesta (señalado para no olvidarlo)

- **Moderación**: reportar posts o comentarios, bloquear usuarios, revisar fotos. El handoff no lo incluye, pero una red con fotos y comentarios lo necesita antes de abrirse al público (Q11).
- Push notifications (APNs/FCM) y su preferencia por tipo.
- Límites de frecuencia (publicaciones, comentarios y solicitudes por hora) en las RPC.
- Exportar o borrar datos sociales a petición (GDPR): con `ON DELETE CASCADE` el borrado de cuenta ya los elimina.
- Búsqueda por similitud de nombre (`pg_trgm`) si `ILIKE` se queda corto.

---

## 12. Preguntas de producto (necesito tu decisión)

| # | Pregunta | Opciones | Mi recomendación |
|---|---|---|---|
| Q1 | **Puntos en retos sociales.** El diseño muestra +150 (oficial), +80 (entre amigos) y +100 (completado), pero la decisión 8 dice "No hay puntos por social" | a) Sin puntos en retos sociales · b) Puntos solo en el reto oficial · c) Puntos en ambos (como el diseño) | b): el oficial lo controla el equipo; entre amigos se podrían inflar con retos fáciles |
| Q2 | **Audiencia "Público".** ¿Dónde ve un no-amigo el contenido público? El feed es "de amigos" | a) Solo en el perfil de esa persona (desde búsqueda o retos) · b) Además, un feed público · c) Quitar "Público" de momento | a) |
| Q2b | Al **apagar una categoría** (p. ej. Récords), ¿se ocultan también las publicaciones anteriores? | a) Sí, se aplica al leer · b) No, solo a lo nuevo | a) (es lo que espera alguien que protege su privacidad) |
| Q3 | **Búsqueda.** Con "Solo amigos" el diseño dice "cualquiera puede encontrarte por tu nombre". ¿Añadimos un interruptor "Aparecer en búsquedas"? | a) Siempre buscable · b) Interruptor (nuevo, no está en el diseño) | b), por defecto activado |
| Q4 | **¿Publicación sin adjunto?** El composer siempre tiene un adjunto elegido | a) Adjunto obligatorio · b) Permitir solo texto (y foto) | a): "la comunidad gira alrededor del entrenamiento real" |
| Q5 | **¿Publicación automática?** Al terminar un entreno o conseguir un récord, ¿se publica solo o se prepara para que el usuario toque Publicar? | a) Siempre lo publica el usuario (las líneas de actividad sí son automáticas) · b) Auto-publicar con opción de desactivarlo | a) |
| Q6 | **Retos de repeticiones y registro manual.** Sin series en la sesión no hay reps automáticas. ¿Activamos el registro manual ("Registra una serie hecha fuera de Athelete")? | a) Solo en oficiales, con tope por registro y día · b) También entre amigos · c) Ocultar los retos de repeticiones hasta tener series (fase 7) | a) para el oficial y c) para "entre amigos" |
| Q7 | **Volumen en "Compartir entreno".** Sin pesos por serie no hay kg | a) Ocultar volumen · b) Mostrar calorías en su lugar · c) Esperar a tener series | b) |
| Q8 | **Borrar un post / borrar su origen.** Si borro el récord o la sesión, ¿el post sigue con su instantánea? Si borro el post, ¿se borran sus comentarios? | a) El post sigue; borrar el post lo oculta con comentarios y likes · b) Borrar el origen borra el post | a) |
| Q9 | **Retención de la actividad breve** ("Carlos · nuevo récord") | 7 / 30 / 90 días | 30 días |
| Q10 | **Notificaciones push** para solicitudes, comentarios e invitaciones a retos | a) Solo dentro de la app por ahora · b) Push desde el inicio | a), push en una fase posterior |
| Q11 | **Moderación mínima** antes de lanzar: ¿reportar y bloquear? | a) Sí, mínimo "Reportar" y "Bloquear" · b) No en la primera versión | a): tabla `user_blocks` + `content_reports` y filtro en las 3 funciones de visibilidad |
| Q12 | **"Permitir solicitudes" apagado**: ¿nadie puede enviarme solicitud, o solo quien comparte un reto conmigo? | a) Nadie · b) Solo personas de mis retos | a) |
| Q13 | **"Personas de tus retos" como sugerencia** (SOCIAL_05) muestra participantes del reto oficial que no son amigos. ¿Es aceptable mostrar su nombre? | a) Solo si son `discoverable` y permiten solicitudes · b) No sugerir | a) |
| Q14 | **Nutrición en el perfil de amigo.** SOCIAL_06 dice "no comparte peso corporal ni nutrición", pero no hay interruptor de nutrición | a) La nutrición nunca se comparte (sin interruptor) · b) Añadir interruptor | a) |
| Q15 | **Rutinas editoriales o de ELLIE**: ¿se pueden compartir rutinas de la biblioteca o generadas por ELLIE, o solo las propias? | a) Solo las propias · b) Cualquiera que el usuario pueda abrir | b): la copia se hace desde la instantánea y no expone nada nuevo |
| Q16 | **Reto entre amigos sin aceptar**: si nadie acepta, ¿cuándo caduca la invitación? | 48 h / al pasar la duración elegida | 48 h |
