# Speed Dial / FAB

A FAB (floating action button) is a single, viewport-anchored circular button that
launches the screen's primary action. A Speed Dial is the same FAB extended with a
cluster of secondary action buttons that appear on hover, click, or focus. They
share visual identity (round, elevated, anchored, persistent) and accessibility
contract (button → optionally a menu of buttons).

This file covers both, treated as a single component family with two modes
(`mode: 'fab' | 'speed-dial'`); see [Decision](#decision-core-directive).

## Source comparison

### PrimeNG — `<p-speedDial>`

Selected as the **primary reference** by user direction in
[`target-components-list`](../../superpowers/specs/2026-05-06-target-components-list.md).

Public API surface (PrimeNG 17/18):

| Input             | Notes                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `model`           | `MenuItem[]` — the action list (label, icon, `command()` callback, `disabled`).                    |
| `direction`       | `'up' \| 'down' \| 'left' \| 'right' \| 'up-left' \| 'up-right' \| 'down-left' \| 'down-right'`.   |
| `type`            | `'linear' \| 'circle' \| 'semi-circle' \| 'quarter-circle'` — geometry of the expanded cluster.     |
| `radius`          | Distance in px from the FAB to each action (only meaningful for non-linear types).                  |
| `transitionDelay` | Stagger between each item's enter animation (ms).                                                   |
| `mask`            | Boolean — render a full-screen scrim behind the expanded cluster, click closes.                     |
| `hideOnClickOutside` | Defaults `true`. False keeps the speed dial open until the trigger is re-pressed.                |
| `showIcon` / `hideIcon` | Icons displayed on the trigger when collapsed / expanded.                                    |
| `rotateAnimation` | Boolean — rotate the trigger icon between collapsed/expanded states.                                |
| `tooltipOptions`  | Per-item tooltip configuration forwarded to PrimeNG's tooltip directive.                            |
| `buttonProps` / `actionButtonProps` | Pass-through HTML attribute bags for the trigger and each action.                 |
| `tabindex`        | Integer — applied to trigger.                                                                       |

| Output       | Notes                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| `onClick`    | Trigger clicked.                                                            |
| `onShow`     | Cluster opened.                                                             |
| `onHide`     | Cluster closed.                                                             |
| `onVisibleChange` | Boolean visibility change.                                             |
| `onFocus` / `onBlur` | Focus crossings on the trigger.                                    |

Behaviour:

- Opens on click, hover, or focus depending on configuration.
- Items are rendered as `<button type="button">` in a `<ul role="menu">` with each
  `<li role="menuitem">`. Arrow-key navigation walks the items linearly even when
  `type="circle"`; the visual circle is purely transform-based.
- Escape closes and returns focus to the trigger.
- The trigger element is a `<button>` with `aria-haspopup="true"` and
  `aria-expanded` toggled.
- `model` items can have nested submenus, but in practice this is rare and
  awkward inside a circular cluster — PrimeNG renders nested submenus, but we
  flag this as a non-goal (see [Open questions](#open-questions--risks)).

Critique:

- API is **data-driven only**: the consumer passes a `MenuItem[]` and PrimeNG
  renders the button + icon + tooltip. There is no way to opt into custom
  templates per item, and no slot for the trigger contents (you provide an icon
  string, not an icon component or `<ng-content>`). This is the opposite of
  kouji's directive-on-host philosophy.
- `model: MenuItem[]` mixes data and behaviour (`command` callbacks live on the
  item record), which conflicts with Angular's signal/template idioms.
- The geometry (`type` × `direction` × `radius`) is style, not behaviour. It does
  not belong in the headless core directive.
- No first-class long-press or right-click open mode (would be reasonable on
  mobile).

### Angular Material — no first-class Speed Dial

Material ships **only** a FAB primitive as a Button variant:

- `mat-fab` / `<button mat-fab>` — 56 × 56 px circular elevated button.
- `mat-mini-fab` / `<button mat-mini-fab>` — 40 × 40 px variant.
- `mat-fab extended` — pill-shaped FAB with a label slot.

There is no built-in Speed Dial. Material's documented guidance is to compose
one out of `mat-fab` plus `MatMenu`, or use the community
`@angular-material-extensions/fab-speed-dial` package (CDK-based, last
significant release ~2021, not maintained against modern Angular signals).

This means **any kouji speed-dial decision is greenfield**: there is no
Material API to mirror or be compatible with. The FAB-as-button-variant
philosophy is itself relevant — see [Decision](#decision-core-directive).

### daisyUI — `fab` component

Pure CSS class. The DOM shape daisyUI documents is:

```html
<div class="fab">
  <div tabindex="0" role="button" class="btn btn-circle btn-lg">F</div>
  <div class="fab-main-action">…</div>           <!-- shown when focused/hovered -->
  <button class="btn btn-circle">A</button>       <!-- speed-dial action 1 -->
  <button class="btn btn-circle">B</button>       <!-- speed-dial action 2 -->
</div>
```

Notable choices:

- The trigger is `tabindex="0" role="button"` on a `<div>`, not a real
  `<button>`. This is a daisyUI a11y wart we will **not** copy — kouji's WCAG
  AAA stance demands a native `<button>`.
- Open/close is driven by CSS `:focus-within` and `:hover`. There is no
  JS-managed state, no Escape handler, no focus restoration, no focus trap on
  the cluster.
- No "FAB-only" mode — the DOM is the speed-dial DOM with a single action when
  you only want one.
- daisyUI calls a special `fab-main-action` element which swaps in to replace
  the resting trigger when expanded. This is daisyUI's idiom for "tap the FAB to
  do the primary thing, hover/focus to see secondary things"; PrimeNG has no
  equivalent.

Critique: daisyUI's structure is a useful cue for how a styled wrapper should
present the resting and expanded surfaces, but the focus/keyboard behaviour is
inadequate for AAA — kouji's core directive must drive these, not CSS.

### Cross-library summary

|                      | PrimeNG          | Material      | daisyUI          | kouji direction                              |
| -------------------- | ---------------- | ------------- | ---------------- | -------------------------------------------- |
| Single FAB           | via `model.length === 1` (awkward) | yes (`mat-fab`) | yes (just `.fab` with one btn) | **explicit `mode='fab'`**                    |
| Speed Dial cluster   | yes              | DIY           | yes (CSS only)   | **explicit `mode='speed-dial'`**              |
| Trigger element      | `<button>`       | `<button>`    | `<div role="button">` | **native `<button>`** (AAA)                  |
| Open semantics       | `aria-haspopup="true"` + menu role | n/a       | none             | `aria-haspopup="menu"` + `aria-expanded`     |
| Item navigation      | arrow keys       | n/a           | tab only         | arrows + Home/End + typeahead, Esc closes    |
| Geometry             | input enum       | n/a           | CSS only         | **wrapper concern** — out of core directive  |
| Tooltip per item     | input            | DIY           | DIY              | compose `[kjTooltipContent]` on each item    |
| Mask / scrim         | input            | n/a           | n/a              | wrapper concern; core exposes `expanded` flag |

## Decision (core directive?)

**Yes — one core directive family is required**, with the following composition:

| Directive             | Role                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `[kjSpeedDial]`       | Root container. Owns `expanded` signal + `mode` input. Provides `KJ_SPEED_DIAL` context.    |
| `[kjSpeedDialTrigger]` | Trigger button. Wires `aria-haspopup`, `aria-expanded`, `aria-controls`. Toggles state.     |
| `[kjSpeedDialContent]` | Action container. Holds `role="menu"`, runs roving-tabindex, owns Esc/click-outside.        |
| `[kjSpeedDialAction]`  | Individual action button. Holds `role="menuitem"`. Closes the dial on activation.           |

Why a directive (rather than "just use `kjButton` for FAB and `kjMenu` for the
expanded cluster"):

1. **The trigger is not a generic menu trigger.** It needs FAB-mode (no popup, no
   `aria-haspopup`) and speed-dial-mode (popup) sharing one selector so the
   styled wrapper renders one component.
2. **State semantics differ from kjMenu.** Speed dial supports hover-to-open
   *and* click-to-toggle on desktop, where `kjMenu` is click-only. It also has a
   distinct focus-out-of-cluster close behaviour: when focus leaves both the
   trigger and the content, the dial closes (matches PrimeNG); kjMenu closes on
   document click only.
3. **Focus restoration on close.** When the cluster closes, focus must return to
   the trigger if focus was inside the cluster — this is the same contract as
   `KjMenu` and we will lift it into the speed-dial directive.
4. **AAA contract** (touch target, ARIA wiring, keyboard) needs to be enforced
   in the headless core, not left to the wrapper.

**Single component, two modes** is preferred over splitting into `[kjFab]` +
`[kjSpeedDial]`. Justification:

- The styled wrapper renders one component (`<kj-speed-dial>`) that takes a
  `mode` input — visually the FAB and the speed-dial trigger are identical
  (round, elevated, anchored), and most projects start with a FAB and grow it
  into a speed dial as the second action lands.
- Splitting into two directives forces consumers to migrate selectors when going
  from one action to many. With one directive, adding a second
  `[kjSpeedDialAction]` flips the mode by data, with the explicit `mode` input
  available when the consumer wants to lock the behaviour.
- In `mode='fab'` the directive degenerates to "thin wrapper around `[kjButton]`
  semantics + viewport anchor". The trigger directive in that mode does not set
  `aria-haspopup` and `aria-expanded`, no content directive is required, and
  click goes straight to the consumer's `(click)` handler. This is cheap.

## Base features

- **Modes:** `'fab'` (single anchored button) and `'speed-dial'` (button +
  expanding cluster). `mode` defaults to:
  - `'fab'` when the projected DOM contains zero `[kjSpeedDialAction]` elements,
  - `'speed-dial'` when one or more are present.
  - Consumer can pin via explicit `[kjMode]="'fab'"` (e.g. to disable the
    cluster temporarily without removing the actions from the template).
- **Open triggers (speed-dial mode):**
  - Click on trigger toggles.
  - `kjOpenOnHover` (default `false`) — hover opens, mouse leaving the whole
    container with a 200ms grace closes. Disabled on coarse pointers
    (`(pointer: coarse)`) so touch users get click-to-open.
  - Focus on the trigger does **not** auto-open (avoids surprise expansion when
    tabbing past). Pressing `ArrowUp`/`ArrowDown`/`Enter`/`Space` on a focused
    trigger opens and moves focus into the cluster.
- **Close triggers:** Escape, click outside, focus leaving both trigger and
  content (matches PrimeNG `onBlur`-style close), action invocation.
- **Geometry / direction / radius:** **NOT in core**. The wrapper picks layout
  via CSS (Tailwind classes) keyed off `data-direction`, `data-type`,
  `data-radius` attributes which the core directive reflects from inputs.
  Concretely: the core takes `kjDirection: 'up' | 'down' | 'left' | 'right'`
  and `kjType: 'linear' | 'circle' | 'semi-circle' | 'quarter-circle'` and
  reflects them as `data-direction` / `data-type` only — it does no positioning
  math.
- **Stagger:** core exposes `kjTransitionDelayMs` and reflects it as a CSS
  custom property `--kj-speed-dial-stagger` on the content host; the wrapper
  consumes it in animation rules.
- **Mask / scrim:** wrapper concern. Core does not render a scrim. The wrapper
  reads `expanded` via the context to decide whether to mount a backdrop.
- **Variant / Size:** `KjVariant` and `KjSize` host directives on the trigger
  (same as `KjButton`). Actions also receive `KjSize` defaulting one step
  smaller than the trigger.
- **Tooltips per action:** consumer composes
  `[kjTooltipTrigger]="actionTip"` + a `<div #actionTip kjTooltipContent>` next
  to the action. Core directive does not own this.

## Accessibility (WCAG 2.1 AAA)

### Roles

| Element                  | Role                              |
| ------------------------ | --------------------------------- |
| `[kjSpeedDial]`          | none (visual container only)      |
| `[kjSpeedDialTrigger]`   | implicit `button` (must be `<button type="button">`) |
| `[kjSpeedDialContent]`   | `menu` (only when `mode='speed-dial'`; element is `hidden` when collapsed) |
| `[kjSpeedDialAction]`    | implicit `button` + ARIA `menuitem` (set via `role="menuitem"` host attr) |

### ARIA wiring

On `[kjSpeedDialTrigger]` (speed-dial mode only):

- `aria-haspopup="menu"`
- `aria-expanded="true|false"` reflecting the open signal.
- `aria-controls="<content id>"` — content's id is auto-generated
  (`kj-speed-dial-{n}`).
- `aria-label` is **required** on the trigger when its visible content is
  icon-only. The directive does not assert this at runtime but the lint
  rule + docs example show the labelled form. (Speed dial triggers are
  almost always icon-only.)

On `[kjSpeedDialTrigger]` (FAB mode):

- No `aria-haspopup`, no `aria-expanded`, no `aria-controls`.
- `aria-label` requirement unchanged.

On `[kjSpeedDialAction]`:

- `role="menuitem"` so the cluster is a real menu by AAPCA semantics.
- `aria-label` required when icon-only; consumers commonly provide this via
  `[attr.aria-label]` or compose `KjVisuallyHidden` for inline label text.
- `aria-disabled` reflected from `kjDisabled` (see `KjButton` pattern — kouji
  does **not** use the native `disabled` attribute).

### Keyboard contract

| Key                   | When focus is on…       | Behaviour                                                   |
| --------------------- | ----------------------- | ----------------------------------------------------------- |
| `Enter` / `Space`     | Trigger (collapsed)     | Open + move focus to first action.                          |
| `Enter` / `Space`     | Trigger (expanded)      | Close + keep focus on trigger.                              |
| `ArrowDown` / `ArrowUp` | Trigger (collapsed)   | Open. ArrowDown → first action, ArrowUp → last action.       |
| `ArrowDown` / `ArrowUp` | Action                | Move to next/previous action (wraps).                        |
| `ArrowLeft` / `ArrowRight` | Action             | Same as up/down — direction-axis-agnostic so the cluster's keyboard behaviour matches whichever direction the wrapper rendered. |
| `Home` / `End`        | Action                  | First / last action.                                         |
| `Escape`              | Trigger or Action       | Close. Focus returns to trigger.                             |
| `Tab`                 | Action                  | Closes the dial and lets natural Tab escape (matches PrimeNG). |
| Type-ahead (printable char) | Action            | Jumps to next action whose label starts with that letter (reuses logic from `KjMenu`). |

The roving-tabindex is owned by `[kjSpeedDialContent]` via `KjRovingTabindex`
(orientation `'vertical'`, wraps): only the active action has `tabindex="0"`,
the rest `tabindex="-1"`.

### Focus management

- Click-to-open or Enter/Space-to-open from the trigger moves focus to the
  first action (matches the keyboard contract above; a hover-open does not move
  focus).
- Closing via Escape, action activation, or click-outside returns focus to the
  trigger **only** if focus was inside the cluster at close time. If focus had
  already moved elsewhere (e.g. user Tabbed away), focus is not stolen back.
- No focus trap. The cluster is intentionally escapable via Tab — speed dials
  are persistent UI, not modal. This differs from Dialog (which uses
  `KjFocusTrap`).

### Touch target (WCAG 2.5.5 AAA — 44×44 CSS px)

The core directive cannot enforce sizes (no styles), but the styled wrapper's
`KjSize` defaults must guarantee 44×44 px minimum for both the trigger and each
action regardless of `kjSize`. The action defaults one step smaller than the
trigger; if `kjSize='xs'` is requested, the wrapper still renders at 44×44 with
an inner icon scaled down. This is enforced in the wrapper's preset, not core.

### Reduced motion

Wrapper concern. Core reflects `data-expanded` and `data-mode`; the wrapper's
animation rules guard with `@media (prefers-reduced-motion: reduce)`. No
behaviour change in core.

### Live region for dynamic actions

Out of scope for the v1 directive. If a consumer mutates the action list while
the dial is open, the `KjMenu` precedent (no announcement) applies. Open
question flagged below.

## Composition model

```
speed-dial/
  speed-dial.ts             ← KjSpeedDial (root container, mode + state)
  speed-dial-trigger.ts     ← KjSpeedDialTrigger (the FAB button itself)
  speed-dial-content.ts     ← KjSpeedDialContent (action menu container)
  speed-dial-action.ts      ← KjSpeedDialAction (one item)
  speed-dial.context.ts     ← KJ_SPEED_DIAL token + KjSpeedDialContext interface
  speed-dial.example.ts
  speed-dial.fab.example.ts
  speed-dial.directions.example.ts
  speed-dial.spec.ts
  index.ts
```

### Shared state (`KJ_SPEED_DIAL` context)

```ts
export interface KjSpeedDialContext {
  readonly mode: Signal<'fab' | 'speed-dial'>;
  readonly expanded: Signal<boolean>;
  readonly contentId: string;
  open(focusFirst: boolean): void;
  close(restoreFocus: boolean): void;
  toggle(): void;
}
export const KJ_SPEED_DIAL = new InjectionToken<KjSpeedDialContext>('KjSpeedDial');
```

`KjSpeedDial` (root) provides this token. Trigger and Content directives
`inject(KJ_SPEED_DIAL)`. Actions inject it to call `close(true)` on activation
and to query `expanded` for `tabindex` decisions handled inside
`KjRovingTabindex`.

### `hostDirectives` composition

- `KjSpeedDialTrigger` composes:
  - `KjVariant` (input alias `kjVariant`)
  - `KjSize` (input alias `kjSize`)
  - `KjFocusRing`
  - `KjDisabled` (input alias `kjDisabled`)
  - It does **not** compose `KjButton` itself — the trigger has its own
    open/close click semantics that conflict with `KjButton`'s pressed-toggle
    handling. We re-use `KjVariant`/`KjSize`/`KjFocusRing`/`KjDisabled`
    directly. Reuse of `KjButton` was considered and rejected: speed-dial
    triggers are never toggle buttons, never have `aria-pressed`, and need
    custom keyboard handling for arrow-up/down to open the cluster.
- `KjSpeedDialAction` composes:
  - `KjVariant`, `KjSize`, `KjFocusRing`, `KjDisabled`.
  - It also reuses the click-suppression pattern from `KjButton`
    (capture-phase listener that swallows clicks when disabled). To avoid
    duplication, that pattern should be lifted into a small
    `kjActivatable` helper (or we simply inline it — same as `KjButton`
    does today). **Decision:** inline for v1; refactor into a shared helper if
    a third button-like directive needs it. Tracked under Open questions.
- `KjSpeedDialContent` composes:
  - `KjRovingTabindex` (orientation: `'vertical'`, wrap: `true`).
  - It does **not** compose `KjFocusTrap`: the cluster is non-modal.

### Cross-component pointers

- **Button** (`packages/core/src/button/button.ts`) — pattern for variant/size
  composition + capture-phase click suppression on disabled. The trigger and
  action directives mirror this disabled-handling stance. The styled wrapper
  in `@kouji-ui/components` may render the trigger using the same
  `<button kjButton>` host as a normal button when `mode='fab'` — see
  [`actions/button.md`](./button.md) once written.
- **Dropdown Menu** (`actions/dropdown-menu.md`) — shares the trigger pattern
  (`aria-haspopup` / `aria-expanded` / `aria-controls`), arrow-to-open
  semantics, Escape-to-close, focus restoration. The two should converge on a
  shared `[kjPopupTrigger]` primitive in a future refactor; for v1 we
  duplicate the host bindings rather than block on the abstraction.
- **Menu** (`packages/core/src/menu/menu.ts`) — existing implementation we
  draw from for keyboard nav (Arrows/Home/End/typeahead) and click-outside.
  Speed-dial reuses the typeahead matcher but **not** the click-outside helper
  (we need focus-out semantics, not click-out semantics, to match PrimeNG).
- **Tooltip** (`feedback/tooltip.md` + `packages/core/src/tooltip/tooltip.ts`)
  — composed per-action by consumers. The directive itself does not own
  tooltip behaviour. The wrapper's docs example demonstrates the
  `[kjTooltipContent]` + `[kjTooltipTrigger]` pairing per action.
- **Dialog** (`actions/dialog.md`) — only relevant as the "this is what we
  consciously do not do" reference: speed dial is not modal, no focus trap, no
  scrim by default.

## Inputs / Outputs / Models

### `[kjSpeedDial]` (root)

| Member                 | Kind   | Type                                              | Default   | Notes                                                                                          |
| ---------------------- | ------ | ------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `kjMode`               | input  | `'fab' \| 'speed-dial' \| 'auto'`                 | `'auto'`  | `'auto'` resolves at runtime from action count.                                                 |
| `kjOpen`               | model  | `boolean`                                         | `false`   | Two-way bindable. Setting it to `true` opens; `false` closes. Honours `kjDisabled`.             |
| `kjOpenOnHover`        | input  | `boolean`                                         | `false`   | Coarse-pointer media query forces this to `false` regardless.                                   |
| `kjHoverGraceMs`       | input  | `number`                                          | `200`     | Mouse-leave grace before the dial closes when `kjOpenOnHover=true`.                              |
| `kjCloseOnFocusOut`    | input  | `boolean`                                         | `true`    | Mirrors PrimeNG's blur-close behaviour.                                                         |
| `kjDirection`          | input  | `'up' \| 'down' \| 'left' \| 'right'`             | `'up'`    | Reflected as `data-direction` for the wrapper; no positioning math in core.                     |
| `kjType`               | input  | `'linear' \| 'circle' \| 'semi-circle' \| 'quarter-circle'` | `'linear'` | Reflected as `data-type`.                                                              |
| `kjTransitionDelayMs`  | input  | `number`                                          | `30`      | Per-item stagger in ms. Reflected as CSS var `--kj-speed-dial-stagger`.                          |
| `kjDisabled`           | input  | `boolean`                                         | `false`   | Prevents opening; if open, closes. Reflected as `aria-disabled` on the trigger.                  |

| Member                 | Kind   | Payload                                           | Notes                                                                                          |
| ---------------------- | ------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `kjOpenChange`         | output | `boolean`                                         | Emitted alongside `kjOpen` model writes; convenience for consumers using `[kjOpen]` only.       |

### `[kjSpeedDialTrigger]`

| Member        | Kind   | Type                                  | Default | Notes                                                          |
| ------------- | ------ | ------------------------------------- | ------- | -------------------------------------------------------------- |
| `kjVariant`   | input  | `KjVariant` (forwarded)               | preset  | Via `KjVariant` host directive.                                 |
| `kjSize`      | input  | `KjSize` (forwarded)                  | preset  | Via `KjSize` host directive.                                    |
| `kjDisabled`  | input  | `boolean`                             | `false` | Via `KjDisabled` host directive. Click suppressed in capture phase. |

No outputs — the consumer's `(click)` handler still fires for the FAB-mode
primary action; in speed-dial mode the trigger's job is to toggle, and any
consumer `(click)` is preserved.

### `[kjSpeedDialContent]`

No public inputs/outputs. Its job is structural (roving tabindex, Escape,
focus-out close). Inherits `expanded` from the context.

### `[kjSpeedDialAction]`

| Member        | Kind   | Type                                  | Default | Notes                                                          |
| ------------- | ------ | ------------------------------------- | ------- | -------------------------------------------------------------- |
| `kjVariant`   | input  | `KjVariant` (forwarded)               | preset  |                                                                |
| `kjSize`      | input  | `KjSize` (forwarded)                  | preset (defaults one step smaller than trigger) |                              |
| `kjDisabled`  | input  | `boolean`                             | `false` |                                                                |
| `kjCloseOnActivate` | input | `boolean`                          | `true`  | Some actions (e.g. "expand to full menu") may want to keep the dial open. |

Activation (click / Enter / Space) calls `ctx.close(true)` when
`kjCloseOnActivate` is `true`, then lets the consumer's bound `(click)` fire.

## Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Speed dial — basic** (`speed-dial.example.ts`): trigger + 3 actions stacked
   upward (`kjType='linear'`, `kjDirection='up'`). Default theme. Demonstrates
   click-to-open, Escape-to-close, focus restore.
2. **FAB only** (`speed-dial.fab.example.ts`): single anchored button using
   `kjMode='fab'` with a primary `(click)` handler. No actions projected. Shows
   that the directive degenerates cleanly.
3. **Directions** (`speed-dial.directions.example.ts`): four side-by-side dials
   showing `up | down | left | right`. Demonstrates that arrow-key navigation
   stays consistent regardless of visual axis.
4. **Geometry types** (`speed-dial.types.example.ts`): `linear`, `circle`,
   `semi-circle`, `quarter-circle` side by side. Wrapper-only differences;
   semantics identical.
5. **Tooltips per action** (`speed-dial.tooltips.example.ts`): each action
   composes `[kjTooltipContent]` + `[kjTooltipTrigger]`.
6. **Hover-to-open** (`speed-dial.hover.example.ts`): `kjOpenOnHover=true`,
   demonstrates the grace timer + automatic disable on coarse pointers.
7. **Themed** (`speed-dial.retro.example.ts`, `speed-dial.finance.example.ts`):
   variant + size composition under retro and finance themes — mirrors the
   button doc structure.

## Open questions / risks

1. **`kjMode='auto'` and dynamic action counts.** If actions are added to the
   template via `@for` and the count crosses 0 ↔ 1, mode flips at runtime,
   which means `aria-haspopup` / `aria-expanded` come and go on the trigger.
   This is technically correct but may surprise screen-reader users mid-session.
   Options: (a) accept the flip; (b) when `kjMode='auto'` resolves to
   `'speed-dial'`, latch and never go back to `'fab'` until the consumer
   re-mounts; (c) require an explicit `kjMode`. Recommendation: ship (a) and
   document; revisit if AAA review flags it.

2. **Hover-to-open on touch devices.** `(pointer: coarse)` in JS via
   `matchMedia` is reliable on modern browsers. We must verify it stays
   reactive across desktop ↔ touch hot-swap (e.g. Surface, iPad keyboard
   detach). Plan: store the hover-enabled state in a signal that re-evaluates
   on `'change'` events from the media query.

3. **Trigger click in FAB mode vs. speed-dial mode with a `(click)` listener.**
   In speed-dial mode, the trigger's primary job is to toggle. If the
   consumer also binds `(click)` (e.g. analytics), we must preserve it.
   Decision: directive listens in capture phase to toggle; the consumer's
   bubble-phase listener still fires unless the action is suppressed by
   `kjDisabled`. Mirrors `KjButton`.

4. **Scrim / mask responsibility.** PrimeNG's `mask` input renders a global
   backdrop that traps clicks. Kouji core does not render DOM, so the wrapper
   must render the mask. The core directive should expose `expanded` via the
   public-readable signal on the context (already proposed) so the wrapper can
   conditionally render the scrim. Outstanding: should the directive offer a
   `kjMaskEnabled` input that is just a passthrough flag, or should the
   wrapper take the input and never tell the core? Recommendation: passthrough
   on the wrapper component, no input on the core directive.

5. **Submenus inside actions.** PrimeNG technically supports them via
   `MenuItem.items`. We treat this as a non-goal for v1 — speed-dial
   submenus are a UX smell (cramped + double overlay). Consumers needing this
   should use Dropdown Menu instead. Document as deliberately unsupported.

6. **Live announcements for mode changes / new actions.** If `kjMode` flips, or
   actions stream in while expanded, should we announce via `KjLiveRegion`?
   Defer to v1.1 pending a11y review; default is silent (parity with `KjMenu`).

7. **Shared "popup trigger" abstraction.** Speed Dial, Dropdown Menu, Context
   Menu, Combobox, Tooltip, and Popover all wire some subset of
   `aria-haspopup` / `aria-expanded` / `aria-controls`. We deliberately do
   **not** introduce a `KjPopupTrigger` primitive in this directive — the
   abstraction needs at least two consumers in main before being lifted, and
   Dropdown Menu will be the second. Track in
   [`actions/dropdown-menu.md`](./dropdown-menu.md).

8. **Capture-phase click suppression duplication.** `KjButton` and
   `KjSpeedDialAction` (and any future button-like directive) repeat the same
   `addEventListener('click', …, { capture: true })` block. We accept the
   duplication for v1 and revisit when a third instance lands.

9. **`mode='fab'` + projected `[kjSpeedDialAction]`s.** A consumer who pins
   `kjMode='fab'` while still projecting actions will get actions in the DOM
   but no menu semantics. Decision: in `'fab'` mode, the content directive
   short-circuits to `hidden` and warns once via `console.warn` in dev mode.
