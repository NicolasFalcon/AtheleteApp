# Supabase Real en React Native CLI

## Dónde vive la configuración

- `.env.example`
- `src/lib/config/env.ts`
- `src/services/supabase/client.ts`
- `src/services/supabase/auth.ts`
- `src/services/supabase/profile.ts`
- `src/providers/AuthProvider.tsx`

## Variables de entorno necesarias

```env
APP_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_PASSWORD_RESET_URL=athelete://reset-password
```

Notas:

- `SUPABASE_URL` y `SUPABASE_ANON_KEY` son obligatorias para habilitar auth real.
- `SUPABASE_PASSWORD_RESET_URL` apunta al deep link nativo de recuperación de contraseña.
- No hay credenciales hardcodeadas en el código.

## Cómo funciona la persistencia de sesión

El cliente se crea en `src/services/supabase/client.ts` usando:

- `@react-native-async-storage/async-storage`
- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: false`

Eso deja a Supabase manejar la restauración de sesión al reabrir la app en React Native CLI.

## Nota importante sobre `.env` en RN CLI

Este proyecto usa `react-native-dotenv` vía Babel.

Eso significa que:

- las variables se inyectan al bundle JS en tiempo de compilación
- si cambias `.env`, Metro no siempre refresca esos valores solo con hot reload

Después de crear o cambiar `.env`, reinicia Metro con cache limpia y recompila la app:

```bash
npm run start:reset
```

Luego vuelve a correr iOS o Android.

Si no haces eso, la app puede seguir mostrando `Supabase no está configurado` aunque el archivo `.env` ya exista.

## Cómo se obtiene el perfil real

La fuente de verdad del perfil es `public.profiles`.

La lectura ocurre en `src/services/supabase/profile.ts`:

- se busca el perfil por `id = auth.user.id`
- si no existe, se crea una fila mínima
- se mapea a `ProfileRecord`

Campos usados hoy:

- `id`
- `name`
- `goal`
- `birth_date`
- `weight`
- `height`
- `training_days_per_week`
- `onboarding_completed`
- metas diarias y preferencias disponibles si existen

## Cómo funciona el gateo

`src/providers/AuthProvider.tsx` decide el flujo así:

- sin sesión de Supabase: `auth`
- con sesión y `profiles.onboarding_completed = false`: `onboarding`
- con sesión y `profiles.onboarding_completed = true`: `app`

## Reset password nativo

El reset password usa Supabase real y se resuelve dentro de la app, no en web.

Flujo:

1. `ForgotPasswordScreen` llama `supabase.auth.resetPasswordForEmail`.
2. Supabase envía un correo con `SUPABASE_PASSWORD_RESET_URL=athelete://reset-password`.
3. iOS/Android abren Athelete con ese deep link.
4. `AuthProvider` procesa `access_token`/`refresh_token` o `code`, activa una sesión temporal de recuperación y mantiene el flujo en Auth.
5. `ResetPasswordScreen` llama `supabase.auth.updateUser({password})`.
6. Al terminar, la app cierra la sesión temporal y vuelve al login.

Configuración nativa:

- iOS registra el scheme `athelete` en `ios/Athelete/Info.plist`.
- Android registra `athelete://reset-password` en `android/app/src/main/AndroidManifest.xml`.

Configuración requerida en Supabase:

- En Auth URL Configuration, agrega `athelete://reset-password` a Redirect URLs.
- Si Supabase no permite ese redirect, el correo puede seguir llegando pero el link será rechazado antes de abrir correctamente la app.

Prueba rápida:

```bash
npm run start:reset
```

Luego solicita un correo desde "¿Olvidaste tu contraseña?" y abre el link en el mismo dispositivo o simulador.
