---
title: Docs site v2 — sandbox, recipes, per-example theme picker
description: Live "try it" sandbox per example, theme picker per example, recipes for multi-component patterns, migration guides, manifest-driven API tables on every page.
version: v0.3+
date: Q4 2026
category: docs
status: idea
---

The docs already have working examples and a typed manifest; this turns them into something developers actually open daily:

- **"Try it" sandbox** per example — StackBlitz / WebContainer embed (or a built-in editor) so you can tweak the code and see the change without leaving the page.
- **Theme picker per example** — every code preview gets a small theme dropdown; switch instantly to see "yes, this *does* look right in cyberpunk too".
- **Recipes section** — multi-component patterns (dashboard with KPI cards + DataTable + filter drawer, sign-in flow with multi-step form + password rules, etc.), each with full source.
- **Per-version migration guides** auto-generated from the codemod-CLI's transform metadata.
- **Component-API table generated from the manifest** — props / events / slots / a11y contract on every component page, always in sync with the source.
