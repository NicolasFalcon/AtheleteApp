# Athelete — Project Overview

> Last updated: April 2026

---

## 1. Project Overview

| Field | Detail |
|-------|--------|
| **Product name** | Athelete |
| **Type** | Mobile-first fitness & wellness web application |
| **Target user** | Individuals pursuing fitness goals — beginners to intermediate athletes |
| **Purpose** | All-in-one platform combining AI coaching, workout management, nutrition/hydration tracking, habit challenges, gamification, and educational content |

Athelete delivers a native-app-like experience through a single-page React application with bottom-tab navigation, smooth transitions, and contextual AI assistance powered by **ELLIE**, the product's central intelligence layer.

---

## 2. Current User-Facing Experience

### 2.1 Authentication

- Email-based signup and login with real Supabase authentication
- Email verification required before first access
- Forgot-password flow: request link → email → reset screen
- Session persistence across browser restarts

### 2.2 Onboarding

A four-step post-signup flow that collects the data ELLIE needs for personalization:

1. **Goal selection** — lose weight, gain muscle, maintain, or improve health
2. **Body data** — birth date, weight (kg), height (cm)
3. **Training frequency** — preferred days per week
4. **Confirmation** — creates the user profile in the database

Once completed, the flag is persisted and the user is never asked again.

### 2.3 Home (Inicio)

The primary dashboard — a vertically scrollable feed of contextual cards:

| Card | Purpose |
|------|---------|
| Challenge Banner | Promotes the Athelete Core · 33 challenge |
| Today's Workout | Shows the assigned/recommended workout with start, continue, or summary actions |
| Nutrition Card | Displays daily macro progress; links to nutrition plan or ELLIE |
| Hydration Card | Tracks daily water intake with quick-add buttons and visual progress ring |
| ELLIE Nudge Banner | Proactive, context-aware reminders and celebrations |
| ELLIE Card | Quick-access entry point to the AI coach |
| Quiz Card | Entry to fitness knowledge quizzes |
| Go Premium Banner | Upsell for free-tier users |
| Recent PR Card | Latest personal record with registration CTA |
| Recovery Guidance | Recovery tips drawn from ELLIE context |
| Wearable Banner | Placeholder for future device integration |
| Favorite Workouts | Horizontal list of bookmarked routines |
| Favorite Exercises | Horizontal list of bookmarked exercises |
| Workout Carousel | AI-scored recommended workouts |

### 2.4 Workouts (Entrenos)

- Browse all workout templates from the database
- Filter by type: strength, cardio, fullbody, mobility, HIIT
- View workout details: exercise list, duration, difficulty, target muscles, estimated calories
- Create custom routines via the Routine Builder
- AI-generated workouts from ELLIE appear here with auto-assigned thematic thumbnails

### 2.5 Workout Player

- Real-time session tracking with exercise-by-exercise flow
- Timer and progress tracking per exercise
- Complete or cancel sessions — both states are persisted with duration, calories, and exercise completion data
- Session state machine: idle → in_progress → completed / canceled

### 2.6 Exercise Library

- Full searchable exercise database stored in Supabase
- Filter by muscle group
- Each card shows: name, muscle group, difficulty, equipment required
- Exercises can be favorited

### 2.7 Exercise Detail

Detailed view per exercise including:

- Step-by-step how-to instructions
- Primary and secondary muscle targets
- Technique cues and common mistakes
- Recommended sets/reps
- Video playback via modal (when URL available)

### 2.8 Favorites

- **Favorite Routines** — bookmarked workout templates with a dedicated browsing screen
- **Favorite Exercises** — bookmarked exercises with a dedicated browsing screen
- Both currently persist in localStorage (client-side only)

### 2.9 ELLIE (AI Coach)

See dedicated section below (§3).

### 2.10 Nutrition

- **Nutrition Plan** — active plan with calorie, protein, carbs, and fat targets
- **Daily Nutrition Logs** — log daily intake; progress shown on the Home nutrition card
- **Plan generation** — ELLIE can generate personalized nutrition plans via chat, which users can accept and activate
- **Nutrition Plan Screen** — detailed view with macro breakdown and adherence tracking

### 2.11 Hydration

- User-defined daily goal (stored as glass count, converted to 250 ml units)
- Quick-add presets and custom amount entry
- Visual progress ring on Home
- Data persisted in `daily_hydration_logs` using upsert (one record per user per day)
- 7-day history for charts
- Automatic streak detection (3-day, 7-day, weekly master)
- ELLIE integrates hydration data for nudges and celebrations

### 2.12 Athelete Core · 33 (Challenge)

A 33-day habit challenge centered on discipline:

- **Flow:** Intro (rules) → Choose Habits (one per pillar: Training, Health, Mindset) → Summary (commitment) → Daily Tracker
- 33-day horizontal timeline with auto-scroll to current day
- Hero card with linear and circular progress
- Category-specific icons: Dumbbell (Training), Heart (Health), Brain (Mindset)
- Success banner when all three daily habits are completed
- States: Not started / Active / Completed
- Current and longest streak tracking
- Persisted in Supabase (`challenge_participations` + `habit_logs`)

### 2.13 Progress (Progreso)

- Training Volume Chart — weekly workout session history
- Nutrition History Chart — daily calorie/macro trends
- Water History Chart — 7-day hydration visualization
- Athelete Core · 33 — challenge day count, streak, completion status
- Points & Badges — gamification summary with earned achievements

### 2.14 Personal Records (PRs)

- Register PRs for any exercise in the library
- PR types: weight, reps, duration, distance
- View PR history per exercise
- Recent PR card on Home
- Summary card with totals

### 2.15 Body Science

- Educational article library covering Training, Recovery, Nutrition, and Mindset
- Full article detail view with content rendering
- Read-time indicators and category filtering

### 2.16 Quiz / Learning

- Knowledge quiz system with multiple categories fetched from Supabase
- Question flow with correct answers, explanations, and point rewards
- Landing → Questions → Results with score breakdown
- Points and badges awarded for quiz completion
- Attempts persisted for history and leaderboard potential

### 2.17 Profile (Perfil)

- User name, email, body metrics, and goal display
- Points summary with progress visualization
- Earned badges and achievements section
- Account management

### 2.18 Premium / Paywall

- Free vs. Premium tier distinction in the UI
- Paywall modal when accessing premium-locked content
- Go Premium banner on Home
- Premium state managed via `usePremium` hook (client-side; no payment backend yet)

---

## 3. ELLIE — AI Coach

### 3.1 What ELLIE Is

ELLIE is the central AI assistant embedded throughout Athelete. She functions as a personal fitness coach, nutritionist, and motivator — always available but designed to feel helpful rather than intrusive.

### 3.2 Where ELLIE Lives

| Surface | Role |
|---------|------|
| Bottom navigation tab (sparkle icon) | Dedicated ELLIE screen with Insights + Chat |
| Home — ELLIE Card | Quick-access entry point |
| Home — Nudge Banner | Proactive reminders and celebrations |
| Home — Recovery Guidance | Recovery tips powered by context |
| Home — Workout Carousel | AI-scored workout recommendations |
| Nutrition Plan Screen | ELLIE-generated plans |
| Progress tab | ELLIE-powered insights |

### 3.3 What ELLIE Can Do

1. **Conversational coaching** — real-time chat via Google Gemini 3 Flash (Edge Function)
2. **Workout generation** — personalized workout plans from natural language using tool-calling; exercises matched to the real database library by ID
3. **Nutrition plan generation** — macro-targeted plans that users can accept and activate
4. **Smart insights** — data-driven analysis of workout frequency, nutrition adherence, challenge progress, and hydration
5. **Proactive nudges** — prioritized, non-invasive reminders surfaced on Home:
   - Missing workout reminders
   - Hydration nudges when below target
   - Core 33 streak celebrations
   - Nutrition logging reminders
   - Consecutive training day celebrations
6. **Workout recommendations** — multi-factor scoring engine ranking workouts by goal affinity, difficulty match, environment compatibility, injury awareness, user preferences, and novelty

### 3.4 Context ELLIE Uses

ELLIE receives a serialized user context including:

- Profile: goal, weight, height, training days, environment, equipment
- Recent workout sessions and training streaks
- Nutrition plan and daily logs
- Hydration data and streaks
- Core 33 challenge state and progress
- Exercise preferences and avoidances
- Injury and restriction notes
- Gamification state (points, badges)
- The full exercise library (for accurate workout generation)

### 3.5 Current Limitations

- No memory across sessions beyond stored chat history — no summarization or long-term recall
- Workout generation quality depends on exercise library coverage
- Strictly non-medical — encourages professional consultation for injuries/pain
- Nutrition plans are macro-level only (no meal-level planning or food database)
- Recommendation engine is deterministic scoring, not machine learning
- No image understanding or form analysis

---

## 4. Data and Persistence

All primary data is persisted in Supabase (PostgreSQL) with Row-Level Security (RLS).

| Domain | Table(s) | Notes |
|--------|----------|-------|
| User profiles | `profiles` | Goal, body metrics, onboarding state, equipment, preferences, dietary info, points |
| Workout templates | `workout_templates` | Public library + user-created + AI-generated |
| Template exercises | `template_exercises` | Exercises within each template, linked to exercise library |
| Exercise library | `exercises` | Full database with muscles, how-to, videos, technique cues, difficulty |
| Workout sessions | `workout_sessions` | Active/completed/canceled sessions with duration, calories, exercise completion |
| Nutrition plans | `nutrition_plans` | Active plan with macro targets, source tracking (coach/AI/manual) |
| Daily nutrition logs | `daily_nutrition_logs` | Per-day calorie and macro intake |
| Daily hydration logs | `daily_hydration_logs` | Per-day water intake in ml (upsert strategy) |
| Challenge participations | `challenge_participations` | Core 33 state and selected habits (JSON) |
| Habit logs | `habit_logs` | Daily habit completion per challenge participation |
| Badge definitions | `badges` | Badge catalog: id, title, description, icon |
| Earned badges | `user_badges` | User ↔ badge junction with earned timestamp |
| Personal records | `personal_records` | PR entries linked to exercises (weight, reps, duration, distance) |
| Quiz categories | `quiz_categories` | Topic definitions with icons and slugs |
| Quiz questions | `quiz_questions` | Questions with options, correct answer, explanation, point reward |
| Quiz attempts | `quiz_attempts` | User results: score, correct count, points earned |
| Chat messages | `chat_messages` | ELLIE conversation history per user (role + content) |

**Client-side only (localStorage):**
- Favorite exercises and workouts
- Premium state flag

---

## 5. Feature Status

### ✅ Fully Implemented

- Real email authentication with verification
- Multi-step onboarding with profile persistence
- Full workout template library from database
- Workout session tracking (start → exercise flow → complete/cancel)
- Custom routine builder
- Searchable exercise library with detailed exercise pages
- Exercise and workout favoriting
- ELLIE conversational AI (Gemini 3 Flash via Edge Function)
- ELLIE workout generation with tool-calling and real exercise matching
- ELLIE nutrition plan generation with acceptance flow
- Proactive ELLIE nudges (workout, hydration, nutrition, challenge)
- ELLIE progress celebrations (streaks, milestones)
- AI-powered workout recommendations (multi-factor scoring)
- Nutrition plan management and daily macro logging
- Hydration tracking with quick-add, daily goal, streak detection
- Hydration streak badges (3-day, 7-day, weekly master)
- Athelete Core · 33 full flow (intro → habit selection → daily tracker)
- Challenge streak tracking and visualization
- Personal record registration and history
- Gamification system (points + badges)
- Quiz/learning system with categories, scoring, rewards
- Body Science article library
- Progress dashboard (training, nutrition, hydration charts)
- Coach browsing and profile UI (mock data)
- Specialist browsing and profile UI (mock data)
- Premium/paywall UI
- Password reset flow
- Mobile-first responsive design with bottom navigation
- Loading skeletons across all tabs
- Spanish-language UI

### ⚠️ Partially Implemented / Needs Refinement

- **Premium tier** — UI and paywall exist; no payment integration (Stripe, etc.)
- **Coach system** — full UI built; data is mocked; no real coach accounts
- **Specialist system** — same as coaches; UI complete, data mocked
- **Favorites persistence** — localStorage only; needs Supabase migration for cross-device sync
- **Wearable integration** — placeholder banner; no device pairing
- **Exercise videos** — modal player works; most exercises lack video URLs
- **ELLIE long-term memory** — chat stored but no summarization or contextual recall
- **Nutrition meal planning** — macro targets only; no meal-level suggestions or food database
- **Push notifications** — no notification system; nudges visible only in-app
- **PWA capabilities** — no service worker or manifest for offline/installable support
- **Extended onboarding** — equipment, preferences, and injury fields exist in the profile but are not collected during onboarding
- **Workout scheduling** — no calendar or day-assignment for routines
- **Social features** — no community, leaderboards, or sharing

---

## 6. Product Direction

### AI-First Experience

Athelete is built around ELLIE as the central intelligence layer. The roadmap envisions ELLIE evolving from a reactive chat assistant into a proactive fitness companion that anticipates needs, adjusts recommendations based on patterns, and provides increasingly personalized guidance.

### Mobile-First Product

The entire UI is designed for smartphone viewports:
- 5-tab bottom navigation (Home, Workouts, ELLIE, Progress, Profile)
- Touch-friendly interactions with sheet-based modals and drawers
- Smooth animations and transition patterns
- Skeleton loading states for all data-dependent views

The product direction includes two migration paths: a Next.js PWA for rapid mobile web deployment, and a React Native app for full native experience (see `MIGRATION_PLANS.md`).

### Four Pillars

1. **Fitness** — workouts, exercises, PRs, AI-generated training plans
2. **Learning** — Body Science articles, quiz system, educational content
3. **Tracking** — nutrition, hydration, workout sessions, challenge progress
4. **Gamification** — points, badges, streaks, achievements

---

## 7. Technology Summary

| Layer | Stack |
|-------|-------|
| Frontend | React 18 · TypeScript 5 |
| Build | Vite 5 |
| Styling | Tailwind CSS v3 · shadcn/ui component library |
| State | React Context (App, Auth, Gamification, WorkoutSession) |
| Data fetching | TanStack React Query · Supabase JS client |
| Backend | Supabase via Lovable Cloud — PostgreSQL, Auth, Edge Functions, RLS |
| AI | Google Gemini 3 Flash via Supabase Edge Function with tool-calling |
| Routing | React Router v6 (SPA with protected routes) |
| UI language | Spanish |
| Code language | English |

### Key Patterns

- Real authentication with email verification and session management
- Row-Level Security on all user-data tables
- Edge Functions for AI chat with streaming-style responses and tool-calling
- Global AppContext loading real data from Supabase on mount
- Hook-based feature modules (`useHydration`, `usePersonalRecords`, `useFavoriteExercises`, `useQuiz`, etc.)
- Screen-based navigation within a single-page app (tab screens + overlay screens)

---

## 8. Executive Summary

**Athelete** is a mobile-first fitness web application that unifies AI-powered coaching, workout management, nutrition and hydration tracking, habit challenges, and gamification into a single premium experience. At its core is **ELLIE** — an AI coach powered by Google Gemini that generates personalized workouts and nutrition plans, delivers proactive contextual nudges, and celebrates user progress, all grounded in real user data and secured by row-level database policies.

The platform features a complete workout library, exercise database, personal record tracking, a 33-day discipline challenge, a quiz/learning system, and a points-and-badges gamification layer. Built with React, Vite, Tailwind, and Supabase, the application is architected for smartphone use and positioned for migration to either a Next.js PWA or a React Native mobile app — with ELLIE's evolution as the central product differentiator.
