# Athelete — Vercel Deploy Guide

> Scope: first staging/beta deploy of the Next.js app on Vercel  
> Last updated: April 10, 2026

## 1. Deploy to Vercel

1. Import the repository into Vercel.
2. Let Vercel detect the framework as `Next.js`.
3. Keep the default project root at the repo root.
4. Use the default build command:
   - `next build`
5. Use the default output/runtime that Vercel configures for Next.js.

No custom `vercel.json` is required for the current staging deploy.

## 2. Required Environment Variables

Add these variables in the Vercel project settings for the staging environment:

- `NEXT_PUBLIC_APP_URL`
  - Example: `https://staging.athelete.app`
- `NEXT_PUBLIC_SUPABASE_URL`
  - Example: `https://your-project.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase public anon key for the staging app

Optional compatibility alias:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - Only needed if you want to keep parity with older local tooling; the Next app already supports `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Important:

- `NEXT_PUBLIC_APP_URL` should be a stable staging URL, not an ephemeral preview URL
- forgot-password emails and metadata use this value
- if the domain changes, rebuild/redeploy the app with the updated env var
- if you add or change any `NEXT_PUBLIC_*` variable in Vercel, trigger a new deployment; these values are baked into the client bundle at build time

## 3. Supabase Auth Configuration

In Supabase Auth settings, configure the staging domain used in Vercel.

Set:

- Site URL:
  - `https://staging.athelete.app`

Add Redirect URLs for:

- `https://staging.athelete.app/reset-password`
- `https://staging.athelete.app/login`
- any additional stable staging alias you actually plan to use

Why this matters:

- the forgot-password flow sends users to `${NEXT_PUBLIC_APP_URL}/reset-password`
- if the staging domain is missing from Supabase allowed redirects, password recovery will fail after email click-through

## 4. Staging QA

After the first deploy, run the checklist in:

- [STAGING_QA_CHECKLIST.md](/Users/nicolasfalcon/habit-trail-flow/docs/STAGING_QA_CHECKLIST.md)

Pay special attention to:

- auth redirects
- forgot-password and reset-password
- direct-entry detail routes
- workout session recovery
- installability and standalone behavior on mobile

## 5. Known Staging Limitations

Current staging limitations are acceptable for beta, but not yet final production:

- PWA icons are still temporary
- no full service worker/offline strategy yet
- protected routing is still client-layout gated
- the legacy Vite fallback still exists for parity QA

## 6. Recommended Staging URL Strategy

Use a stable staging hostname in Vercel, for example:

- `staging.athelete.app`

Avoid relying on disposable preview URLs for the main beta cycle because:

- metadata will point to the build-time app URL
- Supabase recovery emails need an exact allowed redirect target
- PWA install testing is cleaner on a stable domain
