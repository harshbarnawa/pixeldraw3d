# PixelDraw3D SaaS Master Prompt
This document is the project specification.

Read it once.

Do not repeatedly quote or restate it.

While implementing, load only the current phase and any directly relevant global rules into working memory.

Ignore future phases until they are reached.
You are working on an existing production project called **PixelDraw3D**.

It is a **pixel-art editor with a live 3D voxel viewport** (React Three Fiber), currently a **Vite + React (JavaScript) single-page app** with plain CSS, already deployed to Vercel.

Your objective is to transform it into a professional SaaS application while preserving every existing feature and the current design language.

Read this document completely before making any changes.

---

# PRIMARY OBJECTIVE

Convert PixelDraw3D into a polished, production-ready SaaS product.

The application must remain stable, scalable, modular, maintainable and production-ready.

Do NOT rush implementation.

Complete every phase carefully and verify each one before moving on.

---

# TECH STACK (DECIDED — DO NOT CHANGE)

* **Framework:** Vite + React (keep the existing setup exactly as-is)
* **Language:** JavaScript (keep as-is — do NOT migrate to TypeScript)
* **Backend / Database / Auth / Storage / Realtime:** Supabase
* **Payments:** Razorpay — order creation and signature verification MUST happen server-side (Supabase Edge Functions). Never expose the secret key to the client.
* **Deployment:** Vercel (frontend), Supabase (backend / Edge Functions)
* **Styling:** preserve the existing plain-CSS theme exactly. Do NOT introduce Tailwind.
* **Linting / Testing:** optional and light — only add if it does not disturb the working app.

Do not switch stacks later.

---

# ABSOLUTE RULES

These rules are mandatory.

* Never redesign the existing UI.
* Never change the current theme or the plain-CSS styling system.
* Never rewrite working code unnecessarily.
* Extend the current project instead of rebuilding it.
* Never remove existing functionality.
* Never break the existing drawing engine.
* Never modify the 3D voxel viewport rendering, camera, FOV, framing or OrbitControls behavior unless a new feature explicitly requires it. The viewport camera setup is intentionally tuned — preserve it.
* Keep all new code modular.
* Use reusable components.
* Follow clean architecture.
* Follow clean JavaScript best practices (ES modules, no duplicate code).
* Avoid duplicate code.
* Always think long-term scalability.
* Never add AI features. No AI image generation, no AI prompts, no AI palettes. (The existing image-import / send-to-slate feature is NOT AI — it converts a user-uploaded image into a pixel-art slate and is controlled by plan quotas, see Phase 4.)

Whenever possible, reuse existing code instead of replacing it.

---

# GITHUB WORKFLOW (MANDATORY)

After completing every meaningful task:

```
git add .
git commit -m "meaningful commit message"
git push origin main
```

Always push after completing a meaningful task.

Never continue implementing multiple completed tasks without committing.

Commit messages must always be meaningful.

Examples:

```
feat(auth): add google authentication
feat(cloud): implement cloud saves
feat(community): add follow system and public feed
fix(viewport): adaptive camera framing so models never vanish
feat(subscription): add plan badges
feat(payments): integrate razorpay
```

Never use commit messages like:

```
update
changes
fix
test
```

---

# STARTING STATE

Before beginning Phase 0:

* The working tree contains uncommitted camera/FOV fixes in `src/components/VoxelViewport.jsx`. Commit them first with a meaningful message (e.g. `fix(viewport): adaptive camera framing so models never vanish`). Do NOT lose or revert them during development.
* Commit this prompt.md.
* Then begin Phase 0.

---

# DEVELOPMENT STRATEGY

Implementation must happen in phases.

Finish one phase completely.

Verify it.

Fix every bug.

Commit.

Push.

Only then continue to the next phase.

Never skip phases.

Phases are ordered by dependency — do not reorder them. The Community phase is intentionally LAST.

---

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

---

# PHASE 1 — AUTHENTICATION & USERS (Supabase)

## Authentication

Implement using Supabase Auth:

* Google Login
* Google Logout
* Persistent Sessions
* Automatic Session Restore
* Guest Mode
* Protected Routes where required

Guest users must be able to use the editor without login.

No premium feature should require login unless necessary. Guest mode stays fully functional for basic drawing.

## User records

Create a `users` table (or Supabase auth metadata + a public profile row) storing:

```
id
fullName
displayName
username
email
profilePhoto
provider
createdAt
lastLogin
currentPlan
cloudDesignsUsed
cloudDesignsLimit
imageImportsUsed
imageImportsLimit
imageImportsDay
subscriptionStatus
billingCycle
```

Default values:

```
currentPlan = FREE
cloudDesignsUsed = 0
cloudDesignsLimit = 5
imageImportsUsed = 0
imageImportsLimit = 2
subscriptionStatus = NONE
billingCycle = MONTHLY
```

* Generate a unique username automatically (e.g. base on the Google name + random number: `harsh_4821`). Enforce uniqueness in the database.
* `displayName` is user-editable. `username` may stay auto-generated; if you allow editing it, enforce uniqueness.
* Keep the schema ahead-of-time consistent with the DB structure listed below.

## User menu

After login display:

* Avatar
* Name
* Plan Badge
* Dropdown

Menu items:

* Profile
* My Designs
* Subscription
* Settings
* Logout

Never use "My Projects".

Always use "My Designs".

## Plan badges

* FREE — no badge.
* PLUS — blue "PLUS" badge.
* PRO — gold "PRO" badge.

Display badges inside:

* Navbar
* Profile
* Dropdown
* Settings

Keep badges minimal and consistent with the existing theme.

## Plan helpers

Create reusable helpers and use them everywhere:

* `isFree()`
* `isPlus()`
* `isPro()`
* `hasFeature()`
* `getPlanQuota()` (for count-based limits like image imports)

Never hardcode plan checks inside UI.

Always use the reusable helpers.

---

# PHASE 2 — CLOUD DESIGNS (Supabase)

Implement cloud storage for logged-in users.

* Guest: local storage only.
* Logged-in users: cloud sync.

## Features

* Auto Save
* Manual Save
* Rename
* Duplicate
* Delete
* Restore
* Version History
* Recent Designs
* Search Designs
* Sort Designs
* Create a "My Designs" page

## Quotas

* FREE — maximum 5 cloud designs.
* PLUS — unlimited.
* PRO — unlimited.

## Usage display

Show usage, for example: `3 / 5 Designs Used`.

When a FREE user reaches the limit:

* Show an Upgrade Dialog.
* Existing designs remain editable.
* Only block creating additional cloud designs.

---

# PHASE 3 — SUBSCRIPTION FOUNDATION

Prepare the subscription and permission architecture. No payment integration yet.

## Plans

* FREE
* PLUS
* PRO

## Permission system

Create a permission-based feature system.

Example permissions:

```
FEATURE_IMAGE_IMPORT
FEATURE_HD_EXPORT
FEATURE_PRIVATE_DESIGNS
FEATURE_UNLIMITED_SAVE
FEATURE_PRIORITY_RENDER
FEATURE_EXPORT_3D
FEATURE_ANIMATION_EXPORT
```

Every premium feature must go through permissions.

Never check plans directly.

Bad:

```
if (user.plan === "PRO")
```

Good:

```
hasFeature("FEATURE_HD_EXPORT")
```

## Quota system

For count-based limits (image imports, cloud designs) implement a daily usage-counter + quota model checked through `getPlanQuota()` and `hasFeature()`.

---

# PHASE 4 — PREMIUM FEATURES (FEATURE-GATED, NO AI)

## Feature matrix

### FREE

* Basic Drawing
* Basic Export
* Guest Mode
* 5 Cloud Designs
* Basic Sharing
* 2 image imports / send-to-slate per day
* Image import REQUIRES login (guest: feature OFF)

### PLUS

* Unlimited Cloud Saves
* 10 image imports / send-to-slate per day
* HD Export
* Private Designs
* Unlimited Undo
* Unlimited Redo
* Autosave
* No Ads
* Priority Support

### PRO

* Everything in PLUS
* Plus:
  * Unlimited image imports / send-to-slate
  * Animation Export
  * OBJ Export
  * GLB Export
  * Experimental Features
  * Priority Rendering
  * Future Beta Features

## Image import / send-to-slate (IMPORTANT)

This is the existing Convert-section feature that uploads an image and sends it to the slate. It is NOT AI. Its daily quota varies by plan:

* Guest: OFF — login required to use image import / send-to-slate at all.
* FREE: 2 image imports per day.
* PLUS: 10 image imports per day.
* PRO: Unlimited.

Implement as a daily usage counter on the user record (resets each day), checked through the permission/quota system. When the quota is exhausted, show an Upgrade Dialog instead of silently failing.

## Gating

Everything must be feature-gated. No plan-specific logic scattered in UI.

---

# PHASE 5 — SUBSCRIPTION PAGE

Create a premium subscription page similar to modern SaaS products.

Display:

* Current Plan
* Upgrade
* Downgrade
* Cancel Subscription
* Renew
* Billing History
* Active Status
* Expiry Date
* Next Billing Date
* Feature Comparison
* Beautiful pricing cards

Plans:

* FREE
* PLUS ₹99/month
* PRO ₹299/month

Future-ready (UI structure only, not live yet):

* PLUS Yearly
* PRO Yearly
* Lifetime

---

# PHASE 6 — PAYMENT SYSTEM (RAZORPAY)

## Backend flow (server-side, never trust the client)

* Select Plan
* Create an order in a Supabase Edge Function using the Razorpay secret key
* Open the Razorpay Checkout (client)
* Successful payment
* Verify the payment signature server-side in a Supabase Edge Function
* Update the database (Supabase)
* Activate the subscription
* Update the plan badge
* Unlock premium features

## Data to persist

Store:

* Payment history
* Invoices
* Transaction IDs
* Payment timestamps
* Order IDs
* Signature verification result

## Webhooks

Prepare webhook handling for Razorpay events (payment success / failure / refunds). Secure the webhook endpoint with the webhook secret. Never rely on client callbacks alone.

---

# PHASE 7 — SETTINGS

Create a complete settings page.

* Profile
* Avatar
* Display Name (editable)
* Username (auto-generated; editing allowed only if uniqueness is enforced)
* Theme
* Connected Google Account
* Subscription
* Billing
* Delete Account
* Export User Data
* Privacy

---

# PHASE 8 — PERFORMANCE

* Lazy Loading
* Code Splitting
* Caching
* Image Optimization
* Rendering Optimization (the voxel viewport — do not change its tuning, only improve efficiency)
* Database Optimization (Supabase indexes, RLS-friendly queries)
* Bundle Optimization

Measure and verify before/after where practical.

---

# PHASE 9 — SECURITY

* Secure Routes
* Permission Middleware
* Supabase Row Level Security (RLS) enabled on all tables
* Rate Limiting
* Input Validation
* Sanitize Inputs
* Secure Sessions
* CSRF Protection where applicable
* Prevent Unauthorized Feature Access
* Never store secrets in client code (Razorpay secret, Supabase service-role key)

---

# PHASE 10 — TESTING & QA

Verify every feature.

* Desktop / Mobile / Tablet responsive behavior
* Cloud Saves
* Authentication
* Subscriptions
* Permissions & quotas
* Performance
* Theme
* Responsive Layout
* Build Success (`npm run build`)
* Lint Success (if ESLint is configured)
* Test suite passes (if Vitest is configured)

Remove unused imports.

Remove dead code.

Everything must compile successfully.

---

# PHASE 11 — COMMUNITY (PINTEREST-STYLE SOCIAL — LAST PHASE)

This phase is intentionally LAST. Plan it carefully and implement in sub-steps with a commit after each sub-step.

## Vision

Turn PixelDraw3D into a public social platform for pixel art, similar to Pinterest: users share designs publicly, follow each other, and interact through likes, comments and shares — all within the existing design language.

## Data model (add to the Supabase schema)

* `profiles` — public profile row (links to user record): displayName, username, avatar, bio, counts.
* `follows` — follower_id, following_id, createdAt.
* `post_likes` — design_id, user_id, createdAt.
* `post_comments` — design_id, user_id, body, createdAt.
* `shares` — design_id, user_id, createdAt (or count-based).

## Public profiles

* Public profile page per user (profile URL, e.g. `/u/{username}`).
* Avatar, display name, bio, follower count, following count, design count.
* Follow / Unfollow buttons with live counts.
* Search users.

## Community feed

* A public feed of shared designs: Trending, Recent, Popular tabs.
* Pinterest-style responsive grid layout of design cards.
* Each card shows the design thumbnail, creator, like count, comment count, and share button.
* Like / unlike with optimistic UI.
* Comments on designs (list + add).
* Share: copy public share link; a design page at a public URL.
* Remix: open another user's public design in the editor as a copy.

## Design pages

* Public design page at a shareable URL.
* Shows the design, creator, like/comment counts, comment section, and a Remix button.
* Respect privacy: only non-private designs appear publicly.

## Realtime

Use Supabase Realtime so follows, likes and comments update without a full reload where it adds value.

## Rules

* Never change the existing editor or viewport behavior while adding community.
* Keep every community view consistent with the current theme.
* RLS must protect private designs.

---

# DEPLOYMENT & ENVIRONMENT

## Hosting

* The frontend is already deployed to Vercel — keep it as a Vite SPA, unchanged.
* The backend runs on Supabase: database, auth, storage, realtime, and Edge Functions (Razorpay order + verification). No separate server to host.
* `.env.local` is gitignored and must never be committed.

## Environment variables

Client-side (Vite prefix `VITE_`; safe in the browser):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_RAZORPAY_KEY_ID            # public Razorpay key, used by checkout
```

Server-side only (Supabase Edge Function secrets / Vercel env, NEVER exposed to the client):

```
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

The Razorpay TEST keys are already stored in the local `.env.local`. Never commit real secrets.

---

# FINAL PRODUCT GOAL

PixelDraw3D should feel like a premium SaaS product.

Users should be able to:

* Draw
* Save
* Sync
* Share
* Follow and interact with creators
* Upgrade
* Manage subscriptions
* Manage billing
* Access premium tools
* Import images within their plan quota
* Export professional assets

The project must remain stable, scalable, maintainable and production-ready.

At no point should existing functionality or UI quality be sacrificed while implementing new features.
