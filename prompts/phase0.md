# PHASE 0 — FOUNDATION & ENVIRONMENT

No framework or language migration. Keep Vite + React + JavaScript exactly as they are. Nothing else starts until this phase is verified.

## Environment

* Create `.env.local` (gitignored) with the variables in the Deployment section. The Razorpay TEST keys are already provided and stored locally; leave Supabase values empty until the project exists.
* Create the Supabase project and enable Google OAuth. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
* Store server-only secrets (Supabase service-role key, Razorpay secret) in Supabase Edge Function secrets / Vercel env — never in committed code.

## Optional tooling (low risk)

* Only if it does not disturb the working app: add a minimal ESLint setup and a minimal Vitest smoke test.
* Do NOT add TypeScript. Do NOT change the build or the framework.

## Verify before moving on

Everything below must keep working exactly as it does today:

* Draw on the slate, choose colors, undo/redo.
* Extrude height, random lift, edges toggle, grid toggle.
* 3D viewport orbit / zoom / pan, reset camera, capture PNG.
* Grid-size change (10→50) without the model vanishing.
* Save / load / clear designs.
* `npm run dev` and `npm run build` succeed.

Commit + push when the environment is set up and every feature above still works.
