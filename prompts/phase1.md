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