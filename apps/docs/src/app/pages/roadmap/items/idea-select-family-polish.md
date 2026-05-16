---
title: Select / Combobox / Tree-select polish
description: Virtual scrolling for huge option sets, async loaders with cancellation, free-text "create new" entries, recent-selections section, sticky group headers.
version: v0.3+
date: Q4 2026
category: component
status: idea
---

The dropdown family covers the common case but breaks down at scale:

- **Virtual scrolling for huge option sets** (10k+ options) — today the listbox renders every option upfront.
- **Async option loaders** with cancel-on-keystroke and skeleton rows during the request.
- **"Create new" inline option** for tag-style multi-select (free-text + suggest from the existing options).
- **Recent selections / favorites** section at the top of the listbox, swappable persistence adapter.
- **Sticky group headers** when scrolling long grouped lists — the group label stays visible until you scroll into the next group.
