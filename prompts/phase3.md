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