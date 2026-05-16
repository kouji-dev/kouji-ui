---
title: Dialog + Drawer power features
description: Resizable dialogs, fullscreen toggle, multi-dialog stacking, side-peek drawer mode, "don't show again" pattern — the edge cases real apps run into once they've outgrown the basics.
version: v0.3+
date: Q4 2026
category: component
status: idea
---

The overlay system is solid for the 80% case. These are the 20% that everyone hits eventually:

- **Resizable dialog** — drag a corner / edge to enlarge for content-heavy modals (rich-text editors, log viewers).
- **Fullscreen toggle** as a built-in header action; remembered per-dialog-id.
- **Stacked dialog management** — z-index, focus, escape-key, and backdrop orchestration when a confirm-popup opens from inside a dialog. Currently a footgun.
- **Side-peek drawer mode** — drawer that doesn't backdrop-block the underlying surface, for inspectors that pair with a list.
- **"Don't show again"** option pattern, baked in with a swappable persistence adapter.
