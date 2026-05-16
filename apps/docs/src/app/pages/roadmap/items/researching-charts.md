---
title: Chart primitives
description: Line, bar, area charts as themed components. Maybe.
version: v0.7+
date: Q4 2026
category: component
status: idea
candidate: true
issues: 8
prs: 0
candor: Honestly torn. Comments welcome on the RFC.
---

We're undecided. Charts are a huge surface area, and there are good libraries already (Apache ECharts, visx). If we ship them, they'll wrap an existing engine and just make it themeable + accessible. If we don't, we'll publish a theming recipe for the popular libraries instead.
