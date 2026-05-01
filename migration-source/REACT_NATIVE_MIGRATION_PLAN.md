# Athelete — React Native Migration Plan

> Planning reference for the future React Native app migration.  
> Status: Analysis and architecture planning only. No React Native implementation has started in this document.  
> Last updated: April 2026

> Strategy update: the current repo should now be treated as the handoff/reference source for a brand-new React Native CLI app in a separate repository. The earlier `apps/mobile` Expo scaffold is not the target implementation path.

## Phase 0 Status

Phase 0 extraction and scaffolding has now started in the repo.

See:

- [docs/REACT_NATIVE_PHASE0_FOUNDATION.md](/Users/nicolasfalcon/habit-trail-flow/docs/REACT_NATIVE_PHASE0_FOUNDATION.md)
- [docs/RN_UI_HANDOFF.md](/Users/nicolasfalcon/habit-trail-flow/docs/RN_UI_HANDOFF.md)
- [docs/RN_FEATURE_HANDOFF.md](/Users/nicolasfalcon/habit-trail-flow/docs/RN_FEATURE_HANDOFF.md)
- [docs/RN_COMPONENT_MAP.md](/Users/nicolasfalcon/habit-trail-flow/docs/RN_COMPONENT_MAP.md)
- [docs/RN_NAVIGATION_FLOW.md](/Users/nicolasfalcon/habit-trail-flow/docs/RN_NAVIGATION_FLOW.md)
- [docs/RN_BACKEND_BINDINGS.md](/Users/nicolasfalcon/habit-trail-flow/docs/RN_BACKEND_BINDINGS.md)
- [docs/RN_SHARED_PORTABILITY.md](/Users/nicolasfalcon/habit-trail-flow/docs/RN_SHARED_PORTABILITY.md)
- [docs/RN_IMPLEMENTATION_PRIORITIES.md](/Users/nicolasfalcon/habit-trail-flow/docs/RN_IMPLEMENTATION_PRIORITIES.md)

---

## 1. Purpose

This document captures the recommended plan to migrate **Athelete** from its current **Next.js + PWA** codebase into a **proper React Native mobile application** while keeping **Supabase** as the backend.

This is intended to be the implementation blueprint for the future mobile build.

### Explicit non-scope for this step

- No React Native screens are being built yet
- No frontend rewrite is happening yet
- No database schema changes are being made for this migration plan
- No Supabase backend replacement is proposed
- No production mobile release work is starting yet

---

## 2. Executive Summary

Athelete is already a substantial mobile-first product, but the current app is still a **web application rendered through Next.js App Router** with a large shared client component layer.

The current codebase is best described as:

- a **thin Next.js routing shell**
- over a **large client-side component system**
- powered by **context-heavy app state**
- backed by **Supabase**
- with **ELLIE AI** integrated via a Supabase Edge Function

### High-level migration conclusion

The migration should **not** start by rewriting screens one by one directly from the current web components.

The safest path is:

1. keep the current Next.js app stable
2. extract reusable domain and data logic into shared modules
3. scaffold a separate React Native app
4. rebuild the mobile UI natively in phases
5. move the heaviest and most stateful flows later

### Core recommendation

- **Framework**: Expo
- **Navigation**: Expo Router
- **Server state**: TanStack Query
- **Backend**: Supabase remains unchanged
- **Shared strategy**: extract reusable logic into shared TypeScript modules before large-scale RN screen work

---

## 3. Current Project Baseline

This section reflects the current repo state that the migration plan is based on.

### 3.1 Repo baseline

Current codebase indicators:

- `26` Next.js route pages under `app/`
- `120` TSX component files under `src/components`
- `13` hook files under `src/hooks`
- `4` main context providers under `src/contexts`
- `13` Supabase migration files under `supabase/migrations`
- `53` runtime dependencies in `package.json`

### 3.2 Current runtime model

The project has already migrated from the old Vite SPA into a **Next.js App Router** runtime, but much of the product logic still behaves like a rich client app.

Current runtime layers:

- `app/` provides route structure, auth gating, and tab shell
- `src/components/*` contains most feature UIs
- `src/contexts/*` contains most shared app state
- `src/hooks/*` contains feature data hooks and derived logic
- `src/lib/*` contains domain helpers, ELLIE logic, date logic, workout ownership, and utility functions
- `supabase/functions/ellie-chat/index.ts` contains the ELLIE Edge Function

### 3.3 Product sections currently present

Based on the route tree, components, contexts, and docs, the product currently includes:

- login
- register
- forgot password
- reset password
- onboarding
- Home
- Workouts
- workout detail
- workout session/player
- custom routine builder
- exercise library
- exercise detail
- favorite workouts
- favorite exercises
- nutrition plan
- daily nutrition logging
- hydration tracking
- Core 33 challenge
- ELLIE AI
- progress dashboard
- PR registration and PR history
- quiz landing, quiz question flow, and results
- Body Science articles
- profile
- notifications

### 3.4 Primary user experience organization today

The user experience is centered around five protected tabs:

- `Inicio`
- `Entrenos`
- `ELLIE`
- `Progreso`
- `Perfil`

From those tabs, the app branches into detail flows:

- workouts
- exercises
- Core 33
- nutrition
- favorites
- quiz
- PRs
- Body Science
- notifications

The tab shell is implemented in:

- `app/(protected)/(tabs)/layout.tsx`
- `src/components/next/layout/MobileBottomNav.tsx`

### 3.5 Current protected route and provider chain

Protected routes are currently wrapped in:

1. `AuthProvider`
2. `AppProvider`
3. `GamificationProvider`
4. `WorkoutSessionProvider`

This means much of the product is still driven by **global client context**, not per-screen query boundaries.

---

## 4. Product Structure and Key Flows

## 4.1 Navigation structure today

The current navigation model is route-driven at the shell level, but feature logic remains very client-centric.

### Auth routes

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/onboarding`

### Main tabs

- `/inicio`
- `/entrenos`
- `/ellie`
- `/progreso`
- `/perfil`

### Detail and supporting flows

- `/workouts/[workoutId]`
- `/workouts/[workoutId]/session`
- `/workouts/[workoutId]/edit`
- `/workouts/new`
- `/exercises/[exerciseId]`
- `/favorites/workouts`
- `/favorites/exercises`
- `/nutrition/plan`
- `/challenges/core-33`
- `/quiz`
- `/quiz/[categoryId]`
- `/pr`
- `/pr/[exerciseId]`
- `/body-science/[articleId]`
- `/notifications`

## 4.2 Key flow groups

### Auth and onboarding flow

- user signs up or logs in
- email verification is required for full access
- onboarding collects goal, body data, and training frequency
- `AuthContext` gates access based on `isAuthenticated` and `onboardingCompleted`

### Home-driven engagement flow

Home is the central dashboard and cross-feature launch surface.

It currently drives traffic to:

- Core 33
- workouts
- nutrition
- hydration
- ELLIE
- quiz
- PRs
- favorites
- notifications

### Workouts flow

- workouts tab lists library, ELLIE-generated, and user routines
- user opens workout detail
- user starts or resumes workout session
- session updates completion state in Supabase
- session summary feeds progress and gamification

### Exercise discovery flow

- exercise library provides search and filtering
- exercise detail shows movement metadata, cues, mistakes, and related routines
- favorites are local-only today
- PR history can branch from exercise detail

### Nutrition and hydration flow

- nutrition plan can be created or accepted via ELLIE
- nutrition logs are persisted daily
- hydration logs are persisted daily and used for charts and streak badges

### Challenge flow

- Core 33 intro -> habit selection -> summary -> tracker
- challenge participation and habit logs are persisted in Supabase
- streak and completion logic are computed client-side

### ELLIE flow

- insights tab uses deterministic client rules from `ellieEngine.ts`
- chat tab sends serialized user context to the `ellie-chat` Edge Function
- ELLIE can stream markdown text or return tool-generated workout/nutrition payloads
- generated content can be saved back to Supabase

### Progress flow

- charts aggregate workouts, nutrition, hydration
- PR summaries and history are included
- Body Science content is surfaced from progress

---

## 5. Frontend Architecture Analysis

## 5.1 What the frontend looks like today

The current frontend is not organized as a traditional server-driven Next app.

It is closer to:

- **Next.js for routing and bootstrapping**
- **React client components for the real product**
- **Tailwind + shadcn/ui + Radix primitives for the full visual layer**

### Architectural pattern in practice

- page files are generally thin wrappers
- route pages mostly translate navigation callbacks into `router.push()`
- feature components contain the actual UI and local interaction state
- contexts carry most shared app data and mutation logic

## 5.2 Important frontend layers

### Route layer

Examples:

- `app/(protected)/(tabs)/inicio/page.tsx`
- `app/(protected)/workouts/[workoutId]/page.tsx`
- `app/(protected)/workouts/[workoutId]/session/page.tsx`

These are mostly adapters around reusable screen components.

### Screen and feature components

Important directories:

- `src/components/tabs`
- `src/components/screens`
- `src/components/home`
- `src/components/challenge`
- `src/components/pr`
- `src/components/quiz`
- `src/components/progress`

These components contain most user-facing interaction behavior.

### UI system

Important directory:

- `src/components/ui`

This is a large shadcn/ui and Radix-based web component library. It is valuable as a design reference, but it is **not portable to React Native**.

### Context and app state

Main providers:

- `src/contexts/AuthContext.tsx`
- `src/contexts/AppContext.tsx`
- `src/contexts/GamificationContext.tsx`
- `src/contexts/WorkoutSessionContext.tsx`

### Hooks and helper layer

Important reusable hooks and libs include:

- `useExercises`
- `useHydration`
- `usePersonalRecords`
- `useQuiz`
- `useEllieContext`
- `useEllieRecommendations`
- `lib/date.ts`
- `lib/workoutOwnership.ts`
- `lib/featuredRoutines.ts`
- `lib/ellieEngine.ts`
- `lib/ellieContext.ts`

## 5.3 Theme and token layer

The current visual system is defined primarily in:

- `src/index.css`
- `tailwind.config.ts`

The app already has a good token foundation:

- semantic colors
- radius scale
- shadow tokens
- progress colors
- safe-area variables
- keyboard offset handling

This is a strong base for a future RN design system, but it must be converted from:

- CSS custom properties
- Tailwind theme tokens

into:

- JavaScript/TypeScript token objects
- React Native style primitives

## 5.4 Frontend coupling concerns

The main architectural issue for migration is that **server state, domain logic, optimistic mutations, and UI rendering are still too mixed together**.

Biggest example:

- `AppContext.tsx` loads profile, workouts, workout sessions, nutrition plan, nutrition logs, challenge participation, and habit logs, and also owns many write operations

This monolithic pattern works in the web app, but it should not be copied directly into the RN app.

---

## 6. Backend and Data Architecture Analysis

## 6.1 Backend choice remains correct

Supabase should remain the backend for the React Native app.

The current app already depends on:

- Supabase Auth
- Postgres tables
- RLS policies
- `@supabase/supabase-js`
- a Supabase Edge Function for ELLIE

There is no architectural reason to replace this backend for the RN migration.

## 6.2 Main Supabase-backed entities used heavily by the UI

The current UI strongly depends on these data sets:

- `profiles`
- `workout_templates`
- `template_exercises`
- `workout_sessions`
- `nutrition_plans`
- `daily_nutrition_logs`
- `daily_hydration_logs`
- `challenge_participations`
- `habit_logs`
- `badges`
- `user_badges`
- `personal_records`
- `quiz_categories`
- `quiz_questions`
- `quiz_attempts`
- `exercises`
- `chat_messages`

## 6.3 Current auth/session handling

The current Supabase client is created in:

- `src/integrations/supabase/client.ts`

Important current behavior:

- auth persists using `window.localStorage`
- session persistence is browser-based
- token refresh is enabled
- `AuthContext` listens to `onAuthStateChange`
- profile hydration happens after auth session resolution

This is reusable conceptually, but the storage implementation is **web-specific** and must be changed for RN.

## 6.4 Edge Functions and AI integration

ELLIE uses:

- client transport in `src/lib/ellieChat.ts`
- persistence helpers in `src/lib/ellieActions.ts`
- deterministic client intelligence in `src/lib/ellieEngine.ts`
- context serialization in `src/lib/ellieContext.ts`
- backend tool-calling in `supabase/functions/ellie-chat/index.ts`

This is one of the strongest areas for logic reuse because much of the intelligence is already in plain TypeScript.

---

## 7. Reusable Business Logic Analysis

This section separates truly reusable logic from UI-bound code.

## 7.1 Strong reuse candidates

These areas are already close to platform-neutral or can become platform-neutral with low effort.

### Domain types and payload shapes

- `src/lib/types.ts`
- Supabase generated types
- ELLIE message/result shapes
- PR and quiz payload types

### Pure business rules

- `src/lib/workoutOwnership.ts`
- `src/lib/date.ts`
- `src/lib/featuredRoutines.ts`
- thumbnail selection logic in `src/lib/workoutThumbnails.ts`
- PR formatting and comparison helpers in `usePersonalRecords.ts`
- ELLIE recommendation and insight rules in `src/lib/ellieEngine.ts`
- ELLIE context building and serialization in `src/lib/ellieContext.ts`

### Backend-facing data contracts

- workout template mapping model
- nutrition plan model
- hydration log model
- challenge participation model
- quiz submission payloads
- ELLIE-generated workout and nutrition plan payloads

### Product rules that should transfer to RN

- workout ownership/editability rules
- featured editorial routine definitions
- Core 33 streak and completion rules
- hydration badge thresholds
- quiz scoring logic
- workout session completion and point awarding rules

## 7.2 Reusable but should be re-homed

These should move out of UI hooks/contexts into shared service/domain modules before or during the RN migration.

### Data mappers

Examples:

- exercise DB row -> library model
- workout template row -> workout model
- template exercise row -> exercise model
- hydration/nutrition log row -> app model

### Query/mutation logic

Examples:

- fetching workouts
- fetching exercises
- loading PRs
- loading quizzes
- loading hydration logs
- saving ELLIE-generated plans

These exist today, but many are embedded inside React hooks or contexts. They should become repository/service functions.

### Context computations that should become domain services

Examples:

- challenge streak calculations
- workout session date-key logic
- nutrition “today log” resolution
- leaderboard/insight-ready data shaping

---

## 8. React Native Migration-Sensitive Areas

These are the areas that will create the most migration work.

## 8.1 Web-only routing and navigation dependencies

Current web-specific dependencies:

- `next/navigation`
- `next/link`
- `useSafeBack()` using browser history and referrer
- direct route params through App Router

These must be replaced by native navigation state and stack behavior.

## 8.2 DOM and browser API usage

Current browser-coupled patterns include:

- `window.localStorage`
- `window.matchMedia`
- `window.visualViewport`
- `window.location.hash`
- `window.history.state`
- `document.documentElement`
- `document.visibilityState`
- `document.referrer`
- `scrollIntoView`
- CSS safe-area variables and keyboard offset CSS variables

These will all need RN-native equivalents or redesigns.

## 8.3 CSS, Tailwind, and web component assumptions

The current UI is deeply tied to:

- Tailwind utility classes
- Radix primitives
- shadcn component patterns
- CSS animations
- DOM-based dialog/sheet behavior
- browser input and focus behavior

The RN app must rebuild this layer with native components and navigation primitives.

## 8.4 Charts and data visualization

Current charts rely on:

- `recharts`

Used in:

- training volume chart
- nutrition history chart
- hydration history chart
- PR history chart

Chart data shaping can be reused. The chart rendering itself cannot.

## 8.5 PWA-specific behavior

The current app contains web/PWA-only concerns:

- `app/manifest.ts`
- standalone display metadata
- mobile web app meta tags
- PWA safe-area CSS
- keyboard viewport compensation through `visualViewport`

These do not transfer to RN and should not influence the native architecture.

## 8.6 Chat and keyboard complexity

ELLIE chat is one of the most migration-sensitive flows because it currently relies on:

- `ReactMarkdown`
- web input focus/selection behavior
- scroll container refs
- sticky footer input layout
- incremental streaming text rendering in DOM

This feature is absolutely buildable in RN, but it should be treated as a late-phase migration item.

## 8.7 Session and timer behavior

Workout session handling currently depends on:

- timers in React state
- tab visibility/focus refresh
- browser lifecycle assumptions

RN has different lifecycle behavior and backgrounding behavior, so this flow needs careful redesign and testing.

---

## 9. Reuse vs Rewrite Map

## 9.1 Can be reused almost directly

These are the best reuse targets.

| Area | Current source | RN expectation |
|------|----------------|----------------|
| Domain models | `src/lib/types.ts`, Supabase types | Reuse with little change |
| Date utilities | `src/lib/date.ts` | Reuse directly |
| Workout ownership rules | `src/lib/workoutOwnership.ts` | Reuse directly |
| Featured routine definitions | `src/lib/featuredRoutines.ts` | Reuse directly |
| Workout thumbnail decision logic | `src/lib/workoutThumbnails.ts` | Reuse with asset-path adaptation |
| ELLIE deterministic rules | `src/lib/ellieEngine.ts` | Reuse directly |
| ELLIE context serialization | `src/lib/ellieContext.ts` | Reuse directly |
| Supabase schema and backend | `supabase/*` | Reuse unchanged |
| ELLIE Edge Function | `supabase/functions/ellie-chat/index.ts` | Reuse unchanged |
| Quiz scoring and PR formatting logic | `useQuiz.ts`, `usePersonalRecords.ts` helpers | Reuse after extraction |

## 9.2 Can be reused with adaptation

These should transfer, but not in their current exact form.

| Area | Current source | Required adaptation |
|------|----------------|--------------------|
| Auth/session layer | `AuthContext.tsx`, Supabase client | Replace browser storage with SecureStore/AsyncStorage adapter |
| App data loading | `AppContext.tsx` | Split into query hooks + repositories + lightweight contexts |
| Workout session state | `WorkoutSessionContext.tsx` | Rework lifecycle handling for RN app state and backgrounding |
| Hydration logic | `useHydration.ts` | Keep calculations, replace toasts/storage hooks and convert to query-based flow |
| PR hooks | `usePersonalRecords.ts` | Extract service functions and reuse formatting helpers |
| Quiz hooks | `useQuiz.ts` | Extract service functions and reuse scoring logic |
| ELLIE transport | `ellieChat.ts` | Keep request/stream protocol, rebuild UI consumption layer |
| ELLIE persistence helpers | `ellieActions.ts` | Reuse with shared Supabase client abstraction |
| Favorites and premium flags | `useFavoriteExercises.ts`, `useFavoriteWorkouts.ts`, `usePremium.ts` | Replace `localStorage` with AsyncStorage or persistent server state |
| Chart data shaping | progress/chart components | Reuse data aggregation only |
| Theme semantics | `src/index.css`, `tailwind.config.ts` | Convert tokens to RN theme objects |

## 9.3 Must be rewritten for React Native

These are full rewrite areas.

| Area | Why |
|------|-----|
| All screen UI components | Current components are DOM + Tailwind + web event model |
| `src/components/ui/*` layer | Radix/shadcn is web-only |
| App Router pages and layouts | Next.js routing does not transfer |
| Bottom tab shell | Must be rebuilt using native navigation |
| Dialogs, sheets, drawers, tooltips, popovers | Current implementation depends on DOM layering and Radix |
| Chart rendering | `recharts` does not carry over |
| `BrandMark` / `next/image` usage | Needs native image handling |
| `next-themes` usage | Needs native theme provider |
| `useSafeBack` browser-history logic | Needs native stack behavior |
| PWA install/runtime behavior | Not relevant in RN |
| web input focus/selection handling | Needs native keyboard-aware implementation |

---

## 10. Biggest Rewrite Areas

The largest migration costs will come from these areas:

### 1. UI layer rewrite

The current interface is heavily built on:

- Tailwind classes
- Radix
- shadcn/ui
- web layout assumptions

This is the biggest unavoidable rewrite.

### 2. Navigation rewrite

The current app uses:

- Next App Router
- client redirects
- browser-aware back behavior

RN needs a proper native stack/tab architecture.

### 3. State architecture cleanup

The current `AppContext` is too broad for a healthy RN foundation.

This is a migration opportunity, not just a problem:

- move server state to TanStack Query
- keep contexts for only true app-wide client state
- extract repository and domain layers

### 4. ELLIE chat experience

ELLIE combines:

- streaming text
- markdown
- tool previews
- chat persistence
- keyboard-heavy UX

This is one of the hardest screens to reproduce well in RN.

### 5. Charts and progress visuals

All current progress visualizations must be rebuilt with an RN chart solution.

---

## 11. Proposed React Native Architecture

## 11.1 Framework choice

### Recommendation: Expo

Expo is the recommended choice for this migration.

### Why Expo is the right fit

- fastest path to a production-quality RN app
- strong ecosystem for auth/session storage, navigation, splash, fonts, updates, and build tooling
- lower setup burden than bare RN
- good fit for Supabase-based apps
- supports gradual addition of native modules later
- allows eventual EAS Build and app store deployment without early native setup overhead

### When bare React Native would be justified later

Only consider ejecting later if the product becomes deeply dependent on:

- HealthKit / Google Fit integrations
- advanced wearable SDKs
- custom native workout/background behavior beyond Expo support
- highly specialized native performance requirements

For the migration start, Expo is the safest and fastest option.

## 11.2 Navigation recommendation

### Recommendation: Expo Router

Expo Router is the best navigation fit because:

- the current app already uses App Router concepts
- route groups map cleanly to auth, onboarding, tabs, and stacks
- file-based routing will feel familiar to the current codebase
- it still sits on top of React Navigation internally

### Recommended navigation shape

- `(auth)` group
- `(onboarding)` group
- `(tabs)` group
- nested stack routes for workout detail, session, exercise detail, quiz detail, PR history, and Body Science detail
- modal routes for flows that behave like sheets or overlays

### Proposed route groups

```text
mobile/
  app/
    _layout.tsx
    (auth)/
      login.tsx
      register.tsx
      forgot-password.tsx
      reset-password.tsx
    (onboarding)/
      index.tsx
    (tabs)/
      _layout.tsx
      home.tsx
      workouts.tsx
      ellie.tsx
      progress.tsx
      profile.tsx
    workouts/
      [workoutId].tsx
      [workoutId]/session.tsx
      [workoutId]/edit.tsx
      new.tsx
    exercises/
      [exerciseId].tsx
    favorites/
      workouts.tsx
      exercises.tsx
    nutrition/
      plan.tsx
    challenges/
      core-33.tsx
    quiz/
      index.tsx
      [categoryId].tsx
    pr/
      index.tsx
      [exerciseId].tsx
    body-science/
      [articleId].tsx
    notifications/
      index.tsx
```

## 11.3 Recommended project structure

### Target architecture

The long-term target should be a shared-code setup, but the migration should avoid a risky repo-wide reorganization on day one.

### Recommended practical structure

```text
/
  app/                          # current Next.js app remains stable during migration
  src/                          # current web app source
  mobile/                       # new Expo app
  packages/
    domain/                     # shared types, business rules, helpers
    data/                       # shared repositories and Supabase query functions
    design-tokens/              # shared tokens and theme constants
```

### Why this is safer than immediately moving everything into `apps/web`

- avoids destabilizing the current production web app
- allows shared extraction incrementally
- reduces migration risk while mobile planning turns into implementation

Later, if desired, the repo can be reorganized into a fuller workspace monorepo.

## 11.4 Shared logic strategy

The shared strategy should focus on **domain and data**, not shared JSX.

### Shared package responsibilities

#### `packages/domain`

Should contain:

- domain types
- date helpers
- workout ownership logic
- featured routine definitions
- challenge logic
- PR formatting/comparison helpers
- ELLIE context builders
- ELLIE rule engine

#### `packages/data`

Should contain:

- Supabase client adapters
- repositories per entity
- row-to-model mappers
- mutation helpers
- chat/ELLIE transport helpers

#### `packages/design-tokens`

Should contain:

- color tokens
- spacing scale
- radius scale
- typography scale
- semantic state colors

### What should not be shared

- web UI components
- Next.js pages/layouts
- Radix wrappers
- Tailwind class strings
- web-specific hooks that depend on `window` or `document`

## 11.5 Design system strategy

### Recommendation

Use a **React Native primitive layer + shared tokens**, not a direct attempt to port shadcn components.

### Suggested styling approach

- use Expo
- use NativeWind for faster utility-style development
- build a small internal RN component library on top of React Native primitives

### Suggested RN primitive set

- `Screen`
- `ScrollScreen`
- `AppHeader`
- `Card`
- `PrimaryButton`
- `SecondaryButton`
- `Chip`
- `TextField`
- `SectionTitle`
- `StatTile`
- `ProgressRing`
- `BottomTabBar`
- `EmptyState`
- `ModalSheet`

### Important rule

Do not try to “port shadcn/ui to React Native.” Use the existing visual language as a **design reference**, not as a component portability assumption.

## 11.6 Data/query/state approach

### Recommendation

Use:

- **TanStack Query** for server state
- **Supabase repositories/services** for all reads and writes
- **lightweight contexts** only where true app-wide client state is needed

### Server state examples

Use TanStack Query for:

- profile
- workouts
- exercises
- workout sessions
- nutrition plan
- nutrition logs
- hydration logs
- challenge participation and habit logs
- PRs
- quizzes
- chat history

### Contexts that still make sense

- auth/session context
- theme context
- transient workout session UI context if needed
- small app-level settings context

### Storage recommendation

- auth session: SecureStore-backed Supabase storage adapter
- lightweight local preferences: AsyncStorage
- no `localStorage` assumptions in shared code

### Realtime recommendation

Realtime is not required to start the RN migration.

For now:

- keep ELLIE chat request/response model
- use query invalidation for refreshes
- add realtime only if later needed for live social/community features

---

## 12. Recommended Migration Order

This order is optimized for safety, reuse, and speed.

## Phase 0 — Pre-migration extraction and foundations

### Objective

Prepare the current repo so RN work can reuse real logic instead of copying web code.

### Work

- identify shared domain modules
- extract pure TS helpers from hooks/contexts
- isolate Supabase repository functions from UI hooks
- define shared token objects from current CSS/Tailwind system
- define native-safe env and storage strategy

### Why first

If this is skipped, the RN app will duplicate web logic and become harder to maintain immediately.

### Done means

- shared modules exist for domain/data logic
- no critical business rule is trapped inside a web-only component

## Phase 1 — Mobile app setup and infrastructure

### Objective

Create the Expo app foundation and make auth/session/bootstrap work.

### Work

- scaffold Expo app
- configure Expo Router
- wire Supabase client for native storage
- add TanStack Query
- add theme and design tokens
- create core RN primitives
- configure safe area, splash, and app fonts

### Why here

Everything else depends on a stable app shell.

### Done means

- app boots on device/simulator
- auth session persists
- protected vs auth route groups work

## Phase 2 — Auth and onboarding

### Objective

Ship the full entry funnel first.

### Work

- login
- register
- forgot password
- reset password
- onboarding

### Why here

- lowest product risk
- required before validating any protected flow
- exposes storage/session issues early

### Done means

- a user can sign up, sign in, recover password, complete onboarding, and land in the app successfully

## Phase 3 — Protected shell and Home foundation

### Objective

Create the native app shell and the first high-value protected experience.

### Work

- bottom tabs
- app header patterns
- Home screen base
- notifications entry
- read-only cards for workouts, nutrition, hydration, quiz, PR, ELLIE shortcuts

### Why here

Home is the central coordination screen and validates the shell, tokens, spacing, safe area, and content stacking.

### Done means

- authenticated user reaches native tab shell
- Home loads real data and launches major flows

## Phase 4 — Read-only content and discovery flows

### Objective

Bring over the flows that are mostly fetch + render before touching heavy mutation/session logic.

### Work

- workouts list
- exercise library
- workout detail
- exercise detail
- favorites
- Body Science detail

### Why here

These screens establish navigation depth and reusable list/detail UI without immediately taking on the hardest write paths.

### Done means

- user can browse workouts and exercises
- favorites work natively
- detail routes no longer depend on preloaded web-style global state

## Phase 5 — Workout session and routine builder

### Objective

Migrate the most important active training flows.

### Work

- workout session/player
- resume/cancel/finish behavior
- workout session persistence
- routine builder
- workout create/edit/delete

### Why here

This is a core product pillar, but it is more complex than read-only browsing because it includes timers, optimistic UI, and ownership rules.

### Done means

- user can start, resume, finish, and save sessions reliably
- user can create and edit custom routines

## Phase 6 — Nutrition and hydration

### Objective

Migrate daily adherence flows that support Home, Progress, and ELLIE.

### Work

- nutrition plan screen
- nutrition log flow
- hydration log flow
- hydration charts and streak support
- reward/badge connections

### Why here

These flows are important, but less navigation-complex than ELLIE and less lifecycle-sensitive than workout session.

### Done means

- nutrition plan and daily nutrition logging work
- hydration logging works
- Home and Progress can reflect both data sets

## Phase 7 — Progress, PRs, quiz, and learning

### Objective

Bring over the supporting but still valuable retention features.

### Work

- progress dashboard
- native chart implementations
- PR registration and history
- quiz flow
- Body Science surfacing

### Why here

These features depend on multiple earlier data flows already being available.

### Done means

- progress visuals are live
- PR history works
- quiz and educational flows are functional

## Phase 8 — Core 33

### Objective

Migrate the discipline challenge with native timeline and tracker UX.

### Work

- Core 33 intro, choose habits, summary, tracker
- habit log persistence
- streak calculations
- badge/point integration

### Why here

It is a self-contained product pillar, but the tracker UI and habit state logic deserve dedicated focus after the core shell is proven.

### Done means

- user can start, track, and complete Core 33 natively

## Phase 9 — ELLIE

### Objective

Bring over the heaviest, most integration-rich feature last.

### Work

- insights surface
- chat UI
- streaming response rendering
- markdown rendering
- generated workout and nutrition preview cards
- save/discard/regenerate flows

### Why here

ELLIE depends on many other parts of the app for context:

- workouts
- nutrition
- hydration
- challenge state
- progress
- gamification
- PRs

It also has the highest keyboard and scroll complexity.

### Done means

- ELLIE feels native and stable
- tool-generated flows save successfully
- chat history and streaming behave correctly on real devices

## Phase 10 — Polish and launch prep

### Objective

Prepare the mobile app for real release quality.

### Work

- performance tuning
- animation polish
- device QA
- crash handling
- deep link support
- push notification evaluation
- app store assets and release pipeline

### Done means

- app is stable enough for beta/store rollout

---

## 13. Risks and Blockers

## 13.1 Highest-risk migration issues

### Monolithic `AppContext`

Risk:

- too much logic in one provider
- screen rendering depends on large preloaded global state
- detail routes can fail when state is not already hydrated

Recommendation:

- split into repositories + query hooks + smaller contexts

### Web-only dependencies

Risk:

- `localStorage`
- `window`
- `document`
- `next/navigation`
- `next/link`
- `next-themes`
- Radix
- Recharts

Recommendation:

- treat them as rewrite flags, not portability targets

### Workout session behavior

Risk:

- timers and resume logic are sensitive
- current implementation depends on browser visibility/focus refresh

Recommendation:

- rebuild against RN app lifecycle and persistent session state
- test on background/foreground transitions early

### ELLIE chat complexity

Risk:

- streaming
- markdown
- keyboard avoidance
- sticky composer
- scroll anchoring
- tool preview cards

Recommendation:

- ship ELLIE after the rest of the app data foundation is stable

### Chart migration

Risk:

- every chart is currently tied to Recharts

Recommendation:

- preserve the data shaping logic
- replace rendering with a native chart solution later in the roadmap

## 13.2 Medium-risk areas

### Favorites and premium state

Current behavior is local-only.

Risk:

- migrating local-only state to RN storage is easy technically, but it may create inconsistent cross-platform behavior if the web app and mobile app diverge

### Reset password recovery flow

Current web implementation checks `window.location.hash`.

Risk:

- the native flow must be redesigned around deep links and Supabase recovery handling

### Asset and image handling

Current code assumes:

- imported image `.src`
- `next/image`
- web remote image rules

RN will need a separate asset strategy.

## 13.3 Low-risk areas

These should migrate relatively smoothly once the shared data/domain layer is extracted:

- quiz logic
- PR formatting logic
- workout ownership rules
- featured routine catalog
- date helpers
- Body Science content data

---

## 14. Implementation Recommendations

## 14.1 Do not port web components

Rebuild screens natively from product intent, not from DOM markup.

## 14.2 Extract shared logic before heavy RN screen work

If a rule matters in both apps, move it into shared TS first.

## 14.3 Move server state out of big contexts

The RN app should not copy the current `AppContext` architecture as-is.

## 14.4 Keep the current web app stable while mobile work starts

The current Next.js app should remain the source of truth during early mobile migration.

## 14.5 Treat ELLIE as a late migration phase

It is too cross-cutting and UI-sensitive to be an early implementation target.

---

## 15. Final Recommendation

The correct migration strategy is:

- keep Supabase
- build the native app with Expo
- use Expo Router for file-based navigation
- extract shared domain and data logic before screen-heavy RN work
- rebuild the UI natively instead of porting web components
- migrate in phases starting with auth, shell, and read-only discovery
- leave workout session, Core 33, and especially ELLIE for later phases once the foundation is stable

This gives Athelete the fastest path to a real native mobile app without destabilizing the current production web experience.
