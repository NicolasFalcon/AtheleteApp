# Athelete — React Native UI Handoff

> Purpose: screen-by-screen UI/UX reference for rebuilding the current product in a brand-new React Native CLI repository.  
> Scope: current product behavior and visual hierarchy from this repo.  
> Note: `apps/mobile` in this repo is not the target implementation. The target is a separate RN CLI app.

---

## 1. Global UI Principles

### Visual language

- Mobile-first, single-column layouts
- Heavy use of rounded cards, soft borders, muted grayscale surfaces, and accent color only when needed
- Sticky headers and sticky bottom CTA bars are common
- Safe-area-aware top and bottom spacing is expected on nearly every screen
- Home, Workouts, Progress, and Profile are scrollable feeds rather than dense dashboards
- ELLIE, workout session, and auth flows rely on focused single-screen interactions

### Reusable shell behavior

- Auth and onboarding screens are full-screen centered flows
- Main app shell uses five bottom tabs
- Detail screens generally push over the current tab and keep their own back button
- Many screens use sticky top headers with a left back button and compact title
- Most destructive actions are confirmed via dialog
- Bottom sheets/dialogs are used for hydration logging, PR registration, exercise video playback, and some choice dialogs

### Common state treatments

- Loading: skeleton cards for tab screens, spinner/placeholder for list-based screens
- Empty: centered icon + short explanation + recovery CTA
- Success: celebratory banners, updated stat chips, and sometimes achievement/badge side effects
- Error: inline text blocks or alert-style destructive banners; errors are usually short and local to the action

---

## 2. Auth Flow

### Login

- Route: `/login`
- Purpose: email/password entry for existing users
- Layout:
  - centered brand mark
  - welcome title + short subtitle
  - inline form error card if auth fails
  - stacked email and password fields
  - forgot-password text link
  - primary full-width submit button
  - bottom text link to register
- Primary CTAs:
  - `Iniciar sesión`
  - `¿Olvidaste tu contraseña?`
  - `Crear cuenta`
- Important states:
  - field-level validation
  - password show/hide toggle
  - button loading state with spinner
  - redirect to onboarding if authenticated but not onboarded
- RN notes:
  - keyboard avoidance is required
  - keep password visibility affordance
  - preserve simple vertical rhythm and centered brand block

### Register

- Route: `/register`
- Purpose: create account and trigger email verification
- Layout:
  - same auth shell as login
  - name, email, password, confirm password
  - full-width submit
  - bottom link to login
- Success state:
  - replaces form with “check your email” confirmation card
  - prominent mail icon and `Volver a iniciar sesión` button
- Important states:
  - form validation
  - password visibility toggle
  - submission state
  - post-signup verification confirmation replaces screen content

### Forgot password

- Route: `/forgot-password`
- Purpose: start password reset flow
- Layout:
  - brand mark + back-to-login text link
  - title and short instructions
  - single email field
  - full-width submit
- Success state:
  - full-screen confirmation that reset email was sent
- RN notes:
  - preserve simple single-purpose screen
  - reset redirect behavior belongs to backend/auth integration, not UI

### Reset password

- Route: `/reset-password`
- Purpose: finish password reset from email link
- Current notes:
  - part of auth flow and should be rebuilt as a dedicated single-purpose screen
  - depends on Supabase recovery session handling

---

## 3. Onboarding Flow

### Onboarding stepper

- Route: `/onboarding`
- Purpose: collect the minimum profile data needed for personalization
- Structure:
  - brand mark at top
  - horizontal 4-step progress bar
  - one focused step at a time
  - bottom navigation buttons
- Steps:
  1. intro / setup welcome
  2. goal selection
  3. body data
  4. training frequency
- Visual hierarchy:
  - large title
  - short supporting text
  - one input mode per step
  - previous/next controls
- Important CTAs:
  - `Comenzar`
  - `Continuar`
  - `Completar configuración`
- States:
  - selected goal card styling
  - validation errors for birth date, weight, height
  - disabled finish until training frequency exists
- RN notes:
  - this should become a stack flow, not a single huge screen if that feels cleaner natively
  - preserve progress indicator and simple high-confidence decision UI

---

## 4. Home / Inicio

### Home tab

- Route: `/inicio`
- Purpose: primary daily dashboard and launch surface
- Layout:
  - sticky greeting header with avatar initials and notifications bell
  - vertical feed of modular cards
  - no large hero image; emphasis is on actionable stacked modules
- Current card order:
  1. Challenge banner
  2. Today workout card
  3. Nutrition card
  4. Hydration card
  5. ELLIE card
  6. Quiz card
  7. Recent PR card
  8. Recovery guidance card
  9. Wear banner
  10. Favorite workouts rail
  11. Favorite exercises rail
  12. Workout carousel
- Key interactions:
  - notifications bell opens notifications screen
  - cards deep-link into tabs and detail flows
  - hydration quick-add acts inline
  - favorite sections and carousel are horizontally scrollable
- Loading state:
  - header still shows
  - feed replaced with stacked skeleton blocks
- RN notes:
  - use `ScrollView` or `FlashList` with mixed cards
  - preserve horizontal rails inside the main vertical feed
  - safe-area top and tab-bar bottom padding are important

### Header

- Purpose: personalized greeting + notification entry
- Visual hierarchy:
  - left: avatar circle with initials
  - middle: greeting and user name
  - right: bell with notification count badge
- Behavior:
  - badge count is based on active ELLIE nudges, not a server notification inbox

### Today workout card

- Purpose: summarize current workout session state
- States:
  - idle: user has not trained today, CTA to choose workout
  - in progress: shows workout title, exercise progress, CTA to continue
  - resumable canceled: same as in progress but framed as resumable
  - completed: celebratory completed state with summary chips and “view summary”
- RN notes:
  - this component is high priority because it bridges Home and the workout session player

### Hydration card

- Purpose: lightweight hydration logging without leaving Home
- Layout:
  - title row with liters progress
  - circular progress ring with glass/water icon
  - large current glasses count
  - two quick-add buttons
  - text link to open detailed hydration sheet
- States:
  - no hydration goal defined
  - normal tracking
  - goal reached
- Overlay:
  - bottom-sheet style hydration log / goal editing

### ELLIE card

- Purpose: premium-feel AI entry card on Home
- Layout:
  - large visual card with image background and dark overlay
  - ELLIE branding chip
  - primary insight text
  - primary `Habla con ELLIE` CTA
  - optional secondary CTA for generation-type actions

---

## 5. Workouts

### Workouts tab

- Route: `/entrenos`
- Purpose: browse workout routines and exercise library within one tab
- Top-level structure:
  - segmented toggle between `Rutinas` and `Ejercicios`
  - when in routines mode:
    - page title + `Crear` CTA
    - source toggle: Biblioteca / ELLIE / Mis rutinas
    - search bar
    - horizontal filter chips
    - optional featured editorial routines rail
    - vertical workout list
  - when in exercise mode:
    - renders Exercise Library screen inside the tab
- Important states:
  - loading skeletons
  - no results
  - favorites-only empty state
  - separate empty copy by routine source
- RN notes:
  - source toggle and mode toggle should become reusable segmented controls
  - list virtualization matters; workouts and exercises can grow

### Workout detail

- Route: `/workouts/[workoutId]`
- Purpose: detailed routine overview before starting
- Layout:
  - large hero image with gradient overlay
  - floating back button on hero
  - top-right quick actions: edit, delete, favorite
  - elevated content card overlapping hero
  - routine title, badges, metadata chips
  - stats row: duration, calories, exercise count
  - exercise list as tappable rows
  - sticky bottom full-width `Empezar` CTA
- Important states:
  - ownership label and description for library/ELLIE/personal routines
  - delete confirmation dialog
  - some exercise rows are non-clickable if no library match exists
- RN notes:
  - overlap-card pattern should be preserved
  - destructive dialog and sticky bottom CTA are core to the experience

### Workout session / player

- Route: `/workouts/[workoutId]/session`
- Purpose: active checklist-based workout execution
- Layout:
  - sticky compact session header with back, title, progress summary, timer
  - progress bar under header
  - vertical checklist of exercises
  - each row includes order number, exercise title, set/rep line, completion toggle
  - sticky bottom `Finalizar entreno` CTA
- Important behaviors:
  - entering the route auto-starts or resumes the session
  - back during active session triggers save/cancel dialog behavior instead of immediate exit
  - tapping exercise opens linked exercise detail when possible
  - finish persists session and opens summary dialog
- Overlays:
  - finish summary dialog
  - cancel/save-for-later confirmation dialog
  - fallback sheet if exercise is not mapped to library
- RN notes:
  - timer, persistence, and app lifecycle handling are critical
  - this is one of the hardest rebuild areas

### Routine builder

- Route: `/workouts/new` and `/workouts/[workoutId]/edit`
- Purpose: create or edit custom routines
- Current status:
  - exists as a feature screen and should be treated as a full-screen builder flow in RN
  - high-value but later-phase feature compared with browse/detail/session

---

## 6. Exercise Library

### Exercise library

- Rendered inside Workouts tab when `Ejercicios` is active
- Purpose: searchable, filterable exercise catalog
- Layout:
  - top card with title, subtitle, result count
  - all/favorites mode toggle
  - search input
  - filter summary line
  - three filter groups: equipment, body part, level
  - vertical exercise list
- Important states:
  - loading spinner
  - no general results
  - no favorites saved
- RN notes:
  - horizontal chip rows should scroll smoothly
  - search/filter state belongs close to the screen

### Exercise detail

- Route: `/exercises/[exerciseId]`
- Purpose: instructional detail page for a single exercise
- Layout:
  - hero image with grayscale treatment
  - back button and favorite button over hero
  - optional floating play button for technique video
  - stacked content cards:
    - summary and labels
    - how to perform
    - coaching cues
    - common mistakes
    - muscles worked
    - recommended sets/reps
    - PR summary
    - used-in-routines section
  - sticky bottom dual CTA bar:
    - replace in routine
    - add to routine
- Overlays:
  - technique video modal
  - add-to-routine dialog
  - replace-in-routine dialog
  - PR registration sheet
- RN notes:
  - this page has many stacked cards but simple flow; it is a good early RN detail screen

---

## 7. Favorites

### Favorite workouts

- Route: `/favorites/workouts`
- Purpose: dedicated list of saved routines
- Layout:
  - sticky header with back and count
  - empty state if no favorites
  - vertical list of wide workout cards with image, metadata, muscle chips, heart toggle

### Favorite exercises

- Route: `/favorites/exercises`
- Purpose: dedicated list of saved exercises
- Layout:
  - sticky header with back and count
  - empty state if no favorites
  - vertical list of exercise cards with thumbnail, body part/equipment chips, heart toggle

### Home favorite rails

- Purpose: quick horizontal saved-content access on Home
- RN notes:
  - keep full screens and Home rails visually related but not identical
  - favorites currently persist client-side only

---

## 8. Nutrition and Hydration

### Nutrition plan screen

- Route: `/nutrition/plan`
- Purpose: show active macro plan and allow deactivation
- Layout:
  - sticky top header with back and goal subtitle
  - large calorie target hero text
  - stacked cards:
    - macros
    - daily structure
    - general guidelines
    - supplements
    - plan status / cancel action
- Important states:
  - screen only renders when a plan exists
  - deactivation confirmation dialog
  - deactivation error inline in dialog
- RN notes:
  - meal structure and guidelines are presentation-heavy and straightforward to rebuild

### Daily nutrition logging

- Current UI pattern:
  - driven from Home nutrition card and logging sheet
  - should be rebuilt as a bottom sheet or modal form in RN
- Key states:
  - no active plan
  - active plan but no log today
  - log exists today

### Hydration

- Primary entry is Home hydration card
- Secondary detail is progress chart history
- Key interaction pattern:
  - quick add on card
  - open sheet for custom amount / goal management

---

## 9. Core 33 Challenge

### Core 33 intro

- Route: `/challenges/core-33`
- Screen 1 purpose: explain challenge and invite user in
- Layout:
  - top badge `Core · 33`
  - bold headline
  - short explanatory text
  - three “how it works” rows with icons
  - bottom full-width CTA

### Choose habits

- Screen 2 purpose: select one habit for each pillar
- Layout:
  - title and helper text
  - three stacked pillar cards: training, health, mind
  - each card includes preset chips + custom text input
  - live “your selection” summary card when partial input exists
  - bottom CTA + back text button
- Validation:
  - all three pillars must be filled

### Summary / commitment

- Screen 3 purpose: confirm the challenge before start
- Layout:
  - stacked habit summary cards
  - explanatory commitment card
  - three small stat tiles: start, duration, habits
  - date line
  - bottom confirm/back controls

### Tracker

- Active challenge screen purpose: daily completion and streak tracking
- Layout:
  - hero card with circular + linear progress
  - horizontally scrollable 33-day timeline strip
  - today’s habits checklist cards
  - success banner when all three are complete
  - two stat cards: current streak and longest streak
- Behaviors:
  - auto-scroll timeline to current day
  - each habit tap toggles persisted completion
  - completion can trigger points and badges
- RN notes:
  - this is a strong candidate for native polish, but logic is already defined

---

## 10. ELLIE

### ELLIE screen

- Route: `/ellie`
- Purpose: AI coach hub with insights and chat
- Layout:
  - sticky branded header with back button
  - 2-tab segmented control: `Análisis` / `Habla con ELLIE`

### Insights tab

- Layout order:
  1. briefing hero card
  2. prompt suggestion chips
  3. proactive nudges list
  4. recommendation cards
  5. weekly summary card
- Interaction model:
  - most cards prefill the chat rather than acting immediately
  - some nudge actions route directly to workouts, nutrition, challenge, or article detail

### Chat tab

- Purpose: persistent conversational AI interface
- Current behavior:
  - loads saved chat history from `chat_messages`
  - stores user/assistant messages
  - supports text replies and generated workout/nutrition preview cards
  - generated content can be accepted, saved, regenerated, or discarded
- RN notes:
  - keyboard handling, scroll anchoring, streaming text updates, and message persistence are major rebuild areas

---

## 11. Progress and PRs

### Progress tab

- Route: `/progreso`
- Purpose: analytics + challenge progress
- Layout:
  - page title
  - segmented control: `Dashboard` / `Retos`

### Dashboard sub-tab

- Layout:
  - ELLIE analysis card
  - time-range toggle (7 vs 30 days)
  - training volume chart
  - nutrition chart
  - water chart
  - personal records summary card
  - Body Science article card
- RN notes:
  - charts must be reimplemented with a native chart library

### Retos sub-tab

- Layout changes by challenge state:
  - not started: start card
  - active: progress card with circular progress and habit chips
  - completed: completion card with restart CTA

### PR history

- Route: `/pr/[exerciseId]`
- Purpose: historical view of personal records for one exercise
- Layout:
  - sticky header
  - optional type selector chips
  - best PR highlight card
  - line chart if there are 2+ records
  - history list with delete action
  - bottom register PR button

---

## 12. Quiz

### Quiz landing

- Route: `/quiz`
- Purpose: choose a knowledge category
- Layout:
  - sticky header with back
  - short quiz intro
  - list of category cards with icon, description, question count, best score, attempts

### Quiz question flow

- Route: `/quiz/[categoryId]`
- Purpose: answer a 10-question session
- Layout:
  - sticky header with category and question count
  - thin progress bar
  - question prompt
  - answer cards A/B/C/D
  - explanation card after answer
  - sticky bottom CTA for confirm / next / results
- States:
  - loading skeleton
  - no questions available
  - unanswered / correct / incorrect visual states

### Quiz result

- Purpose: completion summary
- Layout:
  - large score circle
  - message headline
  - stats row
  - optional perfect-score bonus card
  - retry and go-home CTAs

---

## 13. Profile and Notifications

### Profile tab

- Route: `/perfil`
- Purpose: personal identity, plan summary, points, achievements, settings-style actions
- Layout:
  - centered avatar and name block
  - compact stat row
  - points header
  - quick actions list
  - current setup card
  - achievements section
  - notifications and appearance toggles
  - sign-out action
- Important behaviors:
  - inline edit mode updates profile goal and training days
  - theme changes are currently web-local

### Notifications

- Route: `/notifications`
- Purpose: show actionable ELLIE nudges as a notification center
- Layout:
  - compact header
  - list of nudge cards
  - dismiss button on each card
  - empty state when all nudges are dismissed
- Important note:
  - this is not a server notifications inbox; it is a derived reminders screen

---

## 14. Rebuild Notes For RN CLI

- Recreate the shell and visual pacing first, not every micro-style exactly
- Preserve:
  - sticky headers
  - rounded card system
  - horizontal rail patterns
  - bottom CTA bars
  - segmented toggles
  - safe-area spacing
- Defer exact parity on:
  - dialog styling
  - chart visuals
  - markdown rendering details
  - some minor wearable/premium placeholder content

This file should be read together with:

- `docs/RN_FEATURE_HANDOFF.md`
- `docs/RN_COMPONENT_MAP.md`
- `docs/RN_NAVIGATION_FLOW.md`
- `docs/RN_BACKEND_BINDINGS.md`
- `docs/RN_SHARED_PORTABILITY.md`
- `docs/RN_IMPLEMENTATION_PRIORITIES.md`
