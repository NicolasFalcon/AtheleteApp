# PUSH_SHAPES · Notificaciones push iOS (APNs directo)

Solo iOS. Recordatorios de entreno y agua = notificaciones **locales** de la app (no pasan por el backend).
Todo lo que llama la app usa el JWT del usuario. Respuestas `{ ok:true, ... }` o `{ ok:false, error }`.

## 1. Registro del dispositivo

`register_push_token(_token text, _apns_env 'sandbox'|'production', _app_version text?, _locale 'es'|'en'?, _platform 'ios')`
→ `{ ok:true, id }` · errores: `unauthorized`, `invalid_token` (hex 64–200), `invalid_env`, `invalid_platform`.
- Llamar al arrancar y cada vez que iOS entregue el token. Idempotente (actualiza `last_seen_at`).
- Si el token ya estaba en otra cuenta (cambio de cuenta en el mismo iPhone) se **reasigna** a la cuenta actual.
- Build de Xcode (debug) → `sandbox`; TestFlight / App Store → `production`.

`unregister_push_token(_token text)` → `{ ok:true, removed }`. Llamar **antes** de cerrar sesión (solo borra tokens propios).

Tabla `push_tokens` (el dueño solo puede leer y borrar): `id, user_id, token, platform, apns_env, app_version, locale, created_at, last_seen_at`. Se borra en cascada con la cuenta. Los tokens que APNs rechaza (410, `BadDeviceToken`, `Unregistered`, `DeviceTokenNotForTopic`) se borran solos.

## 2. Preferencias

`profiles.notification_prefs` (se conservan las claves existentes):
{ "workouts": true, "hydration": true, "updates": false,
  "push": { "social": true, "challenges": true,
            "quiet_hours": { "enabled": true, "start": 22, "end": 8 } } }
- `workouts` / `hydration`: los usa la app para sus recordatorios locales. `updates` sigue en `false`.
- Claves ausentes = el valor por defecto de arriba (los perfiles antiguos no necesitan migración).
- Cambiar solo con `set_push_prefs(_social?, _challenges?, _quiet_enabled?, _quiet_start 0-23?, _quiet_end 0-23?)` → `{ ok, notification_prefs }` · error `invalid_hours`. Solo cambia lo que se envía; no reescribas el JSON entero.

| Categoría | Tipos | Se puede apagar |
|---|---|---|
| `social` | friend_request, friend_accepted, post_like, post_comment | sí |
| `challenges` | challenge_invite, challenge_started, challenge_completed, challenge_ending, official_completed, official_new | sí |
| sistema | content_removed | **no** (aviso de moderación, siempre se envía) |

Horas de silencio: en hora local (`profiles.timezone` IANA, fallback `America/Santiago`). Aplican a todos los tipos, incluido `content_removed`. Lo que ocurre durante el silencio se envía al terminar (p. ej. 08:00 local). La notificación aparece en la bandeja de la app al instante igualmente.

## 3. Bandeja

- Lista: `select` directo de `social_notifications` (RLS del dueño): `id, recipient_id, actor_id, type, post_id, comment_id, challenge_id, request_id, read_at, created_at`.
- `mark_notifications_read(_ids uuid[] | null)` → `{ ok, marked, unread }` (`null` = todas). Usa `unread` para el badge del icono.

## 4. Payload APNs

{ "aps": { "alert": { "title": "…", "body": "…" }, "badge": 3, "sound": "default",
           "thread-id": "social|challenges|system" },
  "data": { "type": "post_like", "notification_id": "uuid",
            "entity_type": "post|comment|challenge|friend_request|user", "entity_id": "uuid" } }
- Sin deep link: la app decide la navegación con `type` + `entity_type` / `entity_id`.
- `badge` = notificaciones sin leer en el momento del envío.
- Título y texto en `profiles.language` (es/en). `apns-collapse-id` = `notification_id`.

## 5. Tipos de retos

- `official_completed`: completé un reto oficial (puntos e insignia ya otorgados). `actor_id` = null.
- `challenge_ending`: un reto oficial en el que participo termina en menos de 24 h. Una sola vez por reto, entre 10:00 y 20:59 hora local.
- `official_new`: hay un reto oficial nuevo (una vez por reto; no a quien ya está inscrito; solo con `challenges` activo). Se reparte por lotes de 500.

## 6. Envío (servidor)

- `send-push` no acepta JWT de usuario; solo lo llama el propio backend.
- Envío inmediato al crearse la notificación. Una revisión cada hora (en punto) envía lo que salió de las horas de silencio y los reintentos.
- Errores temporales de APNs (429 / 5xx): 3 reintentos inmediatos; si siguen fallando, se reintenta más tarde (máx. 5 intentos).
