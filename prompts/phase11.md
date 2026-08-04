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
