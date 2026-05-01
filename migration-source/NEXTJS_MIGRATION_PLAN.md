# Athelete — Next.js Migration Plan

> Status: Next.js is now the official primary runtime; legacy Vite remains isolated for fallback QA only  
> Last updated: April 10, 2026

## Current Migration Status

The migration is no longer only scaffolding.

Current state in the repo:

- Next.js `app/` is now the official runtime path for auth, onboarding, protected tabs, and major detail flows
- default local development now runs through `npm run dev`
- default production build now runs through `npm run build`
- the old Vite runtime is isolated under `src/legacy-runtime/` and `src/legacy-pages/`
- the following routes are implemented in Next and build successfully:
  - `/login`, `/register`, `/forgot-password`, `/reset-password`, `/onboarding`
  - `/inicio`, `/entrenos`, `/ellie`, `/progreso`, `/perfil`
  - `/workouts/[workoutId]`, `/workouts/[workoutId]/session`, `/workouts/new`
  - `/exercises/[exerciseId]`
  - `/challenges/core-33`
  - `/nutrition/plan`
  - `/favorites/workouts`, `/favorites/exercises`
  - `/pr`, `/pr/[exerciseId]`
  - `/quiz`, `/quiz/[categoryId]`
  - `/notifications`
  - `/body-science/[articleId]`
- shared auth, Supabase, theme, and browser-storage logic was adapted so the same app logic can run in Next
- the old Vite pages were moved from `src/pages/` to `src/legacy-pages/` so Next does not treat them as active Pages Router routes
- the old Vite app shell was moved to `src/legacy-runtime/LegacyViteApp.tsx`
- the temporary Next-only auth bridge was removed

Validation status:

- `npm run build` passes for the Next app
- `npm run build:legacy` passes for the Vite app
- major user flows have now gone through a targeted QA hardening pass for direct-entry routes, auth redirects, and workout-session recovery

Primary local command:

- `npm run dev`

Temporary fallback command:

- `npm run dev:legacy`

## Staging Readiness Summary

Ready now:

- Next.js is the primary runtime for local dev, build, and staging deploys
- auth, onboarding, protected tabs, and the main detail routes are available in the Next app
- app metadata and manifest are in place for mobile installability testing
- direct-entry route safety was hardened for the main detail flows
- workout session recovery logic was hardened for staging QA
- `.env.example` now defines the required public environment variables for Next staging deploys

Still required before staging deploy:

- configure `NEXT_PUBLIC_APP_URL` to the actual staging domain
- configure `NEXT_PUBLIC_SUPABASE_URL`
- configure `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- confirm Supabase Auth allowed redirect URLs include the staging `/reset-password` route

Still required before public release:

- final production icon set
- real device PWA install QA on iOS and Android
- service worker/offline strategy
- stronger auth hardening beyond client-layout gating

Still required before deleting the legacy runtime:

- one full staging parity cycle with QA signoff
- no open regressions that still require comparison against `dev:legacy`
- removal decision for `react-router-dom` and `src/legacy-*` after parity signoff

## QA Hardening Status

The migration has now moved into QA hardening rather than route scaffolding.

What was hardened in this pass:

- direct-entry/detail routes no longer depend on raw `router.back()` behavior; they now use explicit in-app fallbacks
- login no longer forces a second client redirect after `signIn`; auth state owns the final destination and reduces redirect flicker
- workout session startup logic now handles three same-day states correctly:
  - resume an `in_progress` session
  - resume a `canceled` session
  - start a new session after a completed one
- user-facing fallback cards are now neutral in production instead of exposing migration-specific wording
- the global 404 screen now matches the mobile app shell instead of falling back to a generic web-style page

Known QA risks still open:

- protected gating is still client-layout based rather than middleware/server enforced
- some detail routes still rely on shared client state already being loaded before showing their full content
- standalone-mode QA on real iOS and Android devices is still pending

## Legacy Removal Readiness

The old Vite runtime is no longer the main path, but it is not ready to be deleted yet.

What still depends on legacy:

- `src/legacy-runtime/LegacyViteApp.tsx`
- `src/legacy-runtime/main.tsx`
- `src/legacy-pages/*`
- `react-router-dom`

What must be true before removal:

- staging QA confirms parity for auth, onboarding, home, workouts, workout session, favorites, quiz, PR, profile, and logout
- no unresolved regressions remain that require behavior comparison against the old SPA
- the team is comfortable dropping the temporary fallback scripts:
  - `npm run dev:legacy`
  - `npm run build:legacy`

Current recommendation:

- keep the legacy runtime for one more QA cycle
- remove it immediately after staging parity signoff

## 1. Current Baseline

Athelete is currently a mobile-first React 18 SPA built with Vite, Tailwind, shadcn/ui, and Supabase.

The product already includes:

- Auth: login, register, forgot-password, reset-password, onboarding
- Main app tabs: Home, Workouts, ELLIE, Progress, Profile
- Feature flows: workout detail, workout session/player, challenge, quiz, favorites, PRs, nutrition plan, exercise detail, notifications
- AI: ELLIE chat and tool-calling through a Supabase Edge Function
- Backend: Supabase Auth, SQL tables, RLS policies, Edge Functions

Relevant reference docs:

- [PROJECT_OVERVIEW.md](/Users/nicolasfalcon/habit-trail-flow/docs/PROJECT_OVERVIEW.md)
- [ELLIE_ARCHITECTURE.md](/Users/nicolasfalcon/habit-trail-flow/docs/ELLIE_ARCHITECTURE.md)
- [MIGRATION_PLANS.md](/Users/nicolasfalcon/habit-trail-flow/docs/MIGRATION_PLANS.md)

## 2. Real Codebase Assessment

### Entry points

- Next entry: [layout.tsx](/Users/nicolasfalcon/habit-trail-flow/app/layout.tsx)
- Legacy Vite entry: [main.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-runtime/main.tsx)
- Legacy SPA app root: [LegacyViteApp.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-runtime/LegacyViteApp.tsx)
- Legacy authenticated product shell: [Index.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-pages/Index.tsx)

### Routing model today

There are only a few actual React Router routes:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/onboarding`
- `/`
- `/challenges/core-33`

However, the old SPA product navigation is not route-driven. Most authenticated navigation in the legacy app is state-driven inside [Index.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-pages/Index.tsx), which acts as:

- tab router
- modal/screen stack
- screen coordinator
- workflow orchestrator

This is the single biggest migration constraint.

### State management

The app uses context-heavy client state:

- [AuthContext.tsx](/Users/nicolasfalcon/habit-trail-flow/src/contexts/AuthContext.tsx)
- [AppContext.tsx](/Users/nicolasfalcon/habit-trail-flow/src/contexts/AppContext.tsx)
- [WorkoutSessionContext.tsx](/Users/nicolasfalcon/habit-trail-flow/src/contexts/WorkoutSessionContext.tsx)
- [GamificationContext.tsx](/Users/nicolasfalcon/habit-trail-flow/src/contexts/GamificationContext.tsx)

React Query exists in both runtimes, but most data fetching still happens directly inside hooks and contexts.

### Theme system

Current theme handling is split:

- custom browser-only theme hook: [useTheme.ts](/Users/nicolasfalcon/habit-trail-flow/src/hooks/useTheme.ts)
- `next-themes` already used by [sonner.tsx](/Users/nicolasfalcon/habit-trail-flow/src/components/ui/sonner.tsx)

This is a good migration target: consolidate on `next-themes` during the Next.js migration.

### Supabase integration

Current client:

- [client.ts](/Users/nicolasfalcon/habit-trail-flow/src/integrations/supabase/client.ts)

Important issue:

- the current Supabase client is tied to `import.meta.env`
- it configures `localStorage` at module level
- it is safe for Vite SPA, but not safe as a shared import across Next server/client boundaries

### Feature organization

The codebase is reasonably modular by UI area:

- `src/components/home`
- `src/components/tabs`
- `src/components/screens`
- `src/components/pr`
- `src/components/quiz`
- `src/components/challenge`
- `src/hooks`
- `src/lib`

This makes screen-by-screen migration feasible.

## 3. Migration-Sensitive Areas

### A. Routing and navigation

High sensitivity.

Current React Router usage is easy to replace for auth routes, but the legacy in-app experience is still driven by local state in [Index.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-pages/Index.tsx).

Impact:

- tab views must become real Next routes
- detail screens should become nested routes
- full-screen flows like workout session and challenge must move out of the current state machine

### B. Auth and onboarding flow

Medium-high sensitivity.

Current logic:

- unauthenticated -> `/login`
- authenticated but not onboarded -> `/onboarding`
- authenticated and onboarded -> app

This logic used to live in the SPA shell. It now lives primarily in Next layouts and route guards:

- protected layouts
- middleware later
- browser auth provider during the initial migration phase

### C. Browser-only APIs

The following patterns must be isolated behind client components or browser-safe wrappers:

- `window.location` in [ForgotPasswordScreen.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-pages/ForgotPasswordScreen.tsx)
- `window.location.hash` in [ResetPasswordScreen.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-pages/ResetPasswordScreen.tsx)
- `localStorage` in:
  - [useTheme.ts](/Users/nicolasfalcon/habit-trail-flow/src/hooks/useTheme.ts)
  - [usePremium.ts](/Users/nicolasfalcon/habit-trail-flow/src/hooks/usePremium.ts)
  - [useFavoriteExercises.ts](/Users/nicolasfalcon/habit-trail-flow/src/hooks/useFavoriteExercises.ts)
  - [useFavoriteWorkouts.ts](/Users/nicolasfalcon/habit-trail-flow/src/hooks/useFavoriteWorkouts.ts)
  - [client.ts](/Users/nicolasfalcon/habit-trail-flow/src/integrations/supabase/client.ts)
- `document.documentElement` in [useTheme.ts](/Users/nicolasfalcon/habit-trail-flow/src/hooks/useTheme.ts)
- `matchMedia` in:
  - [useTheme.ts](/Users/nicolasfalcon/habit-trail-flow/src/hooks/useTheme.ts)
  - [use-mobile.tsx](/Users/nicolasfalcon/habit-trail-flow/src/hooks/use-mobile.tsx)

### D. Vite-specific assumptions

The following must change or be isolated:

- `import.meta.env` usage
- Vite-only entrypoint assumptions
- current build/deploy scripts

### E. Images

The current app uses direct asset imports and plain `<img>` tags. This is portable, but Next migration should eventually standardize:

- local assets through `next/image`
- remote images behind a controlled config
- PWA icons in `public/`

### F. PWA readiness

Current repo status:

- no real Next manifest yet
- no service worker strategy yet
- no installable Next app shell yet

The migration foundation should prepare these, but not try to solve offline sync in phase 1.

## 4. Reuse Classification

### Reusable almost directly

- Tailwind tokens and design system in [index.css](/Users/nicolasfalcon/habit-trail-flow/src/index.css) and [tailwind.config.ts](/Users/nicolasfalcon/habit-trail-flow/tailwind.config.ts)
- shadcn/ui primitives under `src/components/ui`
- business types in [types.ts](/Users/nicolasfalcon/habit-trail-flow/src/lib/types.ts)
- Supabase schema and Edge Functions
- most view components that do not depend on React Router or direct browser globals
- ELLIE rules/context logic in:
  - [ellieContext.ts](/Users/nicolasfalcon/habit-trail-flow/src/lib/ellieContext.ts)
  - [ellieEngine.ts](/Users/nicolasfalcon/habit-trail-flow/src/lib/ellieEngine.ts)

### Reusable with light adaptation

- auth screens
- onboarding flow
- bottom navigation visuals
- Home / Workouts / Progress / Profile screen components
- most hooks that fetch data client-side from Supabase

Typical changes needed:

- replace React Router imports
- isolate browser-only code
- swap env access
- ensure client-only execution where needed

### Requires rewrite or structural refactor

- [LegacyViteApp.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-runtime/LegacyViteApp.tsx)
- [main.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-runtime/main.tsx)
- [Index.tsx](/Users/nicolasfalcon/habit-trail-flow/src/legacy-pages/Index.tsx)
- current router guards based on `Navigate`
- any shared imports that rely directly on the Vite Supabase client module

## 7. Remaining Legacy Structure

The following still exist temporarily:

- `src/legacy-runtime/LegacyViteApp.tsx`
- `src/legacy-runtime/main.tsx`
- `src/legacy-pages/*`
- `react-router-dom`

Reason:

- fallback QA
- parity comparison
- safer rollback while validating the Next app

These should be removed once QA confirms parity in the Next runtime.

## 8. Next Deployment Step

The next deployment-oriented step is:

1. run QA primarily against `npm run dev`
2. validate auth and protected flows in standalone/mobile contexts
3. finalize production icons and PWA metadata polish
4. choose and implement the service worker strategy
5. remove the legacy Vite runtime after parity signoff

## 5. Main Risks

### Risk 1: carrying the SPA shell intact into a single Next page

That would technically "work", but it would waste the migration and keep the current routing debt.

### Risk 2: trying to make everything server-rendered immediately

The product is highly interactive, stateful, and client-driven. For phase 1, the correct move is a client-first Next foundation, not a full RSC rewrite.

### Risk 3: shared modules that mix browser state and data access

Some hooks and clients assume `window` or `localStorage`. They must be isolated before broad reuse in the new app tree.

### Risk 4: low automated coverage

The repo has minimal meaningful tests. Migration should proceed incrementally and route-by-route.

## 6. Recommended Next.js Route Model

Recommended target structure:

```text
app/
  layout.tsx
  manifest.ts
  page.tsx
  (auth)/
    layout.tsx
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    onboarding/page.tsx
  (protected)/
    layout.tsx
    (tabs)/
      layout.tsx
      inicio/page.tsx
      entrenos/page.tsx
      ellie/page.tsx
      progreso/page.tsx
      perfil/page.tsx
    challenges/
      core-33/page.tsx
```

Later route expansion:

- workouts detail/session
- exercises detail
- nutrition plan
- PR history
- favorites
- quiz routes
- body science article routes

## 7. Proposed Migration Order

### Phase 0 — groundwork

- add Next scripts and config
- prepare `app/` structure
- add shared providers
- add browser-safe Next Supabase client
- add PWA manifest and icons

### Phase 1 — auth and shell

- migrate login
- migrate register
- migrate forgot-password
- migrate reset-password
- migrate onboarding
- create protected layout and bottom-tab shell

### Phase 2 — tab routes

- `/inicio`
- `/entrenos`
- `/ellie`
- `/progreso`
- `/perfil`

Start by mounting placeholders or thin wrappers, then replace with migrated real screens.

### Phase 3 — feature routes

- challenge
- workouts detail/session
- exercise detail
- nutrition plan
- favorites
- PR history
- quiz
- notifications

### Phase 4 — PWA hardening

- metadata tuning
- install prompt UX
- service worker choice
- offline caching strategy
- icon set cleanup
- splash screens

### Phase 5 — production deployment

- environment setup
- build pipeline
- browser testing
- iOS/Android install validation

## 8. What Must Change

- `react-router-dom`-based route orchestration
- Vite env access in shared runtime code
- current auth routing guards
- tab state stored in the monolithic `Index.tsx`
- browser-only theme and storage assumptions in shared hooks

## 9. What Should Not Be Rewritten Yet

- Supabase schema
- ELLIE Edge Function
- most UI primitives
- most feature-specific visual components
- AppContext business rules until the route split is in place

## 10. Practical Recommendation

Use Next.js as a stronger application shell first:

- App Router
- layouts
- protected route groups
- PWA metadata
- deployable structure

Do not force a full server-component architecture in phase 1. The correct migration path for this codebase is:

- route-first
- shell-first
- auth-first
- feature-by-feature after that

## 11. Immediate Next Steps

1. Run a focused staging QA pass on auth, workout session recovery, and protected direct-entry routes.
2. Replace the temporary PWA icon set with final production icons, including a proper maskable asset.
3. Decide the service worker strategy explicitly instead of shipping accidental offline behavior.
4. Add middleware or server-side auth helpers after staging confirms the client-gated shell is stable enough.
5. Remove the legacy fallback and `react-router-dom` immediately after QA parity signoff.
