---
title: Toast system — actions, progress, queues, history
description: Toast is shipped as a primitive; this promotes it to a notification system with action buttons, progress, replace-by-id, overflow strategies, and a history panel.
version: v0.3+
date: Q4 2026
category: component
status: idea
---

- **Action toasts**: a slot for undo / retry / dismiss buttons (today: text only).
- **Progress toasts** — a thin progress bar inside the toast that updates while a long-running operation runs.
- **Group / replace by id** — same id collapses repeats instead of stacking the same message four times.
- **Queue overflow strategy** — `drop-oldest` / `compact` / `merge-by-channel`, configurable per app.
- **Persistent toasts** that survive route changes (separate channel from transient ones).
- **History panel** — opt-in, replays the last N notifications; pairs nicely with the audit-log story.
