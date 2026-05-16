---
title: Chart engine integration primitives
description: Adapter pattern for ECharts / visx / d3 / Recharts — let consumers plug in a heavy engine and get kj theming, a11y, reduced-motion, and resize-observer wiring for free.
version: v0.3+
date: Q4 2026
category: component
status: idea
---

The v0.1 chart suite covers the simple cases (line / bar / area / donut / sparkline) with our own SVG. For everything else — financial candlesticks, geo maps, heatmaps, networks — consumers want a real charting engine.

Ship a thin adapter layer:

- **`KjChartHost`** — a host primitive that handles theme-token resolution, dark/light auto-swap, `ResizeObserver` plumbing, `prefers-reduced-motion` opt-out, and the a11y description / live-region announcements.
- **First-party adapters** for ECharts, visx, Recharts, and d3 — each adapter consumes `KjChartHost`'s resolved tokens and renders into its slot.
- **BYO adapter** — small contract (`registerAdapter({ name, render, dispose, onResize, onThemeChange })`) so consumers can wrap any chart engine they want and still get the kj wiring.
- **Stable a11y story** — every chart, regardless of engine, exposes the same `aria-label` summary + keyboard-navigable data-point list (built on the existing `KjLiveRegion` + `KjRovingTabindex`).
