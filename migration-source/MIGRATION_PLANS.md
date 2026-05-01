# Athelete — Migration Plans

> Last updated: April 2026

---

## Executive Summary

Athelete currently exists as a fully functional mobile-first web application built with React, Vite, and Supabase. Two migration paths are under consideration to deliver a more native mobile experience:

| | Plan A: Next.js + PWA | Plan B: React Native |
|---|---|---|
| **What it is** | Migrate the existing React SPA to Next.js and deploy as an installable Progressive Web App | Build a native mobile application using React Native (Expo) |
| **Optimizes for** | Speed to market, code reuse, single codebase | Native UX quality, platform capabilities, App Store presence |
| **Best fit** | Rapid MVP launch, web-first distribution | Long-term product with deep mobile integration |

Both paths are valid. The decision depends on timeline, distribution strategy, and the importance of native device capabilities.

---

## Current Project Baseline

### What exists today

- A complete React 18 SPA with 50+ components and 15+ screens
- Real Supabase authentication with email verification
- 17 database tables with RLS policies
- ELLIE AI coach with chat, workout generation, and nutrition plan generation via Edge Functions
- Full workout library, exercise database, session tracking, and custom routine builder
- Hydration tracking, nutrition logging, Core 33 challenge, PRs, quizzes, gamification
- Spanish-language UI designed exclusively for mobile viewports
- Bottom-tab navigation mimicking native app patterns

### Reusability assessment

| Asset | PWA reuse | React Native reuse |
|-------|-----------|-------------------|
| Business logic (hooks, contexts) | ~90% | ~80% |
| Supabase integration (client, queries, RLS) | 100% | 100% |
| Edge Functions (ELLIE chat, AI) | 100% | 100% |
| UI components (JSX + Tailwind) | ~70% (adapt to Next.js) | ~10% (rewrite with RN primitives) |
| Routing | Rewrite (file-based) | Rewrite (React Navigation) |
| Styling (Tailwind classes) | ~90% | 0% (NativeWind or StyleSheet) |
| Types and data models | 100% | 100% |
| Database schema and migrations | 100% | 100% |

---

## Plan A — Next.js + PWA

### Objective

Migrate the current Vite/React SPA to a Next.js application and deploy it as an installable PWA, delivering a "mobile app rendered on the web" experience without requiring App Store submission.

### What can be reused

- **All business logic** — hooks (`useHydration`, `usePersonalRecords`, `useQuiz`, etc.), contexts (App, Auth, Gamification, WorkoutSession), and utility functions transfer directly
- **All Supabase integration** — client setup, queries, RLS policies, Edge Functions
- **Most UI components** — shadcn/ui and Tailwind-based components work in Next.js with minimal adaptation
- **All types and data models** — TypeScript interfaces and Zod validators (if added) transfer 1:1
- **All database schema** — no backend changes required

### What must change

- **Routing** — React Router v6 → Next.js App Router (file-based routing)
- **Page structure** — current single `Index.tsx` screen-switching pattern → proper page files with layouts
- **Data fetching** — consider server components for initial loads; keep React Query for client-side state
- **Auth flow** — adapt Supabase auth to Next.js middleware for route protection
- **Build/deploy** — Vite → Next.js build pipeline; deploy to Vercel, Cloudflare, or similar
- **Image optimization** — leverage `next/image` for exercise thumbnails and workout images

### PWA requirements

- `manifest.json` with app name, icons (multiple sizes), theme color, `display: "standalone"`
- Service worker for offline caching (workbox via `next-pwa` or manual)
- Splash screens for iOS/Android
- Meta tags for iOS standalone mode (`apple-mobile-web-app-capable`, status bar style)
- HTTPS (required for service workers)

### Benefits

- **Fastest path to a native-feeling mobile product** — weeks, not months
- **Single codebase** for all platforms (mobile web, desktop web, installable app)
- **No App Store review process** — deploy instantly
- **SEO potential** — server-rendered pages for Body Science articles, landing pages
- **70-90% code reuse** from the current project
- **No new language or framework** — same React, same TypeScript
- **Supabase integration unchanged** — zero backend migration

### Limitations

- **No push notifications on iOS** (limited to iOS 16.4+ with restrictions)
- **No access to native APIs** — no HealthKit, no Bluetooth for wearables, no background processing
- **App Store absence** — some users expect to find fitness apps in the store
- **PWA install UX varies** — Android is smooth; iOS requires manual "Add to Home Screen"
- **Offline support is complex** — caching workout sessions and syncing later requires careful architecture

### Implementation Roadmap

| Phase | Scope | Effort |
|-------|-------|--------|
| 1. Project setup | Next.js project, Tailwind config, shadcn/ui, Supabase client, environment variables | 1-2 days |
| 2. Auth migration | Supabase auth with Next.js middleware, login/register/forgot-password pages, onboarding | 2-3 days |
| 3. Layout and navigation | App shell with bottom tabs, page layouts, screen transitions | 2-3 days |
| 4. Core pages migration | Home, Workouts, Exercise Library, Progress, Profile — move components and hooks | 5-7 days |
| 5. ELLIE migration | Chat interface, Edge Function integration, nudges, recommendations | 3-4 days |
| 6. Feature pages | Workout Player, Core 33, Nutrition Plan, PRs, Quiz, Body Science | 5-7 days |
| 7. PWA setup | Manifest, service worker, icons, splash screens, install prompt | 2-3 days |
| 8. Testing and polish | Cross-browser testing, iOS/Android PWA testing, performance optimization | 3-5 days |

**Total estimated effort: 4-6 weeks**

### Estimated Complexity

- **Low risk** — same language, same framework family, same backend
- **Medium effort** — routing rewrite and page restructuring are the main tasks
- **High code reuse** — most components and all business logic transfer directly

---

## Plan B — React Native (Expo)

### Objective

Build a native mobile application using React Native with Expo (managed workflow), delivering a true native experience distributed through the App Store and Google Play.

### What can be reused

- **All business logic** — hooks, contexts, state management logic, AI engine scoring
- **All Supabase integration** — `@supabase/supabase-js` works identically in React Native
- **All Edge Functions** — ELLIE chat, AI generation — no changes needed
- **All types and data models** — shared via a monorepo package (`@athelete/shared`)
- **All database schema** — unchanged

### What must be rewritten

- **Every UI component** — React Native uses `View`, `Text`, `ScrollView`, `FlatList` instead of HTML elements; no `div`, `span`, `button`, `input`
- **All styling** — Tailwind CSS does not work natively; must use StyleSheet, NativeWind, or a design token system
- **Navigation** — React Router → `@react-navigation` with stack and tab navigators
- **Animations** — CSS transitions → `react-native-reanimated` or Animated API
- **Charts** — Recharts → `react-native-svg-charts` or `victory-native`
- **Markdown rendering** — `react-markdown` → `react-native-markdown-display`
- **Storage** — localStorage → `expo-secure-store` / `AsyncStorage`
- **Inputs and forms** — complete rewrite with native components

### Mobile Architecture

The planned architecture follows an 8-phase migration roadmap:

1. **Setup** — Expo project, TypeScript, monorepo with shared types
2. **Auth** — Supabase auth with `expo-secure-store` for encrypted session persistence
3. **Read-only features** — Home, Workouts, Exercise Library, Progress, Profile
4. **Workout Player** — native session tracking with background timer support
5. **Nutrition** — plan management and daily logging
6. **Core 33** — challenge flow with native animations
7. **ELLIE Chat** — real-time AI chat with native keyboard handling
8. **Store Polish** — app icons, splash screens, App Store assets, review submission

Navigation: `RootNavigator` switches between `AuthStack` and `MainTabs` based on session state. Five bottom tabs: Home, Workouts, ELLIE (center), Progress, Profile.

### Benefits

- **True native UX** — 60fps animations, native gestures, platform conventions
- **App Store presence** — discoverability and trust for fitness app users
- **Push notifications** — full support on both iOS and Android
- **Native API access** — HealthKit, Google Fit, Bluetooth (wearables), camera, haptics
- **Background processing** — workout timers, hydration reminders even when app is closed
- **Offline-first architecture** — easier to implement with native storage and sync patterns

### Limitations

- **Complete UI rewrite** — every component must be rebuilt from scratch
- **Longer timeline** — 3-5 months for feature parity
- **Two codebases to maintain** — unless the web version is deprecated
- **App Store review delays** — initial submission and every update goes through review
- **Platform-specific issues** — iOS and Android behave differently; debugging is more complex
- **Team skill requirements** — React Native expertise needed; different debugging tools

### Implementation Roadmap

| Phase | Scope | Effort |
|-------|-------|--------|
| 1. Project setup | Expo project, monorepo, shared types package, Supabase client, design tokens | 1-2 weeks |
| 2. Auth | Supabase auth, secure storage, login/register/onboarding screens | 1-2 weeks |
| 3. Read-only screens | Home, Workouts, Exercise Library, Exercise Detail, Progress, Profile | 3-4 weeks |
| 4. Workout Player | Session tracking, timer, exercise flow, completion/cancel | 2-3 weeks |
| 5. Nutrition + Hydration | Plan management, daily logging, hydration tracking | 1-2 weeks |
| 6. Core 33 | Challenge flow, daily tracker, streak animations | 1-2 weeks |
| 7. ELLIE Chat | Real-time AI chat, nudges, recommendations, workout/nutrition generation | 2-3 weeks |
| 8. Store Polish | App icons, splash screens, screenshots, App Store/Play Store submission | 1-2 weeks |

**Total estimated effort: 3-5 months**

### Estimated Complexity

- **High risk** — complete UI rewrite with platform-specific edge cases
- **High effort** — every screen and component must be rebuilt
- **High business logic reuse** — hooks, contexts, AI logic, and Supabase queries carry over

---

## Side-by-Side Comparison

| Dimension | Plan A: Next.js + PWA | Plan B: React Native |
|-----------|----------------------|---------------------|
| **Speed to launch** | 4-6 weeks | 3-5 months |
| **Code reuse** | 70-90% | 30-40% (business logic only) |
| **UI effort** | Low — adapt existing components | High — full rewrite |
| **Backend changes** | None | None |
| **UX quality** | Good — native-like with limitations | Excellent — true native |
| **Push notifications** | Limited (especially iOS) | Full support |
| **App Store presence** | No | Yes |
| **Native API access** | No (no HealthKit, Bluetooth, etc.) | Yes |
| **Offline support** | Complex (service workers) | More natural (native storage) |
| **Scalability** | Good for web distribution | Better for mobile-first growth |
| **Maintenance** | Single codebase | Separate codebase (or monorepo) |
| **Risk** | Low | Medium-high |
| **MVP fit** | Excellent | Overkill for MVP |
| **Long-term fit** | Good for web + installable | Best for dedicated mobile product |
| **SEO / discoverability** | Yes (server rendering) | No (App Store only) |
| **Deploy speed** | Instant (no review) | Days (App Store review) |

---

## Recommended Path

### What to do first: Plan A (Next.js + PWA)

**Why:**

1. **Speed** — The current codebase is 70-90% reusable. A working PWA can ship in 4-6 weeks, not months.
2. **Validation** — A PWA lets you validate the mobile experience with real users before committing to a native app build.
3. **Risk reduction** — If the mobile product needs iteration (and it will), iterating on a web-based PWA is dramatically faster than iterating on a native app.
4. **Cost** — One developer can execute the PWA migration. A React Native build realistically needs more time and potentially more specialized skills.
5. **Distribution** — No App Store dependency. Ship updates instantly. No review delays.
6. **Foundation** — The architectural cleanup done for the Next.js migration (routing, state management, shared types) directly benefits a future React Native build.

### Recommended sequence

1. **Now:** Clean up the current codebase (see Prerequisites below)
2. **Phase 1 (weeks 1-6):** Execute Plan A — Next.js + PWA migration
3. **Phase 2 (months 3-6):** Based on user feedback and growth, begin Plan B — React Native
4. **Phase 3 (months 6+):** Maintain both or deprecate the PWA in favor of native

---

## Hybrid Strategy

The optimal approach is staged:

### Stage 1: Next.js + PWA (immediate)

- Migrate the existing app to Next.js
- Deploy as an installable PWA
- Begin collecting real mobile usage data
- Iterate on the mobile experience rapidly

### Stage 2: Shared foundation (parallel)

- Extract business logic into a shared package (`@athelete/shared`)
- Define platform-agnostic types, validators, and repository patterns
- Create a shared design token system (colors, spacing, typography) that works for both web and native
- This investment pays off in both the PWA and the future native app

### Stage 3: React Native (when validated)

- Build the native app consuming the shared package
- Focus native development on areas where PWA falls short: push notifications, HealthKit/Google Fit integration, wearable connectivity, background timers
- Use the PWA as the reference implementation for feature parity
- Submit to App Store and Google Play

### Why this works

- The PWA validates the product and user experience before the expensive native investment
- The shared package ensures business logic is written once
- The native app can focus on what makes native valuable (APIs, performance, store presence) rather than reimplementing everything
- If the PWA proves sufficient for most users, the native app scope can be reduced

---

## Prerequisites

Regardless of which path is chosen, these items should be addressed first:

### Architecture cleanup

- [ ] Extract shared types into a dedicated package or well-defined barrel exports
- [ ] Move favorites from localStorage to Supabase for cross-device sync
- [ ] Consolidate the screen-switching pattern in `Index.tsx` into proper route definitions
- [ ] Review and clean up the `AppContext` (currently 700+ lines) — consider splitting into domain-specific contexts

### Data layer

- [ ] Audit all RLS policies for completeness and correctness
- [ ] Add database indexes for frequently queried columns (user_id + date combinations)
- [ ] Implement proper error boundaries for failed data fetches

### ELLIE

- [ ] Add conversation summarization for long-term memory
- [ ] Implement rate limiting on the Edge Function
- [ ] Add fallback behavior when the AI service is unavailable

### Testing

- [ ] Add integration tests for critical flows (auth, workout session, ELLIE chat)
- [ ] Add E2E tests for the onboarding and workout player flows

### Design system

- [ ] Formalize the design token system (colors, spacing, typography, radii) in a platform-agnostic format
- [ ] Document the component library for consistency across migration targets

---

## Final Conclusion

**Start with Plan A (Next.js + PWA).** It delivers a native-feeling mobile experience in weeks, reuses the vast majority of the existing codebase, requires no App Store dependency, and produces the architectural foundation needed for a future React Native build.

Plan B (React Native) is the right long-term investment for a dedicated fitness mobile product — but it should be informed by real user data from the PWA, not built speculatively. The hybrid strategy of PWA-first, native-second minimizes risk, maximizes learning, and ensures that when the native app ships, it solves validated problems rather than assumed ones.

The single most important preparatory step is extracting shared business logic and types into a reusable package. This investment pays dividends in both migration paths and reduces the total cost of maintaining multiple platforms.
