# Motion preset library + reduced-motion service

**Date:** 2026-07-07
**Status:** design → build
**Scope:** consolidates roadmap `idea-motion-presets.md` (named CSS entrance/exit
presets, composable, reduced-motion aware) + the shared reduced-motion service.

## Problem

Motion today lives as ad-hoc per-component CSS. Each overlay/drawer/dialog hand-writes
`@media (prefers-reduced-motion)` blocks and bespoke `transition:` strings. There is no:

- shared, SSR-safe signal for `prefers-reduced-motion` that TS can read;
- named, reusable, designable motion vocabulary (`fade`, `slide-up`, `scale-spring`…).

## Goals (MVP)

1. **`KjReducedMotion` (core, `providedIn: 'root'`)** — exposes a
   `prefersReducedMotion: Signal<boolean>` derived from
   `matchMedia('(prefers-reduced-motion: reduce)')`. SSR-safe: `false` on the server,
   no DOM access until `afterNextRender`. Live-updates when the OS setting flips.
2. **Named motion presets (pure CSS)** — a shipped `motion.css` of composable named
   entrance/exit animations driven by data-attributes, keyed off CSS custom
   properties (durations/easings/distance) so designers can retheme without TS.
   Presets **no-op (collapse to a ~1ms opacity fade, no transform)** under
   `prefers-reduced-motion: reduce` — WCAG 2.1 AAA **2.3.3 Animation from Interactions**.
3. **`KjMotion` directive (core)** — a thin opt-in: apply a named preset + enter/exit
   state to any element via `[kjMotion]`. CSS does the animating; the directive
   reflects the state and surfaces `reduced()` for consumers that need JS timing.

Non-goals (deferred): runtime multi-preset composition (presets ship pre-composed,
e.g. `slide-up-fade`); JS animation orchestration / staggering; per-component
migration of existing overlays to the new presets.

## Design

### KjReducedMotion service

`packages/core/src/motion/reduced-motion.ts`. Mirrors `KjDirectionality`:

```ts
@Injectable({ providedIn: 'root' })
export class KjReducedMotion {
  readonly prefersReducedMotion: Signal<boolean>; // false on SSR
}
```

- `signal(false)` default. On the server (`!isPlatformBrowser`) or without a
  `window.matchMedia`, stays `false` and touches no DOM.
- In `afterNextRender`: read `mql.matches`, subscribe to `change`, update the signal,
  disconnect on destroy (`DestroyRef`).

### Motion tokens (themes)

Add semantic, theme-overridable tokens to `@kouji-ui/themes` `base.css`
(`--kj-motion-duration-sm|md|lg`, `--kj-motion-ease`, `--kj-motion-ease-in`,
`--kj-motion-ease-spring`, `--kj-motion-distance`) sourced from base primitives.
`motion.css` reads these with inline fallbacks so it also works standalone.

### motion.css presets

`packages/core/src/motion/motion.css` (shipped as an ng-packagr asset, like
`icon.css`), wrapped in `@layer kj.component`.

- Base `.kj-motion` sets `animation-duration/timing-function/fill-mode` from custom
  props.
- Selectors: `.kj-motion[data-kj-motion="<name>"][data-kj-motion-state="enter|exit"]`
  → `animation-name`.
- Presets (composed bundles): `fade`, `slide-up`, `slide-down`, `slide-left`,
  `slide-right`, `scale`, `slide-up-fade`, `scale-spring`. Each has an `-in`/`-out`
  keyframe pair combining transform + opacity.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` forces every preset to
  `kj-fade-in`/`kj-fade-out` at `1ms` — motion removed, appearance preserved,
  `animationend` still fires so state machines that await it don't hang.

### KjMotion directive

`packages/core/src/motion/motion.ts`, selector `[kjMotion]`:

- `kjMotion: InputSignal<string>` — preset name.
- `kjMotionState: InputSignal<'enter' | 'exit'>` (default `'enter'`).
- Host: `class.kj-motion`, `[attr.data-kj-motion]`, `[attr.data-kj-motion-state]`,
  `[attr.data-kj-reduced-motion]` (present when reduced).
- Injects `KjReducedMotion`; exposes `readonly reduced` computed for consumers.

### How components opt in

Author-side only: add the `motion.css` import to the app/global CSS (or component
styles) and drop `kjMotion` on the animated element, e.g.
`<div kjMotion="slide-up-fade" [kjMotionState]="open() ? 'enter' : 'exit'">`.
No per-component TS motion code; designers retheme via the `--kj-motion-*` props.

## Testing

- Unit: reduced-motion signal with a `matchMedia` mock (true/false + `change`
  event), SSR no-op (server `PLATFORM_ID`), directive class/attr application.
- Build: `pnpm build` (core + components + docs) green.
- E2E: Playwright — mount a preset, assert `.kj-motion[data-kj-motion]` +
  computed `animation-name`. Fallback to prerender-markup/computed-style if the
  sandbox can't run chromium/hydrate.

## Accessibility (WCAG 2.1 AAA)

- **2.3.3 Animation from Interactions (AAA):** all presets collapse to a ~1ms
  opacity fade with no transform under `prefers-reduced-motion: reduce`.
- Motion is decorative and opt-in; no content/state depends on it.
- Directive adds no interactive semantics (no role/tabindex) — purely visual.
