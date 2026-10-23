# AUTH_SHAPES — Sign in with Apple / Google (iOS nativo)

## Inicio de sesión
- La app obtiene el `id_token` en el iPhone y llama a `supabase.auth.signInWithIdToken({ provider: 'apple' | 'google', token, nonce? })`.
- Apple: client ID `com.athelete.app` (Sign In Methods). Google: client ID web + secreto.
- Vinculación de identidades: mismo email verificado = misma cuenta. Con «Ocultar mi email» Apple entrega `@privaterelay.appleid.com` y NO se vincula con la cuenta de email.

## Alta de perfil
- El trigger `handle_new_user` crea `profiles (id, name)` igual para email, Apple y Google. `name = raw_user_meta_data->>'name'` o `''`.
- Apple casi nunca trae el nombre en el token: la app lo recibe solo la primera vez (`fullName` de ASAuthorization) y debe escribirlo:
  `supabase.from('profiles').update({ name }).eq('id', user.id)` — RLS "Users can update own profile" (`auth.uid() = id`).

## POST /functions/v1/apple-token-exchange
Llamar justo después de `signInWithIdToken` con Apple, enviando el `authorization_code` de ASAuthorization (válido 5 min, un solo uso). No bloquear el login si falla (fire-and-forget; reintentar no es necesario).

Headers: `Authorization: Bearer <JWT de usuario>`
Body: `{ "authorization_code": "c1a2b3..." }`

| HTTP | Body | Significado |
|---|---|---|
| 200 | `{ "ok": true, "stored": true }` | refresh_token guardado (upsert por usuario) |
| 200 | `{ "ok": true, "stored": false }` | código ya usado y ya había token guardado (idempotente) |
| 400 | `{ "ok": false, "error": "invalid_request" }` | falta/inválido `authorization_code` |
| 400 | `{ "ok": false, "error": "apple_exchange_failed", "apple_error": "invalid_grant" }` | Apple rechazó el código (caducado, falso, usado) |
| 401 | `{ "ok": false, "error": "unauthorized" }` | sin sesión / JWT inválido |
| 405 | `{ "ok": false, "error": "method_not_allowed" }` | no es POST |
| 503 | `{ "ok": false, "error": "not_configured" }` | faltan secretos Apple |
| 500 | `{ "ok": false, "error": "internal" }` | error de guardado |

## Almacenamiento
- `public.apple_tokens (user_id uuid PK, refresh_token_enc text, created_at, updated_at)`.
- Cerrada a la app: sin GRANT a anon/authenticated, RLS activo sin políticas; solo service role.
- `refresh_token_enc` = AES-GCM (`v1:<iv>:<ct>`), clave derivada de `APPLE_TOKEN_ENC_KEY`.

## client_secret de Apple
- Generado por las funciones (no usa el JWT del panel, que caduca a 6 meses): ES256 firmado con `APPLE_SIWA_P8`, `kid = APPLE_KEY_ID`, `iss = APPLE_TEAM_ID`, `sub = APPLE_CLIENT_ID`, `aud = https://appleid.apple.com`, caducidad 10 min, cacheado en memoria.
- Secretos: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_SIWA_P8`, `APPLE_CLIENT_ID`, `APPLE_TOKEN_ENC_KEY` (generado).

## delete-account (cambio)
- Antes de borrar archivos/datos: si existe fila en `apple_tokens`, llama a `appleid.apple.com/auth/revoke` (`token_type_hint=refresh_token`).
- Si la revocación falla, se registra en logs y el borrado continúa; la fila se elimina siempre.
- Respuestas de `delete-account` sin cambios (`{ok:true}` / `{ok:false,error,step}`).
