# Athelete — React Native Feature Handoff

> Purpose: feature-by-feature migration blueprint for rebuilding the product in a separate React Native CLI repository.

---

## 1. Authentication

- What it does:
  - email/password login
  - account registration
  - email verification requirement
  - forgot/reset password
- Screens:
  - login
  - register
  - forgot password
  - reset password
- User actions:
  - sign in
  - sign up
  - request reset email
  - set new password
- Backend dependencies:
  - Supabase Auth
  - `profiles` table for post-auth profile lookup
- Business rules:
  - authenticated user without onboarding goes to onboarding
  - authenticated user with onboarding goes to main app
- Edge cases:
  - verification email sent but user not yet verified
  - invalid credentials
  - expired password recovery state

## 2. Onboarding

- What it does:
  - captures goal, birth date, weight, height, training frequency
  - marks onboarding complete
- Screens:
  - 4-step onboarding flow
- User actions:
  - select goal
  - enter body data
  - choose weekly training frequency
  - submit profile
- Backend dependencies:
  - `profiles`
- Business rules:
  - onboarding is required before protected app access
  - current flow captures only core fields, not all profile preferences
- Edge cases:
  - partial data
  - validation failures
  - failure saving profile update

## 3. Home / Daily Dashboard

- What it does:
  - central feed for daily engagement and launch points
- Screens:
  - Home tab
  - Notifications as derived follow-up
- User actions:
  - start or continue workout
  - open nutrition
  - log hydration
  - open ELLIE
  - open quiz
  - open favorites
  - open PR flow
  - open challenge
- Backend dependencies:
  - indirect aggregate state from `profiles`, `workout_sessions`, `nutrition_plans`, `daily_nutrition_logs`, `daily_hydration_logs`, `challenge_participations`, `habit_logs`, `personal_records`, `user_badges`
- Business rules:
  - cards are personalized from current day/week context
  - notification count is based on ELLIE nudges, not a push inbox
- Edge cases:
  - missing plan
  - no workout today
  - no hydration goal
  - no favorites

## 4. Workouts Library

- What it does:
  - surfaces library routines, ELLIE-generated routines, and personal routines
  - supports search, filtering, and favorites
- Screens:
  - Workouts tab
  - Workout detail
  - Routine builder/create
  - Routine edit
- User actions:
  - browse routines
  - filter by type and source
  - open workout detail
  - favorite/unfavorite
  - create/edit/delete personal routines
- Backend dependencies:
  - `workout_templates`
  - `template_exercises`
  - `exercises`
- Business rules:
  - source partitioning matters: library vs ELLIE vs mine
  - edit/delete depends on ownership via workout access rules
  - featured editorial routines are injected and deduped
- Edge cases:
  - duplicate featured routines
  - routines missing image or exercise links
  - personal routine deletion while sessions still reference it

## 5. Workout Session / Player

- What it does:
  - starts, resumes, saves, cancels, and completes a workout session
- Screens:
  - session/player screen
  - finish summary dialog
- User actions:
  - start workout
  - check exercises complete/incomplete
  - save for later
  - finish session
  - view linked exercise detail
- Backend dependencies:
  - `workout_sessions`
- Business rules:
  - one effective session for the day is maintained
  - stale in-progress sessions are canceled on load
  - toggled completed exercises are debounced to persistence
  - completion/cancel state changes duration and status
- Edge cases:
  - session resumed same day
  - completed session exists for another workout today
  - app lifecycle can desync timer if not handled correctly in RN

## 6. Exercise Library and Detail

- What it does:
  - searchable exercise catalog and instructional detail
- Screens:
  - exercise library
  - exercise detail
- User actions:
  - search
  - filter
  - favorite
  - open video
  - open related routines
  - register PR
- Backend dependencies:
  - `exercises`
  - `personal_records`
- Business rules:
  - favorites are client-side only today
  - some routine exercises do not map cleanly to library entries
- Edge cases:
  - no video
  - no related routines
  - missing exercise-library mapping by name

## 7. Favorites

- What it does:
  - saved workout and exercise shortcuts
- Screens:
  - favorite workouts
  - favorite exercises
  - Home rails
- User actions:
  - save/unsave
  - revisit saved content
- Backend dependencies:
  - none today; local storage only
- Business rules:
  - favorites are device-local and not synced
- Edge cases:
  - routine removed from backend but ID still in local favorites
  - cross-device inconsistency

## 8. Nutrition

- What it does:
  - shows active nutrition plan and daily logging state
  - accepts ELLIE-generated plans
- Screens:
  - nutrition plan
  - logging sheet
  - Home nutrition card
- User actions:
  - view plan
  - log daily nutrition
  - deactivate plan
  - accept ELLIE plan
- Backend dependencies:
  - `nutrition_plans`
  - `daily_nutrition_logs`
- Business rules:
  - only one active plan should exist at a time
  - ELLIE acceptance deactivates the previous plan
  - Home card and progress screens depend on latest log state
- Edge cases:
  - no active plan
  - pending AI-generated plan not yet accepted
  - plan deactivation failure

## 9. Hydration

- What it does:
  - quick-add water logging, streak tracking, and weekly charting
- Screens:
  - Home hydration card
  - hydration logging sheet
  - progress hydration chart
- User actions:
  - add 250 ml / 500 ml
  - custom log amount
  - define hydration goal
- Backend dependencies:
  - `daily_hydration_logs`
  - `profiles` for goal
- Business rules:
  - one log row per day per user
  - hydration streaks and weekly summary are derived client-side
  - badge unlocks happen off derived state
- Edge cases:
  - no goal set
  - partial week data
  - same-day optimistic updates needing rollback

## 10. Core 33 Challenge

- What it does:
  - 33-day habit challenge with 3 habits across training, health, mind
- Screens:
  - intro
  - choose habits
  - summary
  - tracker
  - progress tab “Retos” summary state
- User actions:
  - choose habits
  - start challenge
  - toggle daily habits
  - restart challenge
- Backend dependencies:
  - `challenge_participations`
  - `habit_logs`
- Business rules:
  - only verified toggle actions count
  - one active participation at a time is assumed
  - streak/current day/completion are derived from persisted logs
- Edge cases:
  - challenge not started
  - active challenge
  - completed challenge
  - restarting challenge abandons current participation

## 11. ELLIE AI

- What it does:
  - smart insights
  - nudges
  - weekly summary
  - conversational coaching
  - workout and nutrition generation
- Screens:
  - ELLIE screen with insights tab and chat tab
  - Home ELLIE card
  - Home nudges and recommendations
  - notifications screen
- User actions:
  - prefill chat prompts
  - chat with ELLIE
  - generate workout
  - generate nutrition plan
  - save/discard generated outputs
  - clear chat history
- Backend dependencies:
  - `chat_messages`
  - `workout_templates`
  - `template_exercises`
  - `nutrition_plans`
  - `exercises`
  - `profiles`
  - `workout_sessions`
  - `daily_nutrition_logs`
  - `challenge_participations`
  - `habit_logs`
  - Edge Function: `ellie-chat`
- Business rules:
  - insights/nudges/recommendations are largely deterministic from context
  - workout generation should use real exercise IDs from the library
  - saved generated plans become normal app data
- Edge cases:
  - empty chat history
  - network or Edge Function failure
  - malformed tool result
  - regeneration and discard flows

## 12. Progress

- What it does:
  - training, nutrition, hydration, challenge, and PR insight aggregation
- Screens:
  - Progress dashboard
  - Progress challenge summary
- User actions:
  - switch time range
  - open article
  - jump to PR history
  - open challenge
- Backend dependencies:
  - `workout_sessions`
  - `daily_nutrition_logs`
  - `daily_hydration_logs`
  - `personal_records`
  - challenge tables via AppContext
- Business rules:
  - charts are derived client-side
  - ELLIE progress insights are deterministic summary generation
- Edge cases:
  - limited history
  - no PRs
  - no active challenge

## 13. Personal Records

- What it does:
  - PR registration and history per exercise
- Screens:
  - PR register entry
  - PR history
  - PR summary card on exercise detail and progress
- User actions:
  - add PR
  - filter by PR type
  - delete PR
- Backend dependencies:
  - `personal_records`
- Business rules:
  - best PR and chart series are derived in the client
  - types support weight/reps, max weight, duration, distance
- Edge cases:
  - mixed PR types per exercise
  - single-point history with no chart

## 14. Quiz / Learning

- What it does:
  - category-based quiz system with points and badge rewards
- Screens:
  - quiz landing
  - question flow
  - result screen
- User actions:
  - choose category
  - answer questions
  - retry quiz
- Backend dependencies:
  - `quiz_categories`
  - `quiz_questions`
  - `quiz_attempts`
- Business rules:
  - active quiz pulls a 10-question mixed difficulty set
  - perfect score awards bonus points
  - `quiz_master` depends on perfect scores across all active categories
- Edge cases:
  - empty category
  - no attempts yet
  - loading between categories and questions

## 15. Profile / Settings / Achievements

- What it does:
  - displays personal profile, metrics, points, badges, setup summary, and sign-out
- Screens:
  - Profile tab
- User actions:
  - edit goal and training days
  - view achievements
  - theme toggle
  - sign out
- Backend dependencies:
  - `profiles`
  - `user_badges`
- Business rules:
  - theme is currently web-local
  - points and badges come from gamification state
- Edge cases:
  - user has incomplete metrics
  - no badges yet

## 16. Notifications

- What it does:
  - derived list of proactive ELLIE nudges with action routing
- Screens:
  - notifications screen
- User actions:
  - act on a reminder
  - dismiss a reminder
- Backend dependencies:
  - no direct notification table
  - derived from ELLIE context and current user state
- Business rules:
  - dismissals are local UI state, not persisted
- Edge cases:
  - no active nudges

## 17. Gamification

- What it does:
  - points, badges, unlock logic, and achievement presentation
- Screens touched:
  - Home
  - workout session
  - hydration
  - quiz
  - Core 33
  - Profile
- Backend dependencies:
  - `profiles.points`
  - `user_badges`
- Business rules:
  - point values are reason-based
  - badge unlocks should be idempotent
- Edge cases:
  - optimistic point updates
  - duplicate unlock attempts

---

## 18. Migration Use

This file should be treated as the feature contract for the new RN CLI app:

- `RN_UI_HANDOFF.md` explains how each surface looks and flows
- `RN_COMPONENT_MAP.md` explains reusable UI building blocks
- `RN_BACKEND_BINDINGS.md` explains feature-to-backend mapping
