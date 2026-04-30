# Mobile-Friendly Docs — Design Spec

**Date:** 2026-04-30
**Scope:** `apps/docs` only — no changes to `packages/core`

---

## Goal

Make the docs site fully usable on mobile: readable content, accessible navigation, working live previews and code toggles. Modelled after angular.dev's mobile experience.

---

## What Changes

### Layout

| Breakpoint | Layout |
|---|---|
| > 768px | Unchanged — 3-column grid (sidebar / content / TOC) |
| ≤ 768px | Single-column. Sidebar off-screen. Top bar visible. |

The existing `@media (max-width: 768px)` rules in `docs-index.css` and `component-doc.css` already collapse to single-column. These stay; we layer the drawer behaviour on top.

### Mobile Top Bar

A sticky top bar rendered only on mobile (via `@media`), containing:

- **Hamburger button** (left) — opens the sidebar drawer
- **Logo / site name** (center or left of hamburger)

The top bar lives inside the existing layout template (not a new component). It is hidden on desktop via `display: none` above 768px.

### Sidebar Drawer

The existing `KjDocsSidebarComponent` gains:

- A `open` signal (`signal(false)`) tracking drawer state
- A `toggle()` and `close()` method
- CSS: `position: fixed; top: 0; left: 0; height: 100dvh; transform: translateX(-100%); transition: transform 0.25s ease; z-index: 200` — slides in when `open()` is true via a host class binding `[class.is-open]="open()"`
- On desktop the `transform` is reset to `translateX(0)` and `position` is `sticky` as today

A semi-transparent backdrop `<div class="sidebar-backdrop">` is rendered adjacent to the sidebar in the layout template. It appears when `open()` is true and calls `close()` on click. Hidden on desktop.

### Navigation close-on-link

Every `<a>` in the sidebar nav calls `close()` on click so the drawer dismisses when the user navigates. Achieved by passing a `closeDrawer` output or by injecting the sidebar reference in the parent layout.

### TOC

Hidden on mobile — no change from current behaviour.

### Code Blocks

Hidden by default via the existing "Show code" toggle — no change needed.

---

## Files to Touch

| File | Change |
|---|---|
| `docs-sidebar/docs-sidebar.ts` | Add `open` signal, `toggle()`, `close()` |
| `docs-sidebar/docs-sidebar.css` | Add mobile drawer styles (fixed position, transform, transition) |
| `docs-sidebar/docs-sidebar.html` | Emit `linkClicked` output on nav link click |
| `component-doc/component-doc.html` | Add mobile top bar + backdrop markup |
| `component-doc/component-doc.css` | Top bar styles, backdrop styles |
| `docs-index/docs-index.html` | Same top bar + backdrop |
| `docs-index/docs-index.css` | Same top bar + backdrop styles |

---

## Behaviour Details

- Drawer opens/closes with a CSS `transform` transition (no JS animation library)
- Body scroll is locked while the drawer is open (`overflow: hidden` on `<body>` via a `class` toggled by the signal's effect)
- Keyboard: `Escape` closes the drawer (host listener on the sidebar or the layout)
- Focus: opening the drawer moves focus to the first nav link; closing returns focus to the hamburger button
- The backdrop has `aria-hidden="true"`; the sidebar has `role="navigation"` (already present)
- The hamburger button has `aria-label="Open navigation"` / `"Close navigation"` toggled by state

---

## Out of Scope

- TOC on mobile (stays hidden)
- Code block changes (already work correctly)
- Home page (`home.css` already has its own responsive rules — not touched)
- Any changes to `packages/core`
