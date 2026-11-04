# Comunidad abierta · backend

## Inventario previo

Este archivo no existía en el checkout al iniciar el cambio. El modelo social vigente está en las migraciones `20261001052753`, `20261001052958`, `20261001053145`, `drizzle/0006`, `drizzle/0009` y `drizzle/0024`.

| Área | Implementación existente reutilizada |
| --- | --- |
| Posts y feed de amigos | `social_posts`, `create_post`, `get_post`, `get_feed`, `get_user_posts`, `social_post_json`, `can_view_post`. El feed antiguo sigue siendo de amigos. |
| Amistad | `friend_requests`, `friend_invites`, `friendships`; `send_friend_request`, `respond_friend_request`, `cancel_friend_request`, `remove_friend`, `are_friends`, `social_relationship`. |
| Reacciones y comentarios | `social_post_likes`, `social_post_comments`, conteos en `social_posts.like_count/comment_count`, `delete_comment`. |
| Bloqueo | `user_blocks`, `is_blocked`, `block_user`. |
| Reportes y moderación | `content_reports`, ocultamiento automático tras tres reportes abiertos distintos, `app_moderators`, `moderate_content`, `moderation_actions`, `moderation_queue`. |
| Rutas | `route_activities.track` guarda el original; `route_trim` y `route_shared_track` recortan 200 m de cada extremo. |
| Push | `social_notifications` → `push_outbox` mediante trigger; `push_category_enabled` y `push_next_allowed_at` aplican preferencias y silencio; `send-push` envía por APNs. |

## Seguimiento y perfil público

`follows(follower_id,followee_id,created_at)` tiene PK compuesta y prohíbe seguirse a sí mismo. El cliente solo puede leer las relaciones en las que participa; escribe mediante RPC. Los conteos de cualquier perfil de la comunidad se leen por `get_community_profile`.

| RPC | Respuesta principal |
| --- | --- |
| `follow_user(p_user_id uuid)` | `{ "ok": true, "following": true, "created": true }` |
| `unfollow_user(p_user_id uuid)` | `{ "ok": true, "following": false, "deleted": true }` |
| `get_community_profile(p_user_id uuid)` | `{ "ok": true, "profile": { ... } }` |

`follow_user` y `unfollow_user` son idempotentes: un segundo follow devuelve `created:false`; un segundo unfollow devuelve `deleted:false`. Bloquear elimina los follows en ambos sentidos; desbloquear no los restaura. La amistad mantiene su flujo de solicitud y aprobación.

Ejemplo de perfil: `{ "ok": true, "profile": { "id": "<uuid>", "username": "atleta", "name": "Ana", "avatar_key": null, "profile_photo_url": null, "is_private": false, "followers_count": 12, "following_count": 8, "is_following": true, "is_friend": false, "friend_request_status": "sent" } }`. `friend_request_status` vale `sent`, `received` o `null`.

La política existente de `profile-photos` sigue usando `can_view_profile_photo`; esta función permite el avatar de perfiles comunitarios no privados aunque aún no tengan posts.

Un follow nuevo inserta una notificación `new_follower`. Su trigger existente la encola en `push_outbox` solo si la categoría `social` está activada y calcula `not_before` con las horas de silencio. `send-push` muestra «X empezó a seguirte». Desplegar esa Edge Function después de la migración.

## Visibilidad y publicación

`social_posts.visibility` admite `public` o `friends`, con default `public`. **Todas las filas anteriores a la migración quedan `friends`**, incluso si el viejo `audience` dice `public`. `create_post` conserva su comportamiento de amigos para la app actual. El cliente nuevo usa:

`create_community_post(p_type text, p_source_id text DEFAULT NULL, p_body text DEFAULT NULL, p_photo_path text DEFAULT NULL, p_photo_width int DEFAULT NULL, p_photo_height int DEFAULT NULL, p_visibility text DEFAULT 'public') → jsonb`.

Esta RPC reutiliza las validaciones y la idempotencia de `create_post`. Devuelve `{ "ok": true, "created": true, "post_id": "<uuid>", "visibility": "public" }`. Para publicar en público exige `profiles.community_guidelines_accepted_at`. `accept_community_guidelines() → { "ok": true, "accepted_at": "<timestamp>" }` registra la aceptación una sola vez. `profiles.is_private` vale `false` por defecto y lo puede actualizar el dueño; cuando es `true`, sus posts no aparecen en el feed abierto.

`can_view_post` mantiene los filtros de bloqueo, categoría compartida, reporte propio y moderación, y permite ver posts públicos. `get_post` abre también posts públicos visibles. `get_feed` y `get_user_posts` conservan sus firmas.

## Feeds nuevos

| RPC | Contenido |
| --- | --- |
| `get_community_feed(p_cursor jsonb DEFAULT NULL, p_limit int DEFAULT 20)` | Posts públicos de autores no privados. |
| `get_following_feed(p_cursor jsonb DEFAULT NULL, p_limit int DEFAULT 20)` | Posts públicos de seguidos, sus posts `friends` si además hay amistad, y posts propios. |

Ambas devuelven `{ "ok": true, "items": [...], "next_cursor": { "created_at": "<timestamptz>", "id": "<uuid>" } }`; `next_cursor` es `null` cuando la página trae menos que el límite. `p_limit` se recorta a 1–50. Para la siguiente página se envía exactamente el cursor recibido. La ordenación es `(created_at DESC,id DESC)`; el filtro de la siguiente página es estrictamente menor en ambas claves. Un cursor inválido devuelve `{ "ok": false, "error": "invalid_cursor" }`.

Cada item mantiene la forma de `social_post_json` y añade `visibility`, `author.id`, `is_following`, `is_friend`, `friend_request_status`, `reaction_count`, `reacted_by_me`. También conserva `like_count`, `comment_count` y `liked_by_me` para los clientes existentes. Los feeds excluyen usuarios bloqueados en cualquier sentido y posts ocultos, retirados, borrados o reportados por quien consulta.

En un post de ruta público, el feed devuelve `attachment.polyline` calculado desde `route_activities.track` tras recortar 200 m de cada extremo y simplificar. El autor y sus amigos reciben el trazado completo simplificado. El track original no cambia. El JSON almacenado del post público se recorta también, para que una lectura directa de `social_posts` no exponga los extremos. `get_route_for_viewer` y `get_recent_activities` aplican el mismo criterio al abrir una ruta enlazada desde un post público; así el `activity_id` no permite eludir el recorte.

## Seguridad y moderación

Se reutilizan `user_blocks` y `content_reports`; no hay tablas paralelas. RPC nuevas:

- `unblock_user(p_user_id uuid) → jsonb`: idempotente.
- `report_post(p_post_id uuid,p_reason text,p_details text DEFAULT NULL) → jsonb`.
- `report_user(p_user_id uuid,p_reason text,p_details text DEFAULT NULL) → jsonb`.

Los motivos válidos son `spam`, `harassment`, `nudity`, `violence`, `self_harm` y `other`. Un segundo reporte del mismo usuario y objetivo devuelve el mismo `report_id`. El trigger `content_reports_autohide` existente oculta un post al llegar a tres reportes abiertos de usuarios distintos; `moderate_content` y `moderation_queue` permiten revisarlo y restaurarlo o retirarlo.

Las RPC nuevas usan `SECURITY DEFINER`, `search_path=public` y `auth.uid()`. Solo `authenticated` tiene `EXECUTE`. El SQL de prueba está en [community_open_smoke.sql](examples/community_open_smoke.sql) y termina en `ROLLBACK`.
