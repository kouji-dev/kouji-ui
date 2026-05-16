---
title: React port
description: Same components, same themes, React APIs.
version: "?"
date: "?"
category: component
status: idea
candor: Not soon. Want kj's Angular story to be airtight first.
---

A `@kouji-ui/react` package that exposes the same component surface with React idioms (`ref`, `children`, controlled inputs). The headless behaviours port directly — focus traps, portals, ARIA — but the rendering layer is reimplemented in React. The theme CSS is framework-agnostic, so it'd reuse the existing `@kouji-ui/themes` package unchanged.
