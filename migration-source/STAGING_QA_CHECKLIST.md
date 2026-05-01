# Athelete — Staging QA Checklist

> Purpose: practical pre-release checklist for staging/beta validation of the Next.js app  
> Last updated: April 10, 2026

## Environment

- [ ] `NEXT_PUBLIC_APP_URL` points to the real staging domain
Expected result: metadata, recovery emails, and manifest URLs all resolve to the staging host.

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is configured
Expected result: auth and app data load without runtime configuration errors.

- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured
Expected result: auth/session flows work in the browser.

- [ ] Optional legacy vars are only present if fallback QA is still needed
Expected result: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are not required for the Next runtime.

## Auth

- [ ] Open `/login`
Expected result: login screen renders centered, scrolls correctly on small screens, and shows the brand correctly.

- [ ] Sign up with a new account
Expected result: account creation succeeds and the app routes into the expected onboarding/auth state.

- [ ] Log in with an existing onboarded account
Expected result: user lands on `/inicio` without redirect flicker.

- [ ] Log in with an authenticated but non-onboarded account
Expected result: user lands on `/onboarding`.

- [ ] Forgot password flow
Expected result: recovery email sends successfully and the email link targets the staging domain `/reset-password`.

- [ ] Reset password flow
Expected result: recovery link opens the reset screen, password update succeeds, and the user is redirected back to `/login`.

- [ ] Logout from profile
Expected result: session clears and the app returns to `/login`.

- [ ] Hard refresh while authenticated
Expected result: session persists and the app restores the correct protected route.

## Main Tabs

- [ ] `/inicio`
Expected result: home content loads, cards render correctly, and vertical scrolling works naturally.

- [ ] `/entrenos`
Expected result: workouts tab loads routines, filters/search work, and navigation to detail screens is correct.

- [ ] `/ellie`
Expected result: ELLIE screen loads conversation history/state without broken composer or empty-shell glitches.

- [ ] `/progreso`
Expected result: progress metrics, PR access, and related cards render without layout regressions.

- [ ] `/perfil`
Expected result: profile info, achievements, premium/profile settings, and logout action all work.

## Detail Flows

- [ ] Workout detail route
Expected result: opening `/workouts/[workoutId]` directly loads correctly and the back action returns safely to `/entrenos` when needed.

- [ ] Workout session route
Expected result: direct entry to `/workouts/[workoutId]/session` handles session recovery safely.

- [ ] Same-day session recovery
Expected result: `in_progress` resumes, `canceled` resumes, and a completed same-day workout can start a new session.

- [ ] Exercise detail route
Expected result: opening `/exercises/[exerciseId]` directly works and the back action stays inside the app.

- [ ] Favorites routes
Expected result: `/favorites/workouts` and `/favorites/exercises` render and navigate back safely.

- [ ] Nutrition flow
Expected result: `/nutrition/plan` loads and nutrition logging behaves correctly from the home flow.

- [ ] Hydration flow
Expected result: hydration card/sheet opens, accepts input, saves data, and updates UI state correctly.

- [ ] Core 33 challenge
Expected result: challenge screen loads, tracker state persists correctly, and no mobile layout breaks appear.

- [ ] PR routes
Expected result: `/pr` and `/pr/[exerciseId]` load correctly and back navigation stays inside the app.

- [ ] Quiz flow
Expected result: `/quiz` and `/quiz/[categoryId]` open correctly, answer flow works, and results persist as expected.

- [ ] Notifications route
Expected result: `/notifications` opens directly and returns safely to `/inicio`.

- [ ] Article reader route
Expected result: `/body-science/[articleId]` opens directly and returns safely to `/progreso`.

## Mobile Shell

- [ ] Bottom tab bar
Expected result: active state is correct, labels are readable, and the bar does not overlap core content.

- [ ] Safe viewport behavior
Expected result: no important controls are clipped on small screens or standalone mode.

- [ ] Loading states
Expected result: loading screens feel app-like and do not mention migration/internal scaffolding.

- [ ] Error and 404 states
Expected result: they match the Athelete shell and provide a clear in-app recovery path.

## PWA Checks

- [ ] Manifest is served
Expected result: `/manifest.webmanifest` loads and shows `Athelete` naming consistently.

- [ ] Icons render correctly
Expected result: browser install surfaces show the expected app icon without distortion.

- [ ] Installability basics
Expected result: browser recognizes the app as installable when served over HTTPS on the staging domain.

- [ ] Standalone behavior
Expected result: installed app opens without obvious browser chrome regressions and the bottom nav remains usable.

- [ ] Direct route opening
Expected result: installed/deep-linked routes do not break back navigation or send the user outside the app unexpectedly.

- [ ] Mobile browser experience
Expected result: theme color, status bar feel, and top-level shell behavior look intentional on mobile browsers.

## Regression Checks

- [ ] No auth flicker on root or login
Expected result: user is routed once to the correct destination.

- [ ] No dead placeholder paths in normal usage
Expected result: migrated routes render real content; any fallback state is graceful and non-technical.

- [ ] No broken navigation loops
Expected result: tab switching and back behavior never trap the user.

- [ ] No accidental dependency on the legacy runtime
Expected result: Next routes work without needing `dev:legacy` for normal staging validation.

- [ ] Legacy comparison only for parity QA
Expected result: legacy runtime is used only if a regression needs side-by-side confirmation.
