---
title: Enhance accessibility — runtime services + missing primitives
description: KjReducedMotion service, live-region pile-up coalescer, skip-to-content, focus-return on async routes, high-contrast detection. Cheap to add, hard to retrofit.
version: v0.3+
date: Q4 2026
category: a11y
status: idea
---

The behavioural primitives are solid; these fill the runtime-service gap that every component currently solves on its own:

- **`KjReducedMotion` service** — a single signal you read once, drives every conditional animation across the app. No more per-component media-query queries.
- **`KjLiveRegion` pile-up handler** — coalesce announcements within a debounce window so AT users don't get spammed by ten "row added" messages in a second.
- **Skip-to-content link primitive** with auto-targeting of the main landmark.
- **Focus-return on async route** — when a route loads via `loadComponent`, restore focus to the link that triggered the navigation automatically.
- **High-contrast mode detection** signal + a `provideKjHighContrastFallback({ when: 'forced-colors', use: 'kouji-hc' })` provider to auto-swap to a high-contrast theme.
