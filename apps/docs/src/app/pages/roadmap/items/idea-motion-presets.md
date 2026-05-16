---
title: Motion preset library
description: Named entrance/exit/transition presets. Composable, reduced-motion aware, designable in pure CSS.
version: v0.3+
date: Q4 2026
category: theme
status: idea
candidate: true
issues: 5
prs: 0
---

Move beyond per-component animation strings to a kit of named presets — `slide-up-fade`, `scale-spring`, `drift-in`, `pulse-attention`. Each preset is a CSS custom-property bundle that any overlay/drawer/dialog can opt into. All presets respect `prefers-reduced-motion`. Designers can author new presets without touching TS.
