---
title: Command palette pro — pinned, recent, groups, async, multi-level
description: The next layer on top of the shipped command palette — frecency ranking, collapsible result groups, per-item shortcuts, async loader with skeleton, and drill-in navigation.
version: v0.3+
date: Q4 2026
category: component
status: idea
candidate: true
---

The base palette is shipped; these are the high-leverage extensions on top:

- **Pinned + recent items** at the top, automatic frecency ranking, swappable persistence adapter.
- **Result groups** with collapsible headers and per-group icons.
- **Per-item keyboard shortcut display** using the existing `kj-kbd` component, with optional global hotkey wiring.
- **Async loader** with debounce, cancel-on-keystroke, and skeleton rows — today it's a single-pass list.
- **Multi-level navigation** — drill into a section (`Settings → Notifications → …`) within the same palette frame, back-arrow to return, breadcrumb at the top.
- **Inline action preview** — hovering an action shows a small preview of the change it would make.
