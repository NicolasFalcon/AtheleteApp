# Athelete — PWA Prep Notes

> Scope: preparation notes for the active Next.js runtime

## Current status

The project now has a real Next.js app shell and install metadata base. Current prep includes:

- mobile-first app layout
- manifest support
- icon set in `public/pwa`
- app metadata prepared from the beginning
- route-driven protected shell suitable for installable app behavior
- production image support via `sharp`

## What is already prepared

- Next app structure under `app/`
- `manifest.ts` for install metadata
- PWA icons in:
  - `public/pwa/icon-192.png`
  - `public/pwa/icon-512.png`
  - `public/pwa/apple-touch-icon.png`
- mobile-first protected tab shell in Next routes
- route-level loading/error handling in the Next app
- Next build now passes, so the current shell is structurally ready for PWA hardening

## What was hardened in this pass

- Next is now the default runtime for `dev`, `build`, and `start`
- manifest fields were expanded with `scope`, `id`, categories, shortcuts, and install-oriented display settings
- app metadata now includes:
  - light/dark theme colors
  - Apple web app metadata
  - icons and shortcut icons
  - Open Graph/Twitter baseline metadata
- body/layout defaults were cleaned up for a more app-like standalone shell
- `sharp` was installed to improve production image handling in Next
- direct-entry routes now use explicit in-app back fallbacks, which is safer for deep links and installed PWA usage
- generic error/404/loading states now better match the app shell for QA and standalone testing

## Remaining blockers before MVP deployment

- final production icon set is still missing
- service worker/offline behavior is still intentionally not implemented
- install flow still needs device validation on iOS Safari and Android Chrome
- protected routing is still client-side gated; acceptable for beta, but not the final auth hardening state
- staging must provide a real `NEXT_PUBLIC_APP_URL` so recovery links and metadata resolve to the deployed host

## Remaining blockers before deleting the legacy fallback

- one staging QA cycle still needs to confirm parity for the main authenticated flows
- fallback comparison may still be useful for any regressions found in workout session, quiz, PR, or profile flows
- `react-router-dom` can only be removed once `dev:legacy` and `build:legacy` are officially retired

## What should happen next

### 1. Replace placeholder icons

Current icons are temporary exports from an existing logo asset. Before production:

- create a proper square app icon set
- create maskable variants
- create monochrome notification-safe icon variants if needed

### 2. Add full metadata polish

Recommended:

- Apple standalone metadata
- better Open Graph metadata for public marketing pages later

### 3. Decide the service worker strategy

This should not be rushed.

Options:

- `next-pwa`
- custom Workbox setup
- very limited installable shell first, offline later

Recommendation:

- ship installability first
- add offline behavior only after understanding which data should cache and which must stay online

### 4. Plan offline boundaries explicitly

Safe early offline targets:

- static assets
- shell assets
- article content if moved to cacheable routes

Unsafe to cache without a sync plan:

- workout session writes
- hydration logging
- nutrition logging
- challenge check-offs
- auth/session-sensitive writes

### 5. Validate install UX

Test on:

- iOS Safari add-to-home-screen flow
- Android Chrome install flow
- standalone mode layout behavior
- bottom safe-area handling

## Recommended PWA sequence

1. Replace placeholder icons with final production app icons
2. Validate manifest/install flow on iOS and Android
3. Run a staging build and test direct-entry routes from the installed shell
4. Add service worker intentionally
5. Define offline write strategy for workout/nutrition/challenge flows
6. Remove the legacy fallback after parity signoff
