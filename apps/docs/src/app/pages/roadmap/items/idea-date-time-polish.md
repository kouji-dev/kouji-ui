---
title: Date / Time / Calendar polish
description: Range presets, multi-date select, time-zone awareness, inline calendar mode, faster year-month navigation — the small wins that turn a working date picker into a great one.
version: v0.3+
date: Q4 2026
category: component
status: idea
---

- **Range presets** ("Last 7 days", "This quarter", "Year to date") as a slot on the range picker.
- **Multi-date select** mode for picking a non-contiguous set of days.
- **Time-zone-aware** date display + a `provideKjTimezone()` token that participates in the i18n locale provider.
- **Inline (non-popover) calendar mode** for booking-style flows where the calendar is the primary surface, not a dropdown.
- **Year-month jump scroller** — currently navigation through months is one-month-at-a-time; a virtualized year-month grid lets you jump.
