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
SUPABASE_PASSWORD_RESET_URL=https://habit-trail-flow.vercel.app/reset-password
```

Notas:

- `SUPABASE_URL` y `SUPABASE_ANON_KEY` son obligatorias para habilitar auth real.
- `SUPABASE_PASSWORD_RESET_URL` hoy apunta al flujo web existente de reset password.
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

## Estado actual del reset password

El reset password ya usa Supabase real.

Hoy el correo apunta al flujo web existente definido por `SUPABASE_PASSWORD_RESET_URL`.
Más adelante puede reemplazarse por deep linking nativo.
