# Athelete — React Native Backend Bindings

> Purpose: map the frontend product surfaces to Supabase tables, mutations, edge functions, derived client logic, and ownership rules.

---

## 1. Backend Baseline

- Backend: Supabase
- Auth: Supabase Auth
- Database: Postgres with RLS-backed tables
- AI endpoint: Supabase Edge Function `ellie-chat`

### Main persisted entities used by the frontend

- `profiles`
- `workout_templates`
- `template_exercises`
- `exercises`
- `workout_sessions`
- `nutrition_plans`
- `daily_nutrition_logs`
- `daily_hydration_logs`
- `challenge_participations`
- `habit_logs`
- `user_badges`
- `personal_records`
- `quiz_categories`
- `quiz_questions`
- `quiz_attempts`
- `chat_messages`

### Client-only persistence still present

- favorite workouts: localStorage
- favorite exercises: localStorage
- premium toggle: localStorage
- theme preference: localStorage

Those client-only areas must be intentionally redesigned in RN CLI.

---

## 2. Auth and Profile

### Auth

- Auth calls:
  - `supabase.auth.signInWithPassword`
  - `supabase.auth.signUp`
  - `supabase.auth.signOut`
  - `supabase.auth.resetPasswordForEmail`
  - `supabase.auth.onAuthStateChange`
  - `supabase.auth.getSession`
- Session requirement:
  - all protected features require authenticated session

### Profile

- Table: `profiles`
- Main reads:
  - full profile on auth load
  - profile fields in `AppContext`
  - points in `GamificationContext`
- Main writes:
  - onboarding completion
  - profile goal/training-day edits
  - points updates
- Important fields used by UI:
  - `name`
  - `birth_date`
  - `weight`
  - `height`
  - `goal`
  - `training_days_per_week`
  - `daily_calorie_goal`
  - `daily_protein_goal`
  - `daily_carbs_goal`
  - `daily_fat_goal`
  - `daily_water_goal`
  - `training_environment`
  - `available_equipment`
  - `restrictions_notes`
  - `injury_notes`
  - `exercise_preferences`
  - `exercise_avoidances`
  - `diet_preferences`
  - `food_avoidances`
  - `onboarding_completed`
  - `points`

---

## 3. Workouts and Routines

### Tables

- `workout_templates`
- `template_exercises`
- `exercises`
- `workout_sessions`

### Main reads

- fetch all templates ordered by `created_at`
- fetch all `template_exercises` for those templates
- fetch exercises library rows
- fetch workout sessions for current user

### Main writes

- create custom workout in `workout_templates`
- create exercises in `template_exercises`
- update personal workout if owned
- delete personal workout and child template exercises
- create and maintain featured editorial workouts for the user
- create ELLIE workouts through `ellieActions`

### Ownership and permission rules

- library workouts are viewable but not user-editable
- ELLIE-generated and personal routines can be edited/deleted only if owned
- helper: `packages/domain/src/workout-ownership.ts`

### Derived state logic

- templates + child exercises are mapped into UI `Workout` models
- featured editorial routines are deduped by canonical source
- source types:
  - library
  - ELLIE
  - personal
  - featured editorial subtype inside library

---

## 4. Workout Session State

### Table

- `workout_sessions`

### Read/write behavior

- load today’s session using local-day semantics
- cancel stale in-progress sessions from previous days
- allow resumable canceled same-day session
- create new in-progress session if needed
- debounced updates of `completed_exercises`
- finish session -> mark `completed`
- cancel session -> mark `canceled`
- resume session -> restore `in_progress`

### Fields actively used

- `workout_id`
- `workout_title`
- `status`
- `started_at`
- `ended_at`
- `duration`
- `calories_burned`
- `completed_exercises`
- `total_exercises`
- `date`

### RN-sensitive notes

- current web implementation uses `window` focus and `document.visibilitychange` to refresh session state
- RN CLI must replace that with `AppState` or navigation focus listeners

---

## 5. Nutrition

### Tables

- `nutrition_plans`
- `daily_nutrition_logs`

### Reads

- active nutrition plan for user
- last 30 days of daily nutrition logs

### Writes

- deactivate active plan
- accept ELLIE nutrition plan
- upsert/log daily nutrition values

### Rules

- only one `is_active = true` nutrition plan should exist
- plan source can be manual or ELLIE
- Home, Progress, and ELLIE all depend on current plan/log state

### Important derived logic

- today log lookup uses local formatted date
- nutrition adherence calculations feed progress and ELLIE context

---

## 6. Hydration

### Tables

- `daily_hydration_logs`
- `profiles` for `daily_water_goal`

### Reads

- last 14 days hydration logs for streak calculation
- last 7 days subset for chart

### Writes

- update or insert same-day hydration log row

### Rules

- one hydration row per user/date
- hydration goal is stored in glasses in profile, converted to 250 ml units in UI logic

### Derived client logic

- `packages/domain/src/hydration.ts`
  - streak
  - chart data
  - weekly summary
- badges are unlocked from derived thresholds, not from a backend job

---

## 7. Core 33 Challenge

### Tables

- `challenge_participations`
- `habit_logs`

### Reads

- active challenge participation for user
- all habit logs for active participation

### Writes

- create active participation with JSON habits payload
- upsert daily habit log by participation/date/index
- restart challenge by marking current participation `abandoned`

### Rules

- UI assumes one active participation at a time
- daily challenge state is reconstructed from `habit_logs`
- challenge habit categories are:
  - training
  - health
  - mind

### Derived logic

- `packages/domain/src/core33.ts`
  - current day
  - completed days
  - current streak
  - longest streak
  - completion by date

---

## 8. ELLIE AI

### Persistence and transport

- Edge Function: `supabase/functions/ellie-chat/index.ts`
- Chat history table: `chat_messages`

### Frontend reads

- load stored messages from `chat_messages`
- build ELLIE context from profile, sessions, nutrition, hydration, challenge, and points

### Frontend writes

- insert user and assistant messages into `chat_messages`
- delete all `chat_messages` for “clear chat”
- save generated workout to:
  - `workout_templates`
  - `template_exercises`
- save generated nutrition plan to:
  - `nutrition_plans`

### Edge Function behavior

- fetches real exercise library from `exercises`
- uses tool-calling to generate:
  - workout plan
  - nutrition plan
- returns either:
  - text response
  - tool result payload
  - SSE-compatible streaming text payload for frontend parser

### Shared reusable logic

- `packages/domain/src/ellie-context.ts`
- `packages/domain/src/ellie-engine.ts`
- `packages/data/src/ellie-client.ts`

### RN-sensitive notes

- chat streaming, markdown rendering, and keyboard handling must be rebuilt natively
- backend contract itself is reusable

---

## 9. Exercises

### Table

- `exercises`

### Reads

- paginated fetch of full exercise library
- exercise lookup by name for routine-detail linking

### Uses across features

- exercise library
- workout detail mapping
- ELLIE tool generation grounding
- PR exercise naming

### Shared reusable logic

- `packages/data/src/exercises.ts`

---

## 10. Personal Records

### Table

- `personal_records`

### Reads

- all user PRs
- PRs filtered by exercise

### Writes

- insert new PR
- delete PR

### Derived logic

- `packages/domain/src/personal-records.ts`
  - PR types
  - label/unit maps
  - main-value selection
  - formatting
  - best PR selection

---

## 11. Quiz

### Tables

- `quiz_categories`
- `quiz_questions`
- `quiz_attempts`

### Reads

- active quiz categories
- active questions by category
- existing attempts by user

### Writes

- insert quiz attempt with score, correct count, total questions, points earned

### Rules

- quiz session assembles a 10-question set from difficulty tiers
- perfect-score bonus logic is client-side
- quiz-master badge is computed by checking attempts across all active categories

---

## 12. Gamification

### Tables

- `profiles`
- `user_badges`

### Reads

- `profiles.points`
- earned badge rows

### Writes

- increment points by reason
- insert earned badge if not already present

### Important rule

- badge catalog is currently client-defined in `GamificationContext`, while earned state is persisted in `user_badges`

### RN note

- badge catalog can move into shared domain config later, but current behavior must be preserved

---

## 13. Feature-to-Backend Matrix

| Feature | Tables / Functions | Notes |
|---|---|---|
| Auth | Supabase Auth, `profiles` | session gate + profile lookup |
| Onboarding | `profiles` | sets onboarding fields |
| Home | many aggregate reads | derived daily dashboard |
| Workouts | `workout_templates`, `template_exercises`, `exercises` | browse and ownership rules |
| Workout session | `workout_sessions` | status machine |
| Exercise library | `exercises` | searchable catalog |
| Favorites | local storage only | not yet backend-backed |
| Nutrition | `nutrition_plans`, `daily_nutrition_logs` | active-plan model |
| Hydration | `daily_hydration_logs`, `profiles` | quick logging + derived streaks |
| Core 33 | `challenge_participations`, `habit_logs` | 33-day habit tracker |
| ELLIE | `chat_messages`, `ellie-chat`, workouts/nutrition tables | AI + persistence |
| Progress | workouts, nutrition, hydration, PRs, challenge tables | all derived analytics |
| PRs | `personal_records` | record entry and history |
| Quiz | `quiz_categories`, `quiz_questions`, `quiz_attempts` | scored learning flow |
| Profile | `profiles`, `user_badges` | points, badges, editable setup |
| Notifications | derived from current state | no server inbox table |

---

## 14. Portable Code Pointers

- domain rules: `packages/domain`
- backend-facing helpers: `packages/data`
- design constants: `packages/design-tokens`

Use `docs/RN_SHARED_PORTABILITY.md` together with this file when setting up the separate RN CLI repo.
