---
title: Form-flow primitives — wizard, conditional fields, auto-save
description: The base inputs are shipped, but the form *flow* is thin. This is the missing 60% — multi-step, conditional, async-validated, auto-saving, dirty-tracking forms.
version: v0.3+
date: Q4 2026
category: component
status: idea
candidate: true
---

The pieces every real form ends up reimplementing:

- **Multi-step wizard** — `kj-form-step` + progress indicator, per-step validation gates, "you've got unsaved changes" guard when navigating away mid-flow.
- **Conditional fields** — declarative `kjShowWhen` directive driven by other field signals, no boilerplate `effect()` per dependency.
- **Async validation orchestration** — debounce, cancel-on-input, race-aware. The kind of plumbing every form currently rewrites.
- **Auto-save** — debounced submit + a small status pill (`saving…` → `saved` → `error, retry`).
- **Dirty / pristine tracking** + a `kjConfirmOnLeave` route-guard primitive so navigation away from an in-progress form prompts before discarding.
