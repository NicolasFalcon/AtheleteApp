# Athelete React Native CLI Foundation

## What exists now

This project is a clean React Native CLI + TypeScript mobile base for the future Athelete app. It is intentionally focused on foundation, not migration.

Ready today:

- React Native CLI project structure with iOS and Android folders
- scalable `src/` architecture
- root provider composition
- auth, onboarding, and main-tab navigation scaffold
- Supabase real client, auth persistence, and profile lookup
- theme/token system
- reusable base UI primitives
- placeholder screens connected to real navigation

## Project structure

```text
src/
  app/                app entry and provider composition
  assets/             mobile-only assets
  components/         shared layout components
  components/ui/      reusable UI primitives
  constants/          route constants and future global constants
  features/           feature-oriented product modules
  hooks/              app hooks wrapping providers
  lib/config/         typed environment/config access
  navigation/         root/auth/onboarding/tab navigators
  providers/          theme and auth/session providers
  screens/            current placeholder screens wired into navigation
  services/           shared service clients and backend integration points
  theme/              tokens and theme factories
  types/              app-wide shared types and env typings
```

## Navigation structure

Root flow switching happens in `src/navigation/RootNavigator.tsx`.

- Auth stack
  - `Login`
  - `Register`
  - `ForgotPassword`
- Onboarding stack
  - `Welcome`
  - `GoalSelection`
  - `BodyData`
  - `TrainingFrequency`
- Main tabs
  - `Inicio`
  - `Entrenos`
  - `ELLIE`
  - `Progreso`
  - `Perfil`

The auth provider already gates between `Auth`, `Onboarding`, and `App` using the real Supabase session plus `profiles.onboarding_completed`.

## Providers

Provider composition lives in `src/app/AppProviders.tsx`.

Included now:

- `GestureHandlerRootView`
- `SafeAreaProvider`
- `ThemeProvider`
- `QueryClientProvider`
- `AuthProvider`
- `NavigationContainer`

This is the extension point for any future analytics, feature flags, remote config, or notification providers.

## Theme setup

Theme foundation lives in:

- `src/theme/tokens.ts`
- `src/theme/theme.ts`
- `src/providers/ThemeProvider.tsx`

Current direction:

- premium
- monochrome
- minimal
- mobile-first

Tokens are prepared for:

- colors
- spacing
- typography
- radius
- shadows/elevation
- future light/dark expansion

## Supabase setup

Supabase foundation lives in:

- `.env.example`
- `src/lib/config/env.ts`
- `src/services/supabase/client.ts`
- `src/services/supabase/auth.ts`

Current strategy:

- typed env access through `@env`
- client created only when env values are present
- session persistence with `@react-native-async-storage/async-storage`
- RN URL polyfill enabled for Supabase client compatibility
- profile lookup from `public.profiles`
- onboarding gate driven by `profiles.onboarding_completed`

## Base UI primitives

Current primitives:

- `ScreenContainer`
- `AppHeader`
- `Button`
- `PrimaryButton`
- `SecondaryButton`
- `AppTextInput`
- `SectionTitle`
- `Card`
- `Loader`
- `EmptyState`
- `TabIcon`

These are intentionally simple, but stable enough to build the first real mobile screens on top of.

## What to implement next

Recommended next phase:

1. Add the real `.env` file with Supabase project credentials.
2. Validate login, register, and forgot-password against the real Supabase project.
3. Move auth and onboarding into `src/features/auth` and `src/features/onboarding`.
4. Continue with session player and deeper product flows.
5. Introduce more shared domain/service imports only after the mobile contracts are confirmed.
