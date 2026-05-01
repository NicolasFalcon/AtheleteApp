# Legacy Vite Runtime

This folder contains the temporary Vite/React Router runtime kept only for migration safety.

Current status:

- The official runtime is now the Next.js `app/` router.
- Use `npm run dev` for normal local development.
- Use `npm run dev:legacy` only if you explicitly need to compare behavior with the old SPA runtime.

These files should be removed once QA confirms parity in the Next app.
