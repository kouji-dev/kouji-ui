---
title: Per-theme visual regression harness
description: Playwright + screenshot snapshots × 13 themes per component. Catches design drift on every PR.
version: v0.3+
date: Q4 2026
category: perf
status: idea
candidate: true
candor: Storage cost of N components × 13 themes × multiple states is real — need a sampling strategy.
---

Run the playground of every component through Playwright across all 13 themes, capture a screenshot per state (default / hover / focus / disabled / loading), and diff on PRs. Catches the "I styled it for kouji but it's broken on terminal" class of regression — currently caught manually, sometimes weeks late.
