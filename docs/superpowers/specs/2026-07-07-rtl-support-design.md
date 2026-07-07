# RTL support — design spec

**Date:** 2026-07-07
**Status:** MVP (this PR) + deferred roadmap
**Stacked on:** `feat/locale` (PR #15). Builds on `KjLocale` (`packages/core/src/locale/`) — does **not** reimplement it.
**Roadmap:** `apps/docs/src/app/pages/roadmap/items/v0.2-rtl.md`

## Problem

`KjLocale` already *models* logical direction as signals (`direction`, `isRtl`)
and setters (`setDirection`). The locale spec explicitly **deferred** two things
to the RTL ticket:

1. The rendered **RTL/direction toggle UI**.
2. The **`<html dir>` mutation** driven by that direction.

Without those, changing `KjLocale.direction` reacts internally but the page
never actually flips: `<html dir>` stays put and layout never mirrors. This PR
closes that gap and proves the mirroring story on a focused component set.

## Approach

Three layers, smallest surface that demonstrates RTL end-to-end:

### 1. Drive `<html dir>` from `KjLocale.direction` (SSR-safe)

A root environment initializer (`provideKjDocumentDirection()`) sets up an
`effect` that writes `document.documentElement.dir = locale.direction()`
whenever the resolved direction changes. Guarded by `isPlatformBrowser` +
`afterNextRender` so the server never touches the DOM (SSR renders `dir` from
the app's own template/`KjLocaleConfig`; the client reconciles). This is the
**one** writer of `<html dir>`; `KjDirectionality` remains the *reader* that
feeds `KjLocale`'s `'auto'` derivation. The write is idempotent (skip if the
attribute already matches) so it never fights an app that sets `dir` itself.

### 2. A visible direction toggle

`KjDirectionToggle` — a themed button component (in `@kouji-ui/components`)
that reads `locale.isRtl()` and calls `locale.setDirection('ltr' | 'rtl')`.
Keyboard-native (`<button>`), `aria-pressed` reflects RTL state, labeled. It is
the concrete control the locale spec pointed at.

### 3. Physical → logical CSS conversion

CSS already leans logical across the library (breadcrumb uses
`margin-inline-end` / `padding-inline`; dropdown-menu uses `text-align: start`).
The RTL work is to (a) convert the remaining logical-intent physical properties
in the focused set to logical equivalents, and (b) **verify** the focused
components mirror under `dir="rtl"`.

Conversions applied:
- `margin-left` / `margin-right` (spacing intent) → `margin-inline-start` / `-end`
- `text-align: left|right` → `text-align: start|end`
- `padding-left` / `padding-right` → `padding-inline-start` / `-end`

**Not** converted (physically anchored *by design*, independent of reading
direction): `drawer[data-kj-side="left|right"]` physical edges, toast
viewport `[data-position-x]` corners, popover/tooltip arrow centering offsets
(these follow the anchored side the positioning engine computes, which already
tracks the trigger's real position).

## What ships in THIS PR (MVP)

- `provideKjDocumentDirection()` in `@kouji-ui/core` — SSR-safe `<html dir>` writer + unit tests.
- `KjDirectionToggle` in `@kouji-ui/components` — visible, accessible toggle + unit tests.
- Logical-property conversion + mirroring verification for the focused set:
  **overlays** (dropdown-menu, dialog, toast, popover/tooltip), **pagination**,
  **breadcrumb**.
- Docs: an RTL example demonstrating the toggle + mirrored breadcrumb/pagination,
  wired into example auto-discovery; `@doc-example` blocks on the toggle.
- E2E (Playwright): toggle → assert `<html dir="rtl">` and a mirrored component
  lays its inline-start on the right.
- Changeset (minor: core + components).

## Deferred (rationale)

- **Full physical→logical sweep** of every component (sliders, calendars,
  stepper, menubar, tabs, chat, table, input-group, etc.). Rationale: MVP scope;
  each needs its own visual RTL verification. Tracked by the v0.2 roadmap item.
- **Sliders / calendars** directional key handling (Arrow keys swap under RTL) —
  requires per-component keyboard-contract review; `KjDirectionality`/`KjLocale.isRtl`
  already give them the signal to branch on when done.
- **Overlay positioning engine** RTL-awareness for `start`/`end` *logical*
  placements. Current engine anchors to the trigger's real geometry, so anchored
  overlays already appear on the correct side; logical placement *names* are a
  follow-up.
- **Language menu** (locale switcher) — separate ticket; shares the same setters.

## Accessibility (WCAG 2.1 AAA)

- **1.3.2 Meaningful Sequence** — mirroring is CSS-logical only; DOM order is
  unchanged, so reading/tab order stays correct in both directions.
- **4.1.2 Name, Role, Value** — toggle is a native `<button>` with `aria-pressed`
  and an accessible name.
- **2.1.1 Keyboard** — toggle is reachable and operable by keyboard (native button).
- `<html dir>` correctness gives AT the right base direction for the whole tree.

## Verification

- Unit: `provideKjDocumentDirection` (SSR no-op, browser writes/reacts),
  `KjDirectionToggle` (aria-pressed, setter wiring).
- Build: `pnpm build` for core + components + docs.
- E2E: Playwright asserts `<html dir="rtl">` after toggle and inline-start-on-right
  layout of a mirrored component. If Chromium is unavailable in the sandbox, fall
  back to a prerendered-markup / computed-style assertion and say so.
