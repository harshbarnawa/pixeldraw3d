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