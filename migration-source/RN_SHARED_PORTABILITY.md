# Athelete — RN Shared Portability

> Purpose: clarify what code in this repo is portable to a separate RN CLI project, what can be adapted, and what must be rebuilt.

---

## 1. Authoritative Position

This repo is now the product reference and migration source for a new RN CLI app in a separate repository.

### Important clarification

- `apps/mobile` is exploratory scaffold work from an earlier direction
- it is not the authoritative mobile target
- the authoritative reusable layers are now:
  - `packages/domain`
  - `packages/data`
  - `packages/design-tokens`

---

## 2. Portable With Minimal Change

### `packages/domain`

Use directly or near-directly in RN CLI:

- `types.ts`
- `date.ts`
- `workout-ownership.ts`
- `featured-routines.ts`
- `core33.ts`
- `hydration.ts`
- `personal-records.ts`
- `ellie-context.ts`
- `ellie-engine.ts`

Why portable:

- framework-agnostic
- pure data logic
- no DOM dependency
- no Next.js dependency

### `packages/data`

Portable with small environment wiring:

- `exercises.ts`
- `workouts.ts`
- `ellie-client.ts`

Why portable:

- mapping/parsing helpers
- reusable network contract for ELLIE
- no web rendering dependency

### `packages/design-tokens`

Portable as design reference:

- `colors.ts`
- `spacing.ts`
- `radius.ts`
- `typography.ts`
- `elevation.ts`
- `motion.ts`

Why portable:

- token values are framework-agnostic
- ideal as base input for RN design primitives

---

## 3. Portable With Adaptation

These are usable as source logic, but should not be copied blindly.

### Context logic

- `src/contexts/AuthContext.tsx`
- `src/contexts/AppContext.tsx`
- `src/contexts/GamificationContext.tsx`
- `src/contexts/WorkoutSessionContext.tsx`

Why adaptation is needed:

- they are React-web-context-heavy
- some responsibilities should likely move to repositories and TanStack Query in the new RN app
- `WorkoutSessionContext` currently uses browser lifecycle listeners

### Feature hooks

- `src/hooks/useHydration.ts`
- `src/hooks/useExercises.ts`
- `src/hooks/usePersonalRecords.ts`
- `src/hooks/useQuiz.ts`
- `src/hooks/useEllieContext.ts`
- `src/hooks/useEllieRecommendations.ts`

Why adaptation is needed:

- good source for query/mutation behavior
- but they are still coupled to current contexts, web storage, or web component expectations

### ELLIE persistence helpers

- `src/lib/ellieActions.ts`
- `src/lib/ellieChat.ts`

Why adaptation is needed:

- backend contract is portable
- environment/session wiring should be re-owned by the new RN app

---

## 4. Web-Coupled And Not Directly Reusable

### Entire UI layer

- `src/components/ui/*`
- `src/components/tabs/*`
- `src/components/screens/*`
- `src/components/home/*`
- `src/components/profile/*`
- `src/components/progress/*`
- `src/components/quiz/*`
- `src/components/challenge/*`

Why not directly reusable:

- HTML/DOM components
- Tailwind class usage
- web-specific layout assumptions
- Radix/shadcn patterns

### Navigation

- Next.js app routes in `app/*`
- `useSafeBack`
- `next/navigation` usage

Why not reusable:

- navigation must be rebuilt with RN CLI navigation primitives

### Browser-only helpers and hooks

- `useTheme.ts`
- `useFavoriteExercises.ts`
- `useFavoriteWorkouts.ts`
- `usePremium.ts`
- `use-mobile.tsx`

Why not reusable:

- `window`
- `document`
- `localStorage`
- browser media queries

### Charts and markdown rendering

- chart components using `recharts`
- `ReactMarkdown` usage in ELLIE chat

Why not reusable:

- need native charting and markdown rendering libraries

---

## 5. Recommended Porting Strategy

### Step 1

- copy or publish `packages/domain`, `packages/data`, and `packages/design-tokens` into the new RN CLI repo or shared workspace

### Step 2

- treat `src/contexts` and `src/hooks` as migration references
- extract only the backend/data flow patterns you need

### Step 3

- rebuild UI natively from the handoff docs
- do not port TSX markup from the web app

### Step 4

- port feature logic incrementally behind new repositories and query hooks

---

## 6. Current Best Reuse Targets

If you want the highest-value direct portability, start here:

1. `packages/domain/src/core33.ts`
2. `packages/domain/src/personal-records.ts`
3. `packages/domain/src/hydration.ts`
4. `packages/domain/src/workout-ownership.ts`
5. `packages/domain/src/ellie-context.ts`
6. `packages/domain/src/ellie-engine.ts`
7. `packages/data/src/workouts.ts`
8. `packages/data/src/exercises.ts`
9. `packages/data/src/ellie-client.ts`
10. `packages/design-tokens/src/*`

These are the cleanest inputs for the new RN CLI repo.
