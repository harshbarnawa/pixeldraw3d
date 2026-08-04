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
