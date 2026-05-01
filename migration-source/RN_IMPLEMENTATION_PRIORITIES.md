# Athelete — RN CLI Implementation Priorities

> Purpose: recommended build sequence for a brand-new React Native CLI app using this repo as the source blueprint.

---

## 1. Strategy Summary

Do not attempt feature-parity screen by screen in random order.

Recommended sequence:

1. foundation and architecture
2. auth and onboarding
3. main shell and tabs
4. read-only browse/detail surfaces
5. workout session/player
6. nutrition and hydration
7. Core 33
8. ELLIE
9. progress, PRs, and quiz
10. profile, settings, polish, launch preparation

This order minimizes blocked dependencies and gets the most product value online earliest.

---

## 2. Phase Breakdown

## Phase 0 — Foundation Setup

- What to build:
  - React Native CLI app
  - navigation shell
  - Supabase client and auth persistence
  - TanStack Query
  - token-driven primitive design system
  - repository/query layer that begins consuming `packages/domain`, `packages/data`, and `packages/design-tokens`
- Why first:
  - every later phase depends on it
  - this is where you stop web assumptions from leaking into the new codebase
- Dependencies:
  - shared packages copied or linked into the new repo
- Done means:
  - app boots on iOS and Android
  - auth session can be restored
  - tab and stack navigation compile cleanly

## Phase 1 — Auth and Onboarding

- What to build:
  - login
  - register
  - forgot password
  - reset password
  - onboarding flow
- Why here:
  - unlocks real protected app testing against production-like backend behavior
- Dependencies:
  - foundation setup
  - Supabase auth wiring
- Done means:
  - user can sign in and sign up
  - onboarding state gates access correctly
  - profile writes persist to `profiles`

## Phase 2 — Main App Shell and Tabs

- What to build:
  - tab navigator
  - Home, Workouts, ELLIE, Progress, Profile root shells
  - shared headers, segmented controls, empty states, loading states
- Why here:
  - establishes the product skeleton and deep-link ownership of each feature
- Dependencies:
  - auth and onboarding completed
- Done means:
  - authenticated user can move through the main app shell
  - detail routes can be pushed from tabs

## Phase 3 — Read-Only Browse and Detail Surfaces

- What to build:
  - workouts browse
  - workout detail
  - exercise library
  - exercise detail
  - favorites read-only views
  - notifications read-only derived view
- Why here:
  - high product visibility
  - lower complexity than active session/chat flows
  - gives the new app real content depth early
- Dependencies:
  - app shell
  - core repositories for workouts/exercises
- Done means:
  - users can browse workouts and exercises and navigate across detail flows reliably

## Phase 4 — Workout Session / Player

- What to build:
  - session state machine
  - active checklist UI
  - finish/save/cancel flows
  - resume logic
- Why here:
  - this is one of the highest-value core behaviors
  - difficult enough that it should land before too many peripheral features
- Dependencies:
  - workout browse/detail already in place
  - `workout_sessions` repository logic
- Done means:
  - user can start, resume, complete, and cancel a workout session reliably on device

## Phase 5 — Nutrition and Hydration

- What to build:
  - nutrition plan screen
  - daily nutrition logging
  - hydration card + logging flow
  - hydration weekly history basis
- Why here:
  - medium complexity and strong daily retention value
  - unlocks better Home and ELLIE relevance
- Dependencies:
  - profile and session data already flowing
- Done means:
  - user can manage active nutrition plan and hydration in the RN app

## Phase 6 — Core 33

- What to build:
  - intro
  - choose habits
  - summary
  - tracker
  - progress-tab challenge state
- Why here:
  - logic is already cleanly defined
  - UI is moderately complex but isolated
- Dependencies:
  - auth/profile foundation
  - shared Core 33 rules
- Done means:
  - user can start and maintain a Core 33 challenge entirely in RN

## Phase 7 — ELLIE

- What to build:
  - insights tab
  - prompt suggestions and recommendation cards
  - chat UI
  - streamed message rendering
  - generated workout/nutrition previews
  - save/discard flows
- Why here:
  - depends on many prior domains already existing in the RN app
  - chat UX and keyboard handling are complex enough to deserve focused work
- Dependencies:
  - workouts
  - nutrition
  - challenge
  - progress data
  - shared ELLIE context and client
- Done means:
  - user can converse with ELLIE and save generated content successfully

## Phase 8 — Progress, PRs, and Quiz

- What to build:
  - progress dashboard
  - chart surfaces
  - PR registration and history
  - quiz landing, question flow, and results
- Why here:
  - these features rely on data produced by earlier phases
  - charts and polish can be tackled after core daily flows are stable
- Dependencies:
  - workouts, nutrition, hydration, challenge data
- Done means:
  - analytics and learning features are functionally complete

## Phase 9 — Profile, Settings, and Launch Polish

- What to build:
  - profile refinements
  - achievements
  - settings polish
  - local preference migrations
  - QA and release preparation
- Why last:
  - profile is already partially useful earlier
  - polish should happen after primary flows are stable
- Dependencies:
  - all core feature areas online
- Done means:
  - app is coherent, production-ready, and can enter launch QA

---

## 3. What Should Not Be First

Avoid starting with:

- ELLIE chat
- progress charts
- premium/paywall polish
- cross-platform animation polish
- wearable placeholders

These are valuable, but they are not the right critical path.

---

## 4. Highest-Risk Phases

The phases most likely to create engineering drag are:

1. workout session/player
2. ELLIE chat
3. progress charting

Reasons:

- lifecycle and timer correctness
- streaming chat and keyboard handling
- native chart library parity

Budget more implementation and QA time there.

---

## 5. Recommended Definition Of MVP In RN CLI

If a first mobile release needs a narrower scope, ship with:

- auth + onboarding
- main tabs
- workouts browse/detail/session
- exercise library/detail
- nutrition basics
- hydration basics
- Core 33
- profile essentials

Then add:

- ELLIE full chat
- progress charts
- PR depth
- quiz depth

This is the safest path to a useful native first release.
