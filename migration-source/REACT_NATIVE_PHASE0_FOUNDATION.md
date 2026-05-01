# Athelete — React Native Phase 0 Foundation

> Status: Phase 0 completed for extraction and scaffolding only.  
> Scope: shared logic extraction, workspace preparation, and Expo foundation setup.  
> Non-scope: no React Native feature implementation yet, no full screen migration yet.

> Strategy update: this file documents extracted shared layers and the exploratory in-repo mobile foundation, but the production migration target is now a separate React Native CLI repository. Use the `RN_*` handoff docs as the authoritative rebuild package.

---

## 1. Purpose

This document records what was completed during the **pre-migration extraction and foundations phase** for the future React Native app.

It exists so the team can resume Phase 1 without having to rediscover:

- what shared logic already moved out of the web app
- what still remains web-coupled
- what the Expo app foundation already includes
- what should be built next

---

## 2. Shared Packages Created

### `packages/domain`

Purpose:

- pure business logic
- shared domain models and types
- framework-agnostic helper functions

Current extracted modules:

- `types.ts`
  - shared domain types previously owned by the web app
- `date.ts`
  - local date formatting/parsing helpers
  - workout session date key helpers
- `workout-ownership.ts`
  - ownership/editability/access rules for workouts
- `personal-records.ts`
  - PR types
  - PR formatting helpers
  - best-record selection helpers
- `featured-routines.ts`
  - featured routine metadata and source helpers
  - no web thumbnail rendering logic
- `core33.ts`
  - Core 33 day calculation
  - completion counting
  - current streak and longest streak rules
- `hydration.ts`
  - hydration streak logic
  - hydration chart data shaping
  - weekly hydration summary helpers
- `ellie-context.ts`
  - pure ELLIE context shaping and serialization
- `ellie-engine.ts`
  - pure ELLIE nudges, insights, recommendation logic

### `packages/data`

Purpose:

- backend-facing reusable logic
- data mapping/parsing
- reusable client/service helpers

Current extracted modules:

- `exercises.ts`
  - database row to exercise mapping
  - exercise labels and lookup helpers
- `workouts.ts`
  - template row to workout mapping
  - template exercise row mapping
  - featured template deduping helper
- `ellie-client.ts`
  - reusable ELLIE HTTP client
  - non-streaming generation helper
  - streaming chat helper

### `packages/design-tokens`

Purpose:

- framework-agnostic design constants that can be consumed by both web and React Native

Current extracted modules:

- `colors.ts`
  - semantic light/dark tokens
  - progress/accent colors
- `spacing.ts`
- `radius.ts`
- `typography.ts`
- `elevation.ts`
- `motion.ts`

---

## 3. Web App Compatibility Strategy

The extraction was done incrementally to avoid breaking the current Next.js app.

Compatibility approach used:

- existing `src/lib/*` entry points now re-export shared logic where safe
- web-only logic stayed in the web app when it still depends on UI/runtime assumptions
- hooks and contexts were updated to consume shared helpers instead of local copies
- no frontend behavior was intentionally changed during this phase

Examples of safe compatibility wrappers:

- `src/lib/date.ts`
- `src/lib/types.ts`
- `src/lib/workoutOwnership.ts`
- `src/lib/ellieContext.ts`
- `src/lib/ellieEngine.ts`

Examples of web modules that now consume extracted logic:

- `src/contexts/AppContext.tsx`
- `src/hooks/useHydration.ts`
- `src/hooks/useExercises.ts`
- `src/hooks/usePersonalRecords.ts`
- `src/lib/ellieChat.ts`
- `src/lib/featuredRoutines.ts`

---

## 4. What Remains Web-Only For Now

The following areas are still intentionally left in the web app because they are too coupled to the current Next.js or DOM-based UI layer.

### UI and component system

- `src/components/ui/*`
- shadcn/Radix component composition
- Tailwind-driven layout and styling
- page-level TSX rendering

### Navigation and route structure

- Next.js App Router pages/layouts
- `next/navigation` driven flows
- current web tab shell and page transitions

### Browser and PWA behavior

- `window`, `document`, `matchMedia`, viewport-specific logic
- local web storage assumptions
- PWA manifest/install behavior
- browser share/back/navigation expectations

### Web-specific rendering helpers

- current chart rendering using web charting libraries
- markdown rendering assumptions for current web screens
- image/layout logic that depends on DOM/CSS behavior

### Stateful feature UIs not yet migrated

- workout player/session UI
- ELLIE chat UI shell
- progress dashboards and charts
- onboarding forms
- auth forms

---

## 5. Expo Foundation Added

New mobile workspace:

- `apps/mobile`

### Foundation included

- Expo app scaffold
- Expo Router entry and route groups
- TypeScript config
- TanStack Query provider
- Supabase native client setup
- SecureStore-backed auth persistence
- route placeholders for auth, onboarding, and tabbed app areas
- lightweight mobile auth/session provider
- route-group gating for authenticated vs anonymous flows
- shared design token consumption in placeholder screens

### Current route groups

- `(auth)`
  - `login`
  - `register`
  - `forgot-password`
  - `reset-password`
- `(onboarding)`
  - placeholder onboarding entry
- `(tabs)`
  - `home`
  - `workouts`
  - `ellie`
  - `progress`
  - `profile`

### Current provider baseline

- `AppProviders`
  - `SafeAreaProvider`
  - `QueryClientProvider`
  - `MobileAuthProvider`

### Current mobile utility baseline

- `src/lib/runtimeEnv.ts`
- `src/lib/authStorage.ts`
- `src/lib/supabase.ts`
- `src/components/PlaceholderScreen.tsx`
- `src/components/LoadingScreen.tsx`

---

## 6. What Phase 0 Does Not Claim

Phase 0 does **not** mean the React Native app is feature-ready.

Still not implemented:

- real React Native auth screens
- onboarding forms
- shared repositories for every feature area
- mobile workout flows
- mobile nutrition/hydration flows
- mobile Core 33 flow
- mobile ELLIE screens
- native charting decisions
- push notifications
- offline strategy

---

## 7. Validation Performed

Validation completed in this phase:

- Next.js production build completed successfully after extraction

Command used:

```bash
npm run build
```

Meaning:

- the current web app still compiles after the shared package extraction
- the extraction did not break the existing production build path

Not validated yet:

- Expo runtime boot
- iOS/Android native build
- mobile package installation flow

Those remain for the next mobile setup step because Expo dependencies have been scaffolded in the repo, but the mobile environment has not been installed and run in this phase.

---

## 8. Recommended Phase 1 Next

Phase 1 should now focus on **auth + onboarding implementation in the Expo app**.

Recommended Phase 1 goals:

- install and verify mobile workspace dependencies
- confirm Expo app boots successfully
- implement mobile auth screens using Supabase auth
- implement onboarding flow and profile persistence
- define mobile form primitives and screen shell components
- establish the first reusable feature folder patterns inside `apps/mobile/src/features`

Definition of done for Phase 1:

- unauthenticated user can open the mobile app and complete login/register/forgot password flows
- authenticated user can complete onboarding in the mobile app
- onboarding/profile state persists to Supabase
- route guards correctly move users between auth, onboarding, and app shells

---

## 9. Summary

Phase 0 successfully prepared the repo for the React Native migration by:

- extracting reusable business logic
- extracting reusable data mapping/helpers
- extracting shared design tokens
- keeping the current Next.js app build-safe
- adding a structured Expo foundation for the future mobile app

This is now an appropriate baseline for the first real mobile implementation phase.
