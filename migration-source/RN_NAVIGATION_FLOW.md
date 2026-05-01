# Athelete — React Native Navigation Flow

> Purpose: explicit navigation reference for rebuilding the product in a separate RN CLI app.

---

## 1. Current Product Navigation Model

### Route groups in the web app

- Auth routes
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/reset-password`
  - `/onboarding`
- Protected tab routes
  - `/inicio`
  - `/entrenos`
  - `/ellie`
  - `/progreso`
  - `/perfil`
- Protected detail routes
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

### Current shell behavior

- auth and protected app are separated at layout level
- protected app wraps:
  - `AuthProvider`
  - `AppProvider`
  - `GamificationProvider`
  - `WorkoutSessionProvider`
- main tabs stay persistent at the bottom
- detail routes push over the tab shell

---

## 2. Recommended RN CLI Navigator Structure

### Root navigator

- `RootStack`
  - `SplashGate`
  - `AuthStack`
  - `OnboardingStack`
  - `MainTabs`
  - modal/presented overlays if needed later

### Auth stack

- `LoginScreen`
- `RegisterScreen`
- `ForgotPasswordScreen`
- `ResetPasswordScreen`

### Onboarding stack

Preferred options:

- Option A:
  - `OnboardingIntro`
  - `OnboardingGoal`
  - `OnboardingBodyData`
  - `OnboardingTrainingDays`
- Option B:
  - one `OnboardingScreen` with internal stepper

Recommendation:

- use a true stack in RN CLI because it gives cleaner back behavior and easier analytics

### Main tabs

- `HomeTab`
- `WorkoutsTab`
- `EllieTab`
- `ProgressTab`
- `ProfileTab`

### Nested stacks by tab

- `HomeStack`
  - `HomeScreen`
  - can push notifications, challenge, workout detail, exercise detail, favorites, PR, quiz, nutrition
- `WorkoutsStack`
  - `WorkoutsScreen`
  - `WorkoutDetailScreen`
  - `WorkoutSessionScreen`
  - `RoutineBuilderScreen`
  - `EditRoutineScreen`
  - `ExerciseDetailScreen`
- `EllieStack`
  - `EllieScreen`
  - can push Body Science article, workout detail, challenge, nutrition as needed
- `ProgressStack`
  - `ProgressScreen`
  - `PRHistoryScreen`
  - `BodyScienceArticleScreen`
  - `Core33Screen`
- `ProfileStack`
  - `ProfileScreen`
  - `NotificationsScreen`
  - optional profile edit/settings sub-screens if split later

---

## 3. Entry Logic

### App launch

1. load Supabase session
2. if no session: open `AuthStack`
3. if session exists and onboarding incomplete: open `OnboardingStack`
4. if session exists and onboarding complete: open `MainTabs`

### Important redirect rules

- authenticated user should not remain in auth screens
- anonymous user should not access protected stacks
- onboarding must gate main tabs

---

## 4. Main Tab Flows

### Home

Entry points from Home:

- challenge banner -> Core 33 flow
- today workout -> workouts tab or active session
- nutrition card -> nutrition plan or nutrition logging
- hydration card -> hydration sheet
- ELLIE card -> ELLIE tab
- quiz card -> quiz landing
- recent PR card -> PR entry/history
- favorite workout rail -> workout detail
- favorite exercise rail -> exercise detail
- workout carousel -> workout detail
- header bell -> notifications

Back behavior:

- Home is a root tab; back should follow native platform tab behavior, not push deeper unless already on a detail screen

### Workouts

Primary routes:

- tab root = workouts browse screen
- workout item -> workout detail
- create -> routine builder
- exercise mode -> exercise library embedded in root screen
- exercise item -> exercise detail

Back behavior:

- from workout detail -> return to current workouts browse state
- from session -> back prompts save/exit logic if active

### ELLIE

Primary routes:

- tab root = ELLIE insights/chat
- recommendation actions can deep-link to:
  - workouts
  - nutrition
  - challenge
  - article detail

Back behavior:

- ELLIE as a root tab
- from article opened through ELLIE -> back returns to ELLIE

### Progress

Primary routes:

- tab root = dashboard/retos segmented screen
- PR card -> PR history
- Body Science card -> article detail
- Retos state -> Core 33 flow

### Profile

Primary routes:

- root = profile summary/settings screen
- notifications shortcut should open notifications
- edits may remain inline or move to sub-screens in RN

---

## 5. Detail Flow Map

### Workout flow

1. Home or Workouts -> `WorkoutDetail`
2. `WorkoutDetail` -> `WorkoutSession`
3. `WorkoutSession`
   - finish -> session summary dialog, then route remains stable until user chooses next action
   - back during active session -> save/cancel flow
4. `WorkoutDetail` -> linked `ExerciseDetail`
5. `WorkoutDetail` -> edit routine if owned

### Exercise flow

1. Workouts tab exercise library or favorites or workout detail -> `ExerciseDetail`
2. `ExerciseDetail` can branch to:
   - PR history
   - add/replace routine dialogs
   - related routine detail
   - Body Science article

### Core 33 flow

1. Home or Progress -> Core 33
2. if no active challenge:
   - intro -> choose habits -> summary -> tracker
3. if active challenge:
   - open tracker directly

### Quiz flow

1. Home or dedicated route -> quiz landing
2. category -> quiz questions
3. questions -> result
4. result -> retry same category or go home

### PR flow

1. Home recent PR or Progress card or Exercise Detail -> PR history or register sheet
2. register sheet -> updates PR summary/history

### ELLIE flow

1. Home/Tab -> ELLIE screen
2. insights actions -> chat prefill or feature deep link
3. chat generated result -> accept/save -> route to workouts or nutrition remains optional

---

## 6. Modal and Sheet Flows

Current modal-like interactions are screen-local, not route-level:

- workout delete confirmation
- nutrition deactivate confirmation
- hydration log / goal sheet
- PR register sheet
- add to routine dialog
- replace in routine dialog
- exercise video modal
- wear preview dialog

RN recommendation:

- keep most of these as component-level modals or bottom sheets
- do not create separate navigation routes unless the flow becomes large or multi-step

---

## 7. Back Behavior Rules

### General rule

- use normal stack back when there is actual in-app history
- otherwise fall back to the owning parent surface

### Current web fallback expectations

- workout detail fallback -> `/entrenos`
- workout session fallback -> `/entrenos`
- auth back links usually point to login
- notifications back -> Home

### RN translation

- each pushed detail screen should know its logical parent stack
- session/player is special:
  - active session back should not silently discard work
- onboarding should back step by step
- auth stack should respect standard stack back

---

## 8. Important Entry Points To Preserve

- Notifications badge from Home header
- Continue workout from Home
- Home ELLIE card and recommendations into ELLIE chat
- Exercise detail from workout detail
- PR history from progress and exercise detail
- Body Science article from progress and ELLIE
- Favorites full screens from Home rails
- Core 33 from both Home and Progress

---

## 9. Recommended RN CLI Navigation Libraries

- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- optional:
  - `react-native-screens`
  - `react-native-safe-area-context`
  - bottom sheet library for non-route overlays

The navigation rebuild should follow this doc, not the exploratory `apps/mobile` scaffold in this repo.
