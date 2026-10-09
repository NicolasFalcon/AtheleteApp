Esta revisión fue solo de lectura y no cambié nada. Los JSON siguen la forma exacta que arma cada función hoy; los valores son de ejemplo.

Comportamiento común
- Todas piden sesión. Las que validan sesión dentro de la función (get_social_profile, get_challenge_board, create_post, ensure_social_settings) responden sin sesión con la excepción not_authenticated (P0001 / HTTP 400).
- Sin permiso no hay error: las funciones devuelven null, [] o simplemente no incluyen la fila. Nunca distinguen entre "no existe" y "no puedes verlo".
- Las rutas de fotos (photo_path, profile_photo_url) son rutas de almacenamiento, no direcciones web. La app debe pedir una URL firmada para mostrarlas.

---

get_social_profile(_user_id) json
{
"user_id": "7d14…", "username": "falcon", "name": "Nico", "avatar_key": "lion",
"profile_photo_url": "7d14…/avatar", "goal": "gain_muscle",
"relationship": "friends", "accepts_requests": true, "streak_days": 4, "audience": "friends",
"hidden_categories": ["nutrition", "body_weight"],
"friends_since": "2026-10-01T12:00:00Z",
"sessions_total": 35, "badges_total": 6,
"records": [
 {"exercise_name":"Press banca","pr_type":"max_weight","value_weight":80,"value_reps":null,"unit":"kg","recorded_at":"2026-10-06T18:10:00Z"}
],
"weight": 78.5,
"recent_posts": [ /* hasta 2 posts, mismo formato que el feed (sección 4) */ ]
}
relationship puede ser self, friends, request_sent, request_received o none.
hidden_categories siempre incluye nutrition.
Perfil limitado: si no sois amigos y su audiencia es friends, solo llegan los campos desde user_id hasta hidden_categories.
Claves opcionales, según relación y privacidad:
friends_since: solo si sois amigos.
sessions_total, badges_total y records: no aparecen si esa categoría no se comparte.
records: como máximo 3 y los más recientes. Llega [] si no hay.
weight: solo para ti mismo o si comparte el peso.
recent_posts: llega [] si no hay posts.
profile_photo_url llega null si no puedes ver su identidad.
Devuelve null si hay bloqueo, si el usuario no existe, o si no tiene configuración social y no sois amigos.

get_social_profiles(_user_ids uuid[]) Devuelve filas, no un objeto JSON: json
[{"id":"7d14…","username":"falcon","name":"Nico","avatar_key":"lion","profile_photo_url":"7d14…/avatar","goal":"maintain","weight":null}]
weight solo llega si eres tú o si la persona comparte su peso.
Los ids que no puedes ver se omiten sin error. Si no ves a nadie, devuelve [].

get_friend_activity(_limit = 30)
Límite entre 1 y 100.
Solo amigos, sin bloqueo, en categorías que comparten y de los últimos 30 días. json
[{"id":"…","user_id":"7d14…","kind":"workout_completed","summary":{"title":"Push Day","duration_min":45},
"created_at":"2026-10-07T17:00:00Z","user":{"username":"falcon","name":"Nico","avatar_key":"lion"}}]
Sin datos devuelve [].
Aquí user no trae profile_photo_url; para la foto hay que usar get_social_profiles.

Feed: get_feed(_limit = 20, _before = null)
Límite entre 1 y 50.
Para paginar, pasa en _before el created_at del último post recibido.
Incluye tus posts y los de tus amigos. Los posts públicos de no amigos no aparecen en el feed. json
[{"id":"…","author_id":"…","type":"workout","body":"Buen día","photo_path":"uid/postid/a.jpg",
"photo_width":1080,"photo_height":1350,"audience":"friends",
"attachment":{"title":"Push Day","duration_min":45,"exercises_done":5,"exercises_total":6,"workout_type":"strength",
  "calories":320,"volume_kg":6000,"record":{…},"prs_count":2,
  "top_pr":{"exercise":"Press banca","exercise_id":"…","pr_type":"max_weight","value_weight":80,"value_reps":null,"unit":"kg"}},
"like_count":3,"comment_count":1,"created_at":"…","edited_at":null,"liked_by_me":true,
"author":{"username":"falcon","name":"Nico","avatar_key":"lion","profile_photo_url":"…"}}]
Sin datos devuelve [].
photo_path llega null si el autor dejó de compartir fotos.
El attachment cambia según el tipo de post:
record: exercise_id, exercise_name, pr_type, value, reps, unit, previous_best, delta.
routine: title, difficulty, duration_min, type, exercises[].
achievement: badge_id, title, icon. Para Core 33 es {kind:"core33", days_completed:33}.
challenge: title, metric, goal, final_value, rank_among_friends, badge_id, points.
photo: null.

Detalle de post con comentarios No hay una función para esto: se lee directo de las tablas y el servidor filtra.
Post: select * from social_posts where id = X. Llegan las columnas de la tabla, sin author ni liked_by_me.
Recomendación sin aplicar: si la app necesita el mismo formato que el feed, se puede añadir get_post(_id).
Sin permiso, o si el post está borrado, oculto, retirado o lo reportaste, devuelve 0 filas.
Comentarios: select id, author_id, body, created_at from social_post_comments where post_id = X order by created_at. json
[{"id":"…","author_id":"…","body":"💪","created_at":"…"}]
Llega [] si no hay comentarios o no puedes ver el post.
No aparecen comentarios borrados, ocultos, retirados, que reportaste o de usuarios bloqueados.
Los datos de los autores se piden con get_social_profiles.

get_challenge_board(_challenge_id) json
{"challenge":{"id":"…","kind":"friends","title":"…","metric":"workouts","goal":10,"duration_days":14,
"starts_at":"…","ends_at":"…","status":"active","points":0,"badge_id":null, "...":"resto de columnas"},
"participants_total":5,
"board":[{"user_id":"…","is_me":true,"progress":4,"status":"active","completed_at":null,
"username":"falcon","name":"Nico","avatar_key":"lion","profile_photo_url":"…"}]}
board solo incluye a ti y a tus amigos sin bloqueo, con estados active, completed o invited. Va ordenado por progreso.
participants_total cuenta a todos los participantes active o completed.
Devuelve null si el reto no existe, o si es entre amigos y no participas en él.

Lista de retos: get_my_challenges() json
{"active":[{ /* columnas del reto */ "my_progress":4,"my_status":"active"}],
"invitations":[{ /* reto */ "invited_by":"uuid"}],
"recently_completed":[{ /* reto */ "my_progress":10,"final_rank_among_friends":1,"celebrated_at":null}],
"official":[{ /* retos oficiales activos */ }]}
Las cuatro listas siempre existen: llegan [] si están vacías.
invitations solo incluye invitaciones pendientes y no caducadas.
recently_completed cubre los últimos 30 días.
official también trae retos a los que todavía no te has unido. Para saber si participas, compara con active.

Notificaciones No hay una función para esto: se leen directo de la tabla y cada usuario solo ve las suyas.
Lista: select * from social_notifications order by created_at desc. json
[{"id":"…","recipient_id":"…","actor_id":"…","type":"post_liked","post_id":"…","comment_id":null,
"challenge_id":null,"request_id":null,"dedupe_key":"…","read_at":null,"created_at":"…"}]
Llega [] si no hay notificaciones.
No leídas: consultar con read_at is null y conteo.
Marcar como leída o borrar: UPDATE read_at o DELETE. Sobre una notificación ajena afecta 0 filas, sin error.

create_post(_type, _source_id, _body, _photo_path, _photo_width, _photo_height) json
{"ok":true,"created":true,"post_id":"uuid"}
Si repites la misma fuente, devuelve {"ok":true,"created":false,"post_id":"<el mismo>"}.
Errores, con forma {"ok":false,"error":…}:
| Error | Cuándo |
|---|---|
| invalid_type | El tipo no es workout, record, routine, achievement, challenge ni photo |
| category_not_shared | El usuario no comparte esa categoría |
| photo_not_allowed | Hay foto en un tipo que no es workout ni photo |
| photos_not_shared | El usuario no comparte fotos |
| photo_not_owned | La ruta de la foto no empieza por su uid |
| invalid_source | El _source_id no es un uuid válido |
| source_not_found | La sesión no está completada o no es suya; o el récord, el logro, el Core 33 completado o el reto completado no existe |
| routine_not_shareable | La rutina es ajena, creada por IA o una copia |
| photo_required | Post de tipo photo sin foto |

---

ensure_social_settings(_username) cuando la fila ya existe
Devuelve {"created":false,"username":"<el actual>"}.
- No cambia nada. Ignora el _username que envíes y ni siquiera lo valida. Para cambiar el nombre de usuario hay que usar set_username.
- Si la fila no existe:
  - Creada: {"created":true,"username":"…"}. El nombre se guarda en minúsculas y sin espacios alrededor.
  - Nombre no válido: {"created":false,"error":"invalid_username"}. Se aceptan de 3 a 24 caracteres entre a-z, 0-9, _ y ..
  - Nombre ocupado: {"created":false,"error":"username_taken"}.

Aplicado y probado. La prueba llegó al final (ROLLBACK_OK) con todas las comprobaciones pasadas y sin dejar nada guardado.

Resumen para la app — get_post(_id uuid)
- Devuelve una fila con el mismo formato que get_feed: campos del post, author, attachment, contadores y liked_by_me.
- Visibilidad idéntica al feed: autor o amigo, sin bloqueo, y post no borrado/oculto/retirado. En cualquier otro caso devuelve null (no hay error de permiso).
- Sin sesión: excepción not_authenticated (P0001 / HTTP 400).
- Solo ejecutable por usuarios con sesión (revocado para anónimos).

Pruebas: el autor vio su post con liked_by_me: false ✓; un usuario sin amistad recibió null ✓; tras marcar el post como borrado, el autor también recibió null ✓. No pude probar el caso "amigo lo ve" porque no hay amistades en la base de datos, pero usa exactamente la misma condición are_friends que get_feed, ya probada antes.


Respuesta completa, solo lectura, sin aplicar nada.

RETOS (W5)

`create_friend_challenge(_metric text, _goal int, _duration_days int, _invitee_ids uuid[])`
- Métricas válidas y rangos de meta:
  - `workouts`: 1–14 · `strength_sessions`: 1–10 · `minutes_trained`: 30–900 · `core33_habit_days`: 1–14 · `mobility_minutes`: 15–300. (`exercise_reps` no existe — rechazada.)
- Duraciones válidas: solo `3`, `7` o `14`.
- Invitados: todos deben ser amigos del creador, sin bloqueo, y no puede invitarse a sí mismo.
- OK → `{"ok":true,"challenge_id":"<uuid>","title":"3 entrenamientos en 1 semana"}` (el reto queda `pending` con `invite_expires_at` = ahora + 7 días; el creador entra `active`).
- Errores (HTTP 200, `ok:false`): `invalid_metric`, `goal_out_of_range` (incluye `min`/`max`), `invalid_duration`, `no_invitees`, `invitee_not_friend` (incluye `user_id`). Sin sesión → excepción `not_authenticated` (HTTP 400).

`respond_challenge_invite(_challenge_id uuid, _accept boolean)`
- Requiere tener participación `invited` en ese reto.
- Aceptar → `{"ok":true,"status":"active"}`: el reto pasa a `active`, `starts_at=now()`, `ends_at=now()+duration_days`; los demás invitados quedan `expired`; cada participante activo recibe notificación `challenge_started`.
- Rechazar → `{"ok":true,"status":"declined"}`.
- Errores: `no_invite` (no existe o no fuiste invitado), `invite_expired` (vencida o el reto ya no está `pending`; tu participación queda `expired`).

`leave_challenge(_challenge_id uuid)` → `{"ok":true|false}` (`ok:false` si no tenías participación `active`). Solo cambia TU fila a `left`; el reto sigue.

`cancel_friend_challenge(_challenge_id uuid)` → `{"ok":true|false}`. Solo el creador, solo retos entre amigos en `pending`: reto → `cancelled`, invitados → `expired`, y borra las notificaciones `challenge_invite` del reto. Un reto ya `active` no se puede cancelar con esta RPC.

`join_official_challenge(_challenge_id uuid)` → `{"ok":true}`. Solo retos `kind='official'`, `status='active'` y no vencidos. Error: `not_available`. Si ya habías salido (`left`), reactiva tu participación; si estabas `completed`, no la toca.

`add_manual_contribution(_challenge_id uuid, _amount int)`
- Solo retos con `allow_manual=true`, `active`, y tú participante `active`. `_amount` entre 1 y 100.
- OK → `{"ok":true,"contribution_id":"<uuid>","progress":12}`.
- Errores: `amount_out_of_range`, `not_allowed` (reto sin aporte manual, no activo o no participas), `daily_limit` (máx. 300 manuales/día; incluye `remaining`).

`mark_challenge_celebrated(_challenge_id uuid)`
- Pone `celebrated_at=now()` (con `COALESCE`, no sobrescribe si ya estaba) en tu fila si tu participación está `completed`.
- OK → `{"ok":true}`; si no cumples la condición `{"ok":false}`. Idempotente.

Consulta de retos: `get_my_challenges()` → `{active, invitations, recently_completed, official}` y `get_challenge_board(_challenge_id)` → `{challenge, participants_total, board}` (ranking solo con tú y tus amigos).

NOTIFICACIONES (W6)

Valores de `type` y campos que llenan (la tabla está vacía ahora; esto sale de los triggers y funciones que las crean):

| type | Llenado | Cuándo |
|---|---|---|
| `post_like` | `post_id`, `actor_id` | Alguien da me gusta a tu post (se borra si quita el like) |
| `post_comment` | `post_id`, `comment_id`, `actor_id` | Comentario en tu post |
| `friend_request` | `request_id`, `actor_id` | Solicitud de amistad recibida (se borra si se cancela/declina) |
| `friend_accepted` | `request_id` (o nada, por invitación de enlace), `actor_id` | Tu solicitud aceptada, o alguien canjeó tu enlace |
| `challenge_invite` | `challenge_id`, `actor_id` | Te invitan a un reto entre amigos (se borra si el creador cancela) |
| `challenge_started` | `challenge_id`, `actor_id` | Otro invitado aceptó y el reto arrancó |
| `content_removed` | `actor_id` NULL | Moderación retiró tu post o comentario |

Todos llevan `dedupe_key` (UNIQUE con `recipient_id`) y `read_at` NULL hasta que se lee.

No existe RPC "marcar todas como leídas". Se marca directo con RLS: `UPDATE social_notifications SET read_at = now() WHERE recipient_id = auth.uid() AND read_at IS NULL` (una o en lote; la política solo permite escribir sobre tus filas).

MODERACIÓN (W7)

Leer la cola: vista `moderation_queue` (security_invoker, así aplican las RLS de las tablas base; solo un moderador ve filas porque `content_reports` solo lee al dueño del reporte o moderadores). Una fila por contenido con reportes abiertos:
`target_type, target_id, author_id, author_username, body, photo_path, post_type, post_id, open_reports, reasons[], first_reported_at, last_reported_at, hidden_at, removed_at, author_prior_removals`.
Ordenada: primero lo no oculto, más reportes primero. Un no-moderador obtiene 0 filas (o error de permiso si consulta tablas directas).

`moderate_content(_target_type text, _target_id uuid, _action text, _note text DEFAULT NULL)`
- Acciones válidas: `restore`, `remove`, `dismiss`.
- `post`/`comment`: solo `restore`/`remove` (`dismiss` → `invalid_action_for_content`). `user`: solo `dismiss` (`remove` → `invalid_action_for_user`).
- `remove`: marca `removed_at` en post/comentario, borra sus likes/notificaciones, cierra reportes como `actioned` y notifica al autor (`content_removed`). `restore`: quita `hidden_at`, cierra reportes como `dismissed`. `dismiss` (user): cierra los reportes sobre ese usuario.
- Siempre registra en `moderation_actions`. OK → `{"ok":true}`. Errores: `invalid_arguments`; sin ser moderador → excepción `not_moderator` (HTTP 400).

Historial: `SELECT * FROM moderation_actions ORDER BY created_at DESC` — legible solo por moderadores (política `is_moderator()`); un usuario normal no obtiene filas.