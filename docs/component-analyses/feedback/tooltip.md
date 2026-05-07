# Tooltip

> **Roadmap:** Feedback — *core directive family*. A small, non-interactive,
> read-only floating label that describes its trigger element. Shows on
> hover/focus, persists while the pointer is on either trigger or label, and
> is dismissible with Escape.
> **Builds on:** [`KjAriaDescribedBy`](../../../packages/core/src/a11y/aria-describedby.ts) (trigger ↔ tooltip wiring), [`KjOverlayService`](../../../packages/core/src/primitives/overlay/overlay.ts) (portal mount), [`KjVisuallyHidden`](../../../packages/core/src/a11y/visually-hidden.ts) (touch-fallback inline-help mode), the project's no-CDK / no-floating-ui constraint from [`rules/stack.md`](../../../rules/stack.md).
> **Cross-refs:** [Popover](./popover.md) — the **interactive** sibling (different role, different focus model). [Dropdown Menu](../actions/dropdown-menu.md) and [Confirm Popup](../actions/confirm-popup.md) — share the anchored-positioning concern. [Button](../actions/button.md) — the canonical trigger element.

There is already a working but partial implementation in
[`packages/core/src/tooltip/tooltip.ts`](../../../packages/core/src/tooltip/tooltip.ts).
This analysis treats the existing code as a v0 sketch and specifies the v1
shape the family should converge on. The v0 sketch already gets several
things right (auto-id, hover-on-content cancels hide, `role="tooltip"`,
Escape, `aria-describedby` on the trigger). It is missing: WCAG 1.4.13
*persistent-until-dismissed* contract for keyboard users, hover-on-tooltip
delay coordination across grouped tooltips, collision-aware positioning,
the simple `[kjTooltip]="text"` shorthand, the touch story, and proper
portal mounting (it currently renders inline next to the trigger and so
inherits parent clipping / `overflow:hidden` / `transform` containers).

---

## 1. Source comparison

### PrimeNG — `pTooltip` directive

PrimeNG's tooltip (<https://primeng.org/tooltip>) is **directive-only**:
the tooltip element is rendered imperatively at runtime, never declared in
the consumer's template. The trigger element opts in via `pTooltip="…"`.

Public surface (PrimeNG 17/18, abridged):

| Input                  | Notes                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pTooltip`             | `string \| TemplateRef`. The label content. Templates are rendered inside the auto-mounted tooltip element.  |
| `tooltipPosition`      | `'top' \| 'bottom' \| 'left' \| 'right'`. Default `'right'`.                                                  |
| `positionStyle`        | `string`. CSS positioning style override.                                                                     |
| `tooltipStyleClass`    | `string`. Custom class on the tooltip element.                                                                |
| `tooltipDisabled`      | `boolean`. Suppress display.                                                                                  |
| `tooltipEvent`         | `'hover' \| 'focus' \| 'both'`. Default `'hover'`. (Note: `'hover'` alone breaks WCAG 2.1.1 keyboard.)        |
| `appendTo`             | `'body' \| HTMLElement \| string`. Default `'body'`. Always escapes clipping containers.                      |
| `showDelay`            | `number`. Default `0`.                                                                                        |
| `hideDelay`            | `number`. Default `0`.                                                                                        |
| `life`                 | `number`. Auto-hide after N ms. (Anti-pattern under WCAG 1.4.13 *persistent*.)                                |
| `escape`               | `boolean`. Whether to escape HTML in the label. Default `true`.                                               |
| `showOnDisabled`       | `boolean`. Force tooltip on `disabled` triggers (which don't fire `mouseenter` natively). Default `false`.    |
| `autoHide`             | `boolean`. Hide when the cursor leaves the trigger even if it's now over the tooltip. Default `true` — **fails WCAG 1.4.13 *hoverable***. |
| `hideOnEscape`         | `boolean`. Default `true`.                                                                                    |
| `fitContent`           | `boolean`. Default `true`.                                                                                    |

Behaviour worth lifting:

- **Single-attribute shorthand.** `pTooltip="Save the file"` is the 80% case.
  No template wiring required.
- **Auto-mount to `body`.** Escapes clipping/transform containers, which is
  the right default for floating UI and what the existing kouji v0 misses.
- **Position flips on collision.** PrimeNG tries the requested side first,
  then flips on viewport collision.
- **Hide-on-disabled-trigger workaround.** `showOnDisabled` wraps disabled
  buttons in a transparent `<span>` so hover events fire. Useful pattern; we
  document it but solve it differently (see Open Questions).

Critique:

- `tooltipEvent: 'hover'` (default) is a WCAG 2.1.1 *Keyboard* violation by
  default. Should be `'both'`.
- `autoHide: true` (default) means moving the mouse onto the tooltip dismisses
  it — fails WCAG 1.4.13 *hoverable* (content must remain visible while
  pointer is on either trigger *or* tooltip). PrimeNG offers `autoHide=false`
  as an opt-in fix, but the wrong thing is the default.
- `life` (auto-hide timer) directly contradicts WCAG 1.4.13 *persistent*:
  content must stay until dismissed by the user, focus moves, or the content
  itself is no longer relevant. A timer doesn't qualify.
- HTML rendering via `escape=false` is a footgun (XSS surface) for what is
  meant to be a plain-text affordance.
- No support for rich content via projection — the only content path is
  `string` or a `TemplateRef`, both rendered in PrimeNG's own DOM.

### Angular Material — `MatTooltip`

Material's tooltip
(<https://material.angular.dev/components/tooltip/overview>) is also
directive-only and is the closest WCAG-correct reference among the three.

Public surface:

| Input                            | Notes                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `matTooltip`                     | `string`. Label content. Plain text only.                                                                            |
| `matTooltipPosition`             | `'left' \| 'right' \| 'above' \| 'below' \| 'before' \| 'after'`. Default `'below'`.                                  |
| `matTooltipPositionAtOrigin`     | `boolean`. Position at the pointer instead of the element box.                                                        |
| `matTooltipDisabled`             | `boolean`.                                                                                                            |
| `matTooltipShowDelay`            | `number`. Default from `MAT_TOOLTIP_DEFAULT_OPTIONS` (typical `0`).                                                   |
| `matTooltipHideDelay`            | `number`. Default from `MAT_TOOLTIP_DEFAULT_OPTIONS` (typical `0`).                                                   |
| `matTooltipTouchGestures`        | `'auto' \| 'on' \| 'off'`. Default `'auto'`. Long-press shows on touch.                                               |
| `matTooltipClass`                | `string \| string[]`. Custom class on the tooltip pane.                                                               |

Imperative API: `tooltip.show()`, `tooltip.hide(delay?)`, `tooltip.toggle()`.

Behaviour worth lifting:

- **Plain text only.** Conscious AAA stance: tooltips *should not* contain
  interactive content per WAI-ARIA APG. Material refuses to render
  `TemplateRef` here. We adopt the same default and gate rich-content into
  the composed shape.
- **Touch via long-press.** `matTooltipTouchGestures` exposes long-press as
  the touch entry point — Material's own touch-tooltips dismiss on touch
  end, which is acceptable (the WCAG hover requirements don't apply to
  touch-only inputs since 1.4.13 is scoped to *hover*).
- **CDK overlay positioning.** Material uses CDK overlay's
  `FlexibleConnectedPositionStrategy` with fallback positions. `kouji is
  no-CDK` (see [`rules/stack.md`](../../../rules/stack.md)) — we reimplement
  the connected-positioning math.
- **`MAT_TOOLTIP_DEFAULT_OPTIONS` token.** Centralised defaults for
  show/hide delay, position, touch gesture. We mirror this via a
  `KJ_TOOLTIP_DEFAULTS` token.
- **Hover-on-tooltip is honoured.** Moving the cursor onto the tooltip
  element keeps it open (passes WCAG 1.4.13 *hoverable*).

Critique:

- Default delays of `0` make tooltips noisy on dense UIs (every hover fires
  an instant tooltip). The WCAG-recommended muscle-memory wait is around
  500–700 ms. We default higher.
- `matTooltipPositionAtOrigin` is a clever pointer-anchored mode but is
  rarely the right call — pointer-anchored tooltips wander as the user
  moves the cursor. We expose it, default off.
- Tooltip is exposed as a single directive with imperative `show()`/`hide()`
  but **not** a content-projection composition shape. There's no way to put
  an icon next to the text without going to a custom Material overlay.

### shadcn/ui — `Tooltip` (Radix `Tooltip` primitive)

shadcn's tooltip (<https://ui.shadcn.com/docs/components/tooltip>) is a
re-skin of Radix UI's `Tooltip`. Radix follows the WAI-ARIA APG closely and
its *compound-component* shape is the template for kouji's rich-content
case:

```tsx
<TooltipProvider delayDuration={700} skipDelayDuration={300}>
  <Tooltip>
    <TooltipTrigger asChild><button>Save</button></TooltipTrigger>
    <TooltipContent side="top" align="center">
      <p>Save the document</p>
      <TooltipArrow />
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

Surface worth lifting:

- **`Provider` for group hover coordination.** `TooltipProvider`'s
  `delayDuration` (open delay, default 700) and `skipDelayDuration` (window
  during which moving from one tooltip's trigger to another opens the
  next one with **no** open-delay — default 300) is exactly the AAA
  ergonomic for toolbars / icon groups. We mirror with a
  `[kjTooltipGroup]` directive (or service-provided context).
- **Trigger / Content / Arrow split.** Distinct compounds for distinct
  semantic concerns. `TooltipArrow` is a pure visual flourish but Radix
  computes its position relative to the trigger, which we'll match.
- **`asChild` indirection.** Radix's `<TooltipTrigger asChild>` forwards
  trigger props onto the consumer's button. Angular doesn't need this —
  attribute directives compose naturally onto `<button>`.
- **Floating UI for positioning.** Radix uses `floating-ui` for
  flip/shift/collision. `kouji is no-floating-ui`
  (see [`rules/stack.md`](../../../rules/stack.md)) — we use CSS Anchor
  Positioning where supported and fall back to manual `getBoundingClientRect()`
  math via `KjOverlayService`.
- **`open` / `defaultOpen` / `onOpenChange`.** Controlled and uncontrolled
  modes. We expose only the controlled mode (`kjOpen` model) and let
  consumers write `[(kjOpen)]` for two-way; "uncontrolled" is just "don't
  bind it" in Angular.
- **No interactive content.** Radix enforces — at the type level — that
  `TooltipContent` is plain text or non-interactive nodes. If you need
  buttons or links, you use `Popover` (Radix's interactive sibling). We
  inherit that boundary, with the same component split.

Critique:

- Provider-only group coordination forces every Radix consumer to wrap
  their app in a `TooltipProvider` even for one-off tooltips. Default
  values without an explicit provider exist, but the API teaches
  "always wrap". We default the group context to a global root so the
  shorthand `[kjTooltip]="text"` works without ceremony.
- React-only (Radix). Behaviour transfers; code does not.

### Cross-library summary

|                                 | PrimeNG `pTooltip`          | Material `MatTooltip`       | Radix `Tooltip`              | kouji direction                                           |
| ------------------------------- | --------------------------- | --------------------------- | ---------------------------- | --------------------------------------------------------- |
| Shorthand `[x]="text"`          | yes                         | yes                         | no (compound only)           | **yes** — `[kjTooltip]="text"` shorthand                  |
| Compound (rich content)         | template ref only           | no                          | yes — `Trigger`/`Content`    | **yes** — `[kjTooltipTrigger]` + `[kjTooltipContent]`     |
| Positioning                     | manual + auto-flip          | CDK overlay                 | floating-ui                  | **CSS Anchor Positioning + manual fallback** (no-CDK, no-floating-ui) |
| Portal / append-to-body         | yes (default)               | yes (CDK)                   | yes                          | **yes** — via `KjOverlayService.createFromTemplate`       |
| Open trigger                    | hover (default) / focus / both | hover + focus           | hover + focus                | **hover + focus** (mandatory; no hover-only mode)         |
| Touch                           | long-press                  | long-press (`auto`)         | unsupported (recommends inline help) | **long-press, dismissable on tap-elsewhere; opt-out**         |
| Open delay                      | `showDelay=0`               | from defaults options       | `delayDuration=700`          | **700 ms default** (Radix value; AAA-friendly)            |
| Close delay                     | `hideDelay=0`               | from defaults options       | implicit ~300 ms grace       | **300 ms default**                                        |
| Group "skip-delay" coordination | no                          | no                          | `skipDelayDuration=300`      | **yes** — `[kjTooltipGroup]` + global default scope        |
| WCAG 1.4.13 *hoverable*         | broken by default (`autoHide=true`) | satisfied            | satisfied                    | **satisfied** (mandatory, not configurable off)            |
| WCAG 1.4.13 *persistent*        | broken (`life` auto-timer)  | satisfied                   | satisfied                    | **satisfied** — no auto-timer                             |
| WCAG 1.4.13 *dismissible* (Esc) | yes                         | yes                         | yes                          | **yes** (mandatory)                                        |
| Role / wiring                   | `role="tooltip"` + trigger `aria-describedby` | same | same | **same**                                                  |
| Rich content boundary           | string or TemplateRef       | string only                 | enforced no-interactive      | **enforced no-interactive** (point at `KjPopover`)        |
| Auto-hide timer                 | yes (anti-pattern)          | no                          | no                           | **no** (anti-pattern under 1.4.13)                        |

---

## 2. Decision — does it need a core directive?

**Yes — it needs a core directive *family*.** This is exactly the kind of
component the brief calls out as "easy to get wrong" — five WCAG 1.4.13
behaviours converge here (dismissible, hoverable, persistent, plus 2.1.1
keyboard and 4.1.2 name/role/value), the positioning math is non-trivial,
and the group-hover coordination is shared state. Putting that in the
wrapper would force every consumer (and every theme) to re-implement it.

The family is small and split by use-case shape:

| Directive                 | Selector                  | Role                                                                                                                |
| ------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `KjTooltip`               | `[kjTooltip]`             | **Shorthand-only.** Single-attribute form. `[kjTooltip]="'Save the file'"` accepts a string and renders the tooltip via `KjOverlayService` automatically. Wires the trigger ARIA, owns the timers, satisfies WCAG 1.4.13. The 80% case. |
| `KjTooltipTrigger`        | `[kjTooltipTrigger]`      | Compound trigger directive. Pairs with a sibling `[kjTooltipContent]` referenced via template ref. Used when consumers want to project rich (non-interactive) content. Owns the same a11y and timer machinery as `KjTooltip` — they share an internal `KjTooltipController`. |
| `KjTooltipContent`        | `[kjTooltipContent]`      | The floating element (compound shape only). `role="tooltip"`, auto-id, mouse enter/leave for hover-on-tooltip grace. Hosted in a portal via `KjOverlayService`, **not** as a sibling of the trigger in the consumer's DOM. |
| `KjTooltipArrow`          | `[kjTooltipArrow]`        | Optional non-focusable visual flourish projected inside `[kjTooltipContent]`. Pure styling hook (`data-side` reflected for CSS). No a11y exposure (`aria-hidden="true"`). |
| `KjTooltipGroup`          | `[kjTooltipGroup]`        | Provides a `KJ_TOOLTIP_GROUP` context that coordinates "skip delay" between sibling tooltips. Optional; a global fallback group is provided in `providedIn: 'root'` so consumers don't need to wrap toolbars. |

Why this split:

- **Two API shapes have different ceremony budgets.** A label on an icon
  button is a one-line affair (`<button kjButton [kjTooltip]="'Save'">…`).
  A tooltip with an icon and a small bullet list is a six-line compound
  (`[kjTooltipTrigger]` + `<ng-template>` with `[kjTooltipContent]` and
  projected children). Forcing the simple case into the compound shape
  would push consumers to reach for `title=""` (which fails 1.4.13 on
  multiple counts) — we accept the duplication to keep the simple case a
  single attribute.
- **`KjTooltip` is *not* a wrapper around `KjTooltipTrigger` + a default
  `KjTooltipContent`.** It is a standalone directive that internally
  templates a default content shape. The compound directives are not used
  internally — they exist in their own right. The shared logic
  (positioning, timers, group coordination, ARIA wiring) lives in a private
  `KjTooltipController` injectable that both shapes call. This keeps the
  shorthand small and avoids weird "what if I put both directives on the
  same element" situations.
- **No core component (no `kj-tooltip`)** in `@kouji-ui/core` — the package
  is directives-only by policy ([`rules/architecture.md`](../../../rules/architecture.md)).
  The styled wrapper in `@kouji-ui/components` provides a `<kj-tooltip>`
  Angular component for ergonomics, but it composes the same directives.

### Tooltip vs. Popover boundary

This is a load-bearing decision worth calling out in **both** files
(`tooltip.md` and `popover.md`):

| Aspect                | `KjTooltip`                          | `KjPopover`                              |
| --------------------- | ------------------------------------ | ---------------------------------------- |
| ARIA role             | `tooltip`                            | `dialog` (or none, for floating UI)     |
| Triggered by          | hover **and** focus                  | click / Enter / Space                    |
| Interactive content   | **forbidden**                        | allowed (buttons, links, inputs)         |
| Focus management      | focus stays on trigger               | focus moves into the panel              |
| Close on outside-click | n/a (mouseleave handles it)         | yes                                      |
| Persistent            | until dismissed / focus moves / no longer relevant | until explicit close          |
| `aria-describedby`    | trigger gets it (pointing at tooltip)| optional                                 |
| Long-press on touch   | yes                                  | no — tap to open                         |
| Examples              | label on an icon button, format hint on a `<input>`, abbreviation expansion on `<abbr>` | options menu, share dialog, profile card |

The discriminating question for consumers: *"Does the floating content
contain anything the user can click, focus, type into, or otherwise
interact with?"* If yes, it's a popover, not a tooltip. The tooltip
directive does **not** prevent interactive children at runtime — that's a
consumer-discipline issue documented in TSDoc — but the family does not
ship a tooltip-with-buttons example or a focus-trap mode. (Anyone
attempting interactive tooltips will hit the wall when they realise focus
never enters the panel.)

---

## 3. Base features

### Trigger contract

- **Open events:** `mouseenter` on the trigger; `focus` on the trigger
  (keyboard focus only, not click-focus — see Open Questions on
  `:focus-visible`).
- **Close events:** `mouseleave` from *both* trigger and content (with the
  hover grace period in between satisfying WCAG 1.4.13 *hoverable*); `blur`
  from the trigger; `Escape` keypress while the tooltip is open (WCAG 1.4.13
  *dismissible*); the trigger element being detached from the DOM
  (`MutationObserver` on the parent — same pattern as Confirm Popup).
- **No auto-hide timer.** No `life` input. WCAG 1.4.13 *persistent*: tooltips
  remain visible until the user dismisses, focus moves elsewhere, or the
  hover/focus state ends. Anyone asking for "hide after 3 seconds" is asking
  for a toast — point them at [Toast](./toast.md).
- **Disabled triggers:** `<button disabled>` does not fire `mouseenter` /
  `focus`. We document the Material/PrimeNG workaround (wrap in a
  `<span>` carrying the trigger directive instead) in TSDoc. We do **not**
  ship a `kjShowOnDisabled` mode that synthesises events on a transparent
  wrapper — too much footgun for a marginal use case.
- **Touch:** long-press (`pointerdown` held for `kjTouchHoldMs`, default
  `500` ms) shows the tooltip on touch devices; tapping anywhere else
  dismisses it. Detected via `(pointer: coarse)` media query. On touch,
  the open/close delays do not apply (long-press already supplies its
  own delay). Opt-out per-instance with `kjTouchGestures: 'off'`. Opt to
  always show with `'on'`. Default `'auto'`. **Position:** the tooltip
  notes its discoverability is poor on touch — TSDoc encourages inline
  help labels for any non-decorative content, with `KjVisuallyHidden` for
  purely-screen-reader text on icon-only buttons.

### Positioning

We solve this without `floating-ui` and without `@angular/cdk/overlay`
(both are explicitly forbidden by [`rules/stack.md`](../../../rules/stack.md)).
Two layers:

1. **Preferred:** native [CSS Anchor Positioning](https://developer.mozilla.org/docs/Web/CSS/CSS_anchor_positioning).
   The trigger gets a generated `anchor-name` (an internal
   `--kj-tooltip-anchor-{id}`); the tooltip element binds
   `position-anchor: --kj-tooltip-anchor-{id}` and `position-area`
   reflecting `kjTooltipSide`. The browser handles flipping on collision via
   `position-try-fallbacks` declared in the wrapper CSS. We feature-detect
   `CSS.supports('anchor-name', '--x')` at module load.
2. **Fallback:** manual positioning via `getBoundingClientRect()` + a
   resize/scroll listener, computed in `afterNextRender()` and recomputed on
   open. Logic lives in a shared **`KjAnchor` primitive** at
   `packages/core/src/primitives/overlay/anchor.ts` (see Open Questions —
   this primitive does not yet exist; it is to be carved out as part of the
   tooltip work and reused by Popover, Dropdown Menu, Confirm Popup, Speed
   Dial, Combobox). The primitive accepts an anchor element + a panel
   element + side/align/offset and writes `transform`/`top`/`left` on each
   open and on resize/scroll. Collision avoidance follows the standard
   "main-axis flip then cross-axis shift" algorithm — same shape as
   floating-ui's `flip` + `shift` middlewares but reimplemented in ~200
   lines.

The core directive does **no positioning work itself.** It reflects
`kjTooltipSide` and `kjTooltipAlign` as `data-side` / `data-align` on the
content element and delegates everything else to the `KjAnchor` primitive
or the CSS anchor-positioning fallback. This keeps the directive headless
and lets the wrapper / consumer override positioning entirely if they want
to.

| Input                | Type                                        | Default     | Notes                                                       |
| -------------------- | ------------------------------------------- | ----------- | ----------------------------------------------------------- |
| `kjTooltipSide`      | `'top' \| 'right' \| 'bottom' \| 'left'`    | `'top'`     | Reflected as `data-side`.                                    |
| `kjTooltipAlign`     | `'start' \| 'center' \| 'end'`              | `'center'`  | Reflected as `data-align`.                                   |
| `kjTooltipOffset`    | `number`                                    | `8`         | Pixel gap. Reflected as `--kj-tooltip-offset` CSS var.       |
| `kjAvoidCollisions`  | `boolean`                                   | `true`      | Forwarded to `KjAnchor` primitive.                           |

### Delays

Default values mirror Radix (the AAA-quality reference) and are exposed via
a `KJ_TOOLTIP_DEFAULTS` token for app-wide override:

| Input               | Type     | Default | Notes                                                                                  |
| ------------------- | -------- | ------- | -------------------------------------------------------------------------------------- |
| `kjOpenDelayMs`     | `number` | `700`   | Time the trigger must be hovered or focused before the tooltip opens.                  |
| `kjCloseDelayMs`    | `number` | `300`   | Grace period after `mouseleave` from both trigger and tooltip before hiding. The same delay applies for moving cursor between trigger and tooltip — implements WCAG 1.4.13 *hoverable*. |
| `kjSkipDelayMs`     | `number` | `300`   | When a tooltip in the same `[kjTooltipGroup]` was visible within this window, the next tooltip in the group opens with **no** open delay. Implements Radix's `skipDelayDuration`. |

`KJ_TOOLTIP_DEFAULTS` shape:

```ts
export interface KjTooltipDefaults {
  openDelayMs?: number;
  closeDelayMs?: number;
  skipDelayMs?: number;
  side?: KjTooltipSide;
  align?: KjTooltipAlign;
  offset?: number;
  touchGestures?: 'auto' | 'on' | 'off';
  touchHoldMs?: number;
}
export const KJ_TOOLTIP_DEFAULTS = new InjectionToken<KjTooltipDefaults>('KjTooltipDefaults');
```

### Group coordination

`[kjTooltipGroup]` is a directive that provides `KJ_TOOLTIP_GROUP`. A
fallback "global root group" is also provided in `providedIn: 'root'` so
the shorthand `[kjTooltip]="text"` works without an explicit group wrapper
— the global group has its own skip-delay timer keyed on
`document.activeElement` transitions.

Group context shape:

```ts
export interface KjTooltipGroupContext {
  readonly lastVisibleAt: Signal<number>;
  notifyOpened(): void;
  notifyClosed(): void;
}
export const KJ_TOOLTIP_GROUP = new InjectionToken<KjTooltipGroupContext>('KjTooltipGroup');
```

When opening, a tooltip checks `Date.now() - group.lastVisibleAt() < skipDelay`.
If so, it bypasses `kjOpenDelayMs`. When closing, it stamps
`lastVisibleAt`. Implementation is ~30 lines.

### Variants / Sizes

Tooltip is variant-neutral and size-neutral in core (the directive owns
neither `KjVariant` nor `KjSize` host directives). The styled wrapper in
`@kouji-ui/components` may apply default surface tokens, but we explicitly
do not expose `kjVariant: 'default' | 'success' | 'warning' | 'danger'`
because:

- A coloured tooltip implies an alert. Alerts belong in `KjAlert` /
  `KjToast`, not in a hover-revealed label that AT only sees on `:hover` /
  `:focus`. Coloured tooltips routinely fail because the content is the
  *only* indication of severity (WCAG 1.4.1 *Use of Color*).
- Wrappers can still expose `panelClass` to bolt on custom styling per
  call site if desperate.

### Disabled state

`kjTooltipDisabled: input<boolean>(false)` suppresses opening entirely.
Useful for conditional hints (e.g. "show this tooltip only when the value
is invalid"). Disabled tooltips do not wire `aria-describedby` either —
they're truly inert. Reflects to `data-disabled` for any wrapper styling.

### Content rules

- **`KjTooltip` (shorthand):** value is `string`. We deliberately reject
  `TemplateRef` here — anyone who wants templates can use the compound
  shape. This keeps the simple API simple. Plain text is HTML-escaped (we
  do not ship the PrimeNG-style `escape: false` opt-out — XSS surface
  isn't worth it for this affordance).
- **`KjTooltipContent` (compound):** projects arbitrary content. The
  directive does **not** assert "no interactive children" at runtime; it
  documents the rule in TSDoc and the ARIA `role="tooltip"` makes
  interactive children unreachable to AT anyway. If a consumer needs
  interactive content, point them at [Popover](./popover.md).

### Multi-line / long content

Long tooltip text is a smell. Tooltips should be concise (one line, no
more than ~80 characters of plain text). The directive does not enforce a
length cap — that leaks into i18n problems — but the docs explicitly
say "tooltips longer than two lines belong in a popover or inline help".
The styled wrapper caps `max-width` at `min(20rem, calc(100vw - 1rem))`
to enforce reflow under WCAG 1.4.10.

### State model

A single `kjOpen: model<boolean>(false)` two-way bindable on both
`KjTooltip` and `KjTooltipTrigger`. Setting `kjOpen` to `true` opens
imperatively (skipping the open delay); setting to `false` closes
immediately. The model fires `kjOpenChange` so consumers can react.
Useful for spec tests, programmatic onboarding, and Storybook/Playwright
scenarios — but **not** the recommended consumer interaction path for
real tooltips (those should be hover/focus-driven so AAA contracts hold).

---

## 4. Accessibility (WCAG 2.1 AAA)

WAI-ARIA APG references:

- [Tooltip Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) —
  the canonical tooltip wiring.
- [WCAG SC 1.4.13 *Content on Hover or Focus*](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html) —
  the three-part contract (dismissible / hoverable / persistent) that
  drives most of the design.

### Roles

| Element                       | Role / value                                        |
| ----------------------------- | --------------------------------------------------- |
| `[kjTooltip]` host (trigger)  | implicit (whatever the consumer's element is — typically `button`). The directive does **not** override `role`. |
| `[kjTooltipTrigger]` host     | same — directive does not assert a role.            |
| `[kjTooltipContent]` host     | `role="tooltip"`. Hard-coded; not configurable. (The existing v0 sketch makes this a `kjTooltipRole` input — we **remove** that input in v1; `tooltip` is the only correct value here.) |
| `[kjTooltipArrow]` host       | none (decorative). `aria-hidden="true"`.            |
| `[kjTooltipGroup]` host       | none (state container).                              |

### ARIA wiring

- **Trigger ↔ tooltip:** the trigger gets
  `aria-describedby="<tooltip-id>"`. We **always** set this on first
  render — *before* the tooltip is visible — per the WAI-ARIA spec
  (otherwise AT users won't get the description announced when the
  trigger is focused for the first time, since AT scans `aria-describedby`
  on focus, not on visibility change). The `aria-describedby` is composed
  via `KjAriaDescribedBy` so consumer-supplied `aria-describedby` values
  (e.g. error messages, format hints) are merged, not overwritten.
- **Tooltip element:** `role="tooltip"`, `id="kj-tooltip-{n}"` (auto-id);
  `data-state="open|closed"` reflected; `data-side` / `data-align`
  reflected for the wrapper's positioning CSS.
- **`aria-label` / `aria-labelledby` on the tooltip:** **not used.**
  WAI-ARIA prohibits `aria-label`/`aria-labelledby` on `role="tooltip"`
  (the tooltip itself is the description; labelling it would be circular).
  The existing v0 TSDoc already calls this out. We keep the rule.
- **Disabled tooltip:** when `kjTooltipDisabled=true`, `aria-describedby`
  is not wired and the tooltip element is not mounted. Reflected as
  `data-disabled` on the trigger.
- **Touch-mode tooltip:** identical ARIA wiring; the only difference is
  the open trigger (long-press instead of hover). AT users on touch
  receive the description via `aria-describedby` when their virtual
  cursor lands on the trigger — same as desktop.

### Keyboard contract

| Key                 | When focus is on…       | Behaviour                                                               |
| ------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | Trigger                 | Focuses the trigger — opens the tooltip after `kjOpenDelayMs` (or instantly under skip-delay). Tab moving away from the trigger closes the tooltip. The trigger's natural Tab order is preserved. |
| `Escape`            | Trigger (tooltip open)  | Closes the tooltip, leaves focus on the trigger. WCAG 1.4.13 *dismissible*. **Does not stop propagation** — Escape may also be handled by an ancestor (e.g. closing a dialog) at the consumer's discretion. (Open Questions §5.) |
| any other key       | Trigger                 | No-op on the tooltip (delegated to consumer's own keybindings).         |

The tooltip element itself is **not focusable** (no `tabindex`). Users
cannot move focus into the tooltip; if they could, that would imply
interactive content, which is a popover. Hover-on-tooltip via mouse is
the only way to "stay in" the tooltip.

### Focus management

- **Opening on focus** does not move focus — the tooltip displays *next
  to* the focused trigger; focus stays on the trigger.
- **Closing on blur** does not move focus — focus has already moved (that
  blur was the cause).
- **Focus trap:** none. Tooltip content is non-interactive.
- **Focus restoration:** none needed (focus never moved).

### Hoverable (WCAG 1.4.13)

The tooltip content element listens for `mouseenter` (cancelling any
pending hide timer) and `mouseleave` (starting the close-delay timer).
Combined with the trigger's own `mouseenter`/`mouseleave`, this gives
the standard "the tooltip stays open as long as the cursor is on either
the trigger or the tooltip, plus a grace period" contract. The grace
period (`kjCloseDelayMs`, default `300`) covers the geometry of the
cursor traversing the gap between trigger and tooltip — it must be at
least the time required to traverse `kjTooltipOffset` pixels at typical
mouse speed.

### Persistent (WCAG 1.4.13)

The directive does not auto-hide. The tooltip stays visible until:

- The pointer leaves both trigger and content for longer than
  `kjCloseDelayMs`.
- Focus moves off the trigger.
- `Escape` is pressed (with the tooltip open).
- `kjOpen` is set to `false` programmatically.
- The trigger is disconnected from the DOM (cleanup; emits a final
  `kjOpenChange` of `false`).

There is intentionally no "hide after N ms" input. If a wrapper or
consumer adds one, that wrapper is non-AAA-compliant; the core remains
correct.

### Touch (1.4.13 scoping)

WCAG 1.4.13 applies to "additional content that becomes visible … via
hover or focus". Long-press is *neither* hover nor focus, so a touch-fired
tooltip is technically out of scope for 1.4.13. We still apply the
*dismissible* and *persistent* parts of the contract on touch (tap-elsewhere
dismisses, no auto-timer) for consistency. *Hoverable* doesn't apply
(no hover on touch). On touch, the open-delay is replaced by the
long-press hold time (`kjTouchHoldMs`, default `500`).

### Screen reader behaviour

- AT announces the tooltip via the trigger's `aria-describedby` on focus
  — independent of whether the tooltip is visually displayed. This means
  AT users hear the description *immediately* on focusing the trigger,
  not after the open-delay; the open-delay is a *visual* affordance only.
- The tooltip element's visibility is toggled via the `hidden` attribute
  (existing v0 already does this), not via `display: none` on a
  consumer-supplied class. AT respects `hidden`.
- Reduced motion: the wrapper's open/close transition guards on
  `@media (prefers-reduced-motion: reduce)`. Core has no animation hooks
  beyond `data-state` reflection.

### Touch target (WCAG 2.5.5 AAA)

The tooltip element itself is non-interactive — no target requirement.
The trigger element's target is the consumer's responsibility (typically
`KjButton`'s 44×44 minimum applies).

### Colour & contrast (WCAG 1.4.6 AAA)

Headless core sets no colour. Styled wrapper must hit 7:1 contrast for
tooltip text against the panel surface. Forced-colours mode: ensure a
visible border survives Windows High Contrast (don't rely on background
fill alone).

### Accessibility Review (against rules/accessibility.md)

- `1.3.1 Info and Relationships` — `aria-describedby` programmatically
  ties trigger to tooltip; wiring is composed via `KjAriaDescribedBy` so
  consumer-supplied describedby values aren't clobbered.
- `1.4.1 Use of Color` — variant-neutral by design; no colour-only
  semantics.
- `1.4.6 Contrast (Enhanced)` — wrapper enforces 7:1; documented in
  styled-wrapper notes.
- `1.4.10 Reflow` — wrapper caps tooltip width; collision-avoidance shifts
  panel within viewport.
- `1.4.13 Content on Hover or Focus` — *dismissible* (Escape, blur,
  mouseleave both elements); *hoverable* (content has its own hover
  listeners feeding the same hide timer); *persistent* (no auto-hide).
- `2.1.1 Keyboard` — focus opens tooltip; no hover-only path is
  configurable. Escape dismisses.
- `2.4.3 Focus Order` — focus never moves into the tooltip; Tab order
  unaffected.
- `4.1.2 Name, Role, Value` — `role="tooltip"` hard-coded; trigger's
  `aria-describedby` always wired before first display.

---

## 5. Composition model

```
packages/core/src/tooltip/
  tooltip.ts                        // KjTooltip (shorthand, single-attribute form)
  tooltip-trigger.ts                // KjTooltipTrigger (compound)
  tooltip-content.ts                // KjTooltipContent (compound, role="tooltip", hover-on-tooltip)
  tooltip-arrow.ts                  // KjTooltipArrow (decorative)
  tooltip-group.ts                  // KjTooltipGroup (skip-delay coordination)
  tooltip.controller.ts             // KjTooltipController — private shared logic (timers, open/close, group notify)
  tooltip.context.ts                // KJ_TOOLTIP_GROUP, KjTooltipGroupContext, KJ_TOOLTIP_DEFAULTS, KjTooltipDefaults
  tooltip.example.ts                // (existing) basic shorthand
  tooltip.compound.example.ts       // (new) compound shape with arrow
  tooltip.group.example.ts          // (new) toolbar with shared skip-delay
  tooltip.placements.example.ts     // (existing) all four sides
  tooltip.touch.example.ts          // (new) long-press touch flow
  tooltip.retro.example.ts          // (existing)
  tooltip.finance.example.ts        // (existing)
  tooltip.spec.ts                   // (existing, expand)
  index.ts
```

The existing tooltip implementation
([`tooltip.ts`](../../../packages/core/src/tooltip/tooltip.ts)) is split
across these new files in the v1 refactor. The current `tooltipRegistry`
(a `WeakMap<Element, KjTooltipContent>`) is replaced by the
context-token + controller pattern that the rest of the codebase uses
(see [`rules/architecture.md`](../../../rules/architecture.md) §
*Signal-Context Pattern*).

### Shared-state mechanism

```ts
// tooltip.context.ts

export type KjTooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type KjTooltipAlign = 'start' | 'center' | 'end';
export type KjTooltipTouchGestures = 'auto' | 'on' | 'off';

export interface KjTooltipDefaults {
  openDelayMs?: number;    // default 700
  closeDelayMs?: number;   // default 300
  skipDelayMs?: number;    // default 300
  side?: KjTooltipSide;    // default 'top'
  align?: KjTooltipAlign;  // default 'center'
  offset?: number;         // default 8
  touchGestures?: KjTooltipTouchGestures; // default 'auto'
  touchHoldMs?: number;    // default 500
}
export const KJ_TOOLTIP_DEFAULTS = new InjectionToken<KjTooltipDefaults>('KjTooltipDefaults');

export interface KjTooltipGroupContext {
  /** Wall-clock ms timestamp of the most recent close in this group. */
  readonly lastVisibleAt: Signal<number>;
  notifyOpened(): void;
  notifyClosed(): void;
}
export const KJ_TOOLTIP_GROUP = new InjectionToken<KjTooltipGroupContext>('KjTooltipGroup', {
  // Global fallback group so the [kjTooltip]="text" shorthand works without an explicit wrapper
  providedIn: 'root',
  factory: () => createGlobalTooltipGroup(),
});
```

### `hostDirectives` composition

- `[kjTooltip]` (shorthand) composes:
  - `KjAriaDescribedBy` (input alias `kjAriaDescribedBy: kjDescribedBy`)
    — it forwards a merge-friendly `aria-describedby` so consumer-supplied
    describedby ids stack with the tooltip id. The directive *does* still
    own its own `[attr.aria-describedby]` host binding, but it merges the
    tooltip id into whatever `KjAriaDescribedBy` produces.
  - **Nothing else.** No `KjVariant`, no `KjSize`, no `KjFocusRing` (the
    consumer's button already has those).
- `[kjTooltipTrigger]` composes the same as `[kjTooltip]`.
- `[kjTooltipContent]` composes:
  - **Nothing.** Pure host attribute wiring (`role`, `id`, `hidden`,
    `data-state`, `data-side`, `data-align`) plus its own
    `mouseenter`/`mouseleave` listeners. The directive is mounted into a
    portal via `KjOverlayService` (see below), not via host directives on
    the consumer's DOM.
- `[kjTooltipArrow]` composes nothing. `aria-hidden="true"` host attr only.
- `[kjTooltipGroup]` composes nothing. Provides `KJ_TOOLTIP_GROUP`.

### Portal mounting

The current v0 sketch renders `[kjTooltipContent]` as a sibling of the
trigger in the consumer's DOM. This is wrong: any ancestor with
`overflow: hidden`, `transform: …`, `contain: paint`, or
`clip-path: …` will clip the tooltip. v1 mounts the tooltip via the
existing [`KjOverlayService`](../../../packages/core/src/primitives/overlay/overlay.ts)
to a `<div data-kj-overlay>` appended to `document.body`. This is the
same primitive Dialog and (eventually) Popover use.

Concretely:

- `KjTooltip` (shorthand): the directive owns a `<ng-template>` it stamps
  internally with a default content shape (a `<div kjTooltipContent>{{
  text }}</div>`). On open, it calls
  `KjOverlayService.createFromTemplate(tpl, vcr).open()`. The overlay ref
  is cached on the directive and disposed in `DestroyRef.onDestroy()`.
- `KjTooltipTrigger`: takes a `TemplateRef` via `[kjTooltipTriggerFor]`
  (or accepts a sibling `[kjTooltipContent]` reference for backwards
  compatibility with the v0 shape — see Open Questions §3). On open,
  same overlay machinery.

### Reuse of existing primitives

| Primitive            | Reused for                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `KjOverlayService`   | Portal mount of the tooltip element to `document.body`, escaping clipping containers.                    |
| `KjAriaDescribedBy`  | Trigger's `aria-describedby` composition (so consumer hint ids stack with the tooltip id).               |
| `KjAnchor` (new — to be carved out) | Connected positioning math (side/align/offset, flip, shift). See Open Questions §1.       |
| `KjVisuallyHidden`   | Touch fallback documentation only — recommended pattern for icon-only buttons whose label is the tooltip. |
| `KjFocusTrap`        | **Not used.** Tooltip is non-interactive and never receives focus.                                       |
| `KjLiveRegion`       | **Not used.** AT announces the tooltip via the trigger's `aria-describedby`.                             |
| `KjRovingTabindex`   | Not used.                                                                                                |
| `KjFocusRing`        | Not used (lives on the consumer's trigger button).                                                       |
| `KjVariant` / `KjSize`| Not used (variant-neutral by design — see Base features).                                              |
| `KjDisabled`         | Not used (`kjTooltipDisabled` is a local input that suppresses opening; doesn't need the form-control disabled propagation that `KjDisabled` provides). |

### Cross-component pointers

- **[Popover](./popover.md)** — the **interactive** sibling. Same anchor
  primitive (`KjAnchor`), same portal mount (`KjOverlayService`), but
  `role="dialog"`, click-to-open, focus moves into the panel. The
  Tooltip-vs-Popover boundary is documented in *both* files (see §2 above
  and the corresponding section in `popover.md`). The shared anchor
  primitive will be carved out as part of this work — see Open Questions §1.
- **[Dropdown Menu](../actions/dropdown-menu.md)** — also anchored via the
  `KjAnchor` primitive; uses `KjOverlayService` for portal mount. Tooltip's
  `KjTooltipGroup` skip-delay pattern doesn't transfer (menus don't
  group-coordinate); but the `data-side` / `data-align` reflection
  contract is identical.
- **[Confirm Popup](../actions/confirm-popup.md)** — built on `KjPopover`
  (anchored, non-modal). Shares the same anchor primitive and portal
  mount with Tooltip.
- **[Speed Dial](../actions/speed-dial.md)** — anchored FAB; same
  anchor primitive.
- **[Combobox](../data-input/combobox.md)** — anchored listbox; will
  reuse the same primitive once it lands.
- **[Button](../actions/button.md)** — the canonical trigger element. The
  tooltip directive does not compose `KjButton`; it sits *on top of*
  whatever the consumer used as their trigger. Icon-only buttons that
  rely on a tooltip for their accessible name should *also* set
  `aria-label` (or use `KjVisuallyHidden`) — `aria-describedby` to a
  tooltip is *description*, not *name*; an icon-only button with only
  `aria-describedby` has no accessible name (4.1.2 violation). Documented
  in the icon-button example.
- **[Toast](./toast.md)** — anyone asking for "auto-hide after N
  seconds" wants a toast. Tooltips are persistent under WCAG 1.4.13.
- **[Alert / Banner](./alert.md)** — anyone asking for a coloured
  tooltip with severity wants an alert.
- **`[abbr]` / inline help** — for content-by-context (definitions,
  abbreviations), an inline `<abbr title="…">` or a visually-rendered
  hint near the input is more accessible than a tooltip on touch
  devices. Document.

---

## 6. Inputs / Outputs / Models

All members `kj`-prefixed per [`rules/architecture.md`](../../../rules/architecture.md).

### `[kjTooltip]` (shorthand)

| Member                  | Kind   | Type                                              | Default                                | Notes                                                                                  |
| ----------------------- | ------ | ------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `kjTooltip`             | input  | `string`                                          | required                               | The tooltip's plain-text label. Empty string disables. HTML is escaped.                 |
| `kjTooltipDisabled`     | input  | `boolean`                                         | `false`                                | Suppresses opening. Reflects `data-disabled` on the trigger.                            |
| `kjTooltipSide`         | input  | `KjTooltipSide`                                   | `'top'`                                | Reflected as `data-side` on the tooltip element.                                        |
| `kjTooltipAlign`        | input  | `KjTooltipAlign`                                  | `'center'`                             | Reflected as `data-align`.                                                              |
| `kjTooltipOffset`       | input  | `number`                                          | `8`                                    | Px gap between trigger and tooltip.                                                      |
| `kjAvoidCollisions`     | input  | `boolean`                                         | `true`                                 | Forwarded to `KjAnchor`. When `false`, the side is honoured even if it overflows.       |
| `kjOpenDelayMs`         | input  | `number`                                          | from `KJ_TOOLTIP_DEFAULTS` or `700`    | Hover/focus open delay.                                                                  |
| `kjCloseDelayMs`        | input  | `number`                                          | from `KJ_TOOLTIP_DEFAULTS` or `300`    | mouseleave grace (covers WCAG 1.4.13 *hoverable*).                                       |
| `kjTouchGestures`       | input  | `KjTooltipTouchGestures`                          | `'auto'`                               | `'auto'` enables long-press on coarse pointers.                                           |
| `kjTouchHoldMs`         | input  | `number`                                          | `500`                                  | Long-press duration.                                                                      |
| `kjPanelClass`          | input  | `string \| string[]`                              | `''`                                   | Forwarded to the tooltip element. Wrapper styling hook.                                  |
| `kjOpen`                | model  | `boolean`                                         | `false`                                | Two-way bindable. Programmatic open/close. Skips delays.                                  |

| Output                  | Kind   | Payload                                           | Notes                                                                                  |
| ----------------------- | ------ | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `kjOpenChange`          | output | `boolean`                                         | Convenience event paired with the `kjOpen` model.                                       |

### `[kjTooltipTrigger]`

| Member                       | Kind   | Type                                              | Default                                | Notes                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| `kjTooltipTriggerFor`        | input  | `TemplateRef<unknown> \| HTMLElement`             | required                               | Either a `<ng-template>` containing a `[kjTooltipContent]`, or (legacy) the native element of a sibling `[kjTooltipContent]`. New code should pass a `TemplateRef`. |
| `kjTooltipDisabled`          | input  | `boolean`                                         | `false`                                |                                                                                       |
| `kjTooltipSide`              | input  | `KjTooltipSide`                                   | `'top'`                                |                                                                                       |
| `kjTooltipAlign`             | input  | `KjTooltipAlign`                                  | `'center'`                             |                                                                                       |
| `kjTooltipOffset`            | input  | `number`                                          | `8`                                    |                                                                                       |
| `kjAvoidCollisions`          | input  | `boolean`                                         | `true`                                 |                                                                                       |
| `kjOpenDelayMs`              | input  | `number`                                          | from defaults                          |                                                                                       |
| `kjCloseDelayMs`             | input  | `number`                                          | from defaults                          |                                                                                       |
| `kjTouchGestures`            | input  | `KjTooltipTouchGestures`                          | `'auto'`                               |                                                                                       |
| `kjTouchHoldMs`              | input  | `number`                                          | `500`                                  |                                                                                       |
| `kjOpen`                     | model  | `boolean`                                         | `false`                                |                                                                                       |

| Output                       | Kind   | Payload                                           | Notes                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `kjOpenChange`               | output | `boolean`                                         |                                                                                       |

### `[kjTooltipContent]`

No public inputs/outputs. Reads `KJ_TOOLTIP_GROUP` from injector and the
sibling controller via DI. Owns the `mouseenter`/`mouseleave` hover-on-
tooltip listeners and the `role="tooltip"` host attr. Emits no events.

(Note: the existing v0 directive holds `kjTooltipSide` /
`kjTooltipDelay` / `kjTooltipHideDelay` / `kjTooltipRole` inputs on the
*content* directive. v1 moves all behaviour-shaping inputs onto the
*trigger* directive — the content is a passive panel — and removes
`kjTooltipRole` entirely. This is a breaking change relative to v0 but the
v0 surface is not yet released and is therefore in scope for redesign.)

### `[kjTooltipArrow]`

No public inputs/outputs. Reflects `data-side` from the parent
`[kjTooltipContent]` for CSS positioning.

### `[kjTooltipGroup]`

No public inputs. Reads `KJ_TOOLTIP_DEFAULTS` for `skipDelayMs`. Provides
`KJ_TOOLTIP_GROUP`.

| Output                       | Kind   | Payload   | Notes                                                                                 |
| ---------------------------- | ------ | --------- | ------------------------------------------------------------------------------------- |
| `kjTooltipOpened`            | output | `void`    | Convenience analytics hook. Fires when any tooltip in the group opens.                |
| `kjTooltipClosed`            | output | `void`    | Convenience analytics hook.                                                           |

---

## 7. Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Shorthand on an icon button** (`tooltip.example.ts`, exists — keep
   updated): `<button kjButton aria-label="Save" [kjTooltip]="'Save document'">…`.
   Demonstrates the WCAG 4.1.2 pairing: `aria-label` for accessible *name*
   + `aria-describedby` (auto-wired) for accessible *description*.
2. **All four sides** (`tooltip.placements.example.ts`, exists): four
   buttons, one per side, with `kjTooltipSide` set. Resize the viewport to
   demonstrate flip-on-collision.
3. **Compound with arrow + icon** (`tooltip.compound.example.ts`, new):
   `[kjTooltipTrigger]` + `<ng-template>` containing
   `[kjTooltipContent]` with a non-interactive icon and label. Demonstrates
   the rich-content shape; arrow rendered via `[kjTooltipArrow]`.
4. **Toolbar with shared skip-delay** (`tooltip.group.example.ts`, new):
   five icon buttons inside a `[kjTooltipGroup]`. Hovering one waits the
   open delay; moving to siblings within the skip-delay window opens
   instantly. The hero example for the group context.
5. **Touch / long-press** (`tooltip.touch.example.ts`, new): same icon
   button as example 1, but documented with the touch flow. Includes a
   note pointing at `KjVisuallyHidden` for purely-screen-reader labels.
6. **Themed** (`tooltip.retro.example.ts`, `tooltip.finance.example.ts`,
   exist): retro and finance theme variants matching the existing
   structure of other component examples.
7. **Programmatic open** (snippet in TSDoc): `[(kjOpen)]="open"` driven by
   a signal — used in onboarding tours / spec tests. Documented as not
   the recommended consumer interaction path.
8. **Disabled tooltip** (snippet in TSDoc): `[kjTooltipDisabled]="!isInvalid()"`
   to conditionally hide a hint until validation fails.

---

## 8. Open questions / risks

1. **`KjAnchor` primitive doesn't exist yet.** Tooltip, Popover, Dropdown
   Menu, Confirm Popup, Speed Dial, and Combobox all need anchored
   positioning. The right shape is a primitive at
   `packages/core/src/primitives/overlay/anchor.ts` that takes anchor +
   panel + side/align/offset and writes positioning each open + on
   resize/scroll, with collision avoidance (flip + shift). It hasn't been
   carved out — the existing `[kjPopover]` does its own thing via
   `data-side`/`data-align` reflection only. **Recommendation:** carve
   `KjAnchor` out as part of this Tooltip work; refactor the existing
   `[kjPopover]` to consume it; make CSS Anchor Positioning the preferred
   path with the manual fallback documented. Block Tooltip v1
   implementation on this primitive landing — without it, every consumer
   reimplements positioning.

2. **CSS Anchor Positioning browser support.** As of early 2026, anchor
   positioning is shipping in Chromium and behind a flag in Firefox; Safari
   is still in development. We need the manual fallback for all three at
   minimum until Safari ships. The fallback is mandatory; the CSS path is
   a progressive enhancement. **Decision:** detect via
   `CSS.supports('anchor-name', '--x')` and pick at runtime. The wrapper
   ships both stylesheets.

3. **`KjTooltipTrigger` taking `HTMLElement` vs. `TemplateRef`.** The v0
   sketch takes `HTMLElement` (passed as `#myTip` template ref to the
   native element). v1 prefers `TemplateRef` (template-level reference,
   stamped into the portal at open-time). Two reasons to support both:
   (a) the v0 shape is easier to grasp for first-time users; (b) consumers
   who want to keep the tooltip element in their DOM (for styling
   inheritance) would lose that under template-only. **Decision:** accept
   `TemplateRef | HTMLElement`. Document that `HTMLElement` mode does not
   portal-mount — the consumer takes responsibility for clipping
   containers. Internal warning when an `HTMLElement` is detected and
   any ancestor has `overflow: hidden` (dev-mode only).

4. **`role="tooltip"` is non-overrideable in v1, but v0 had `kjTooltipRole`.**
   Removing `kjTooltipRole` is a breaking change to the v0 sketch's
   surface. Justification: there is no correct value other than `tooltip`
   on a `[kjTooltipContent]` element; consumers wanting `dialog` semantics
   want a Popover. Anyone passing a non-`tooltip` value via the v0 input
   was almost certainly doing the wrong thing. **Decision:** remove the
   input. If usage data shows consumers depending on it, revisit.

5. **Escape `stopPropagation`.** When a tooltip is open inside an open
   dialog, pressing Escape should close which? Two reasonable behaviours:
   (a) close the tooltip *and* the dialog (Escape bubbles); (b) close only
   the tooltip and stop propagation (Escape consumed). **Decision:**
   close the tooltip and **do not** stop propagation. Rationale:
   tooltips are not modal; the consumer's outer Escape handler (closing
   the dialog) is almost always the higher-priority intent. Edge case:
   the tooltip-open-while-dialog-open scenario is rare; if it bites us
   we revisit. Documented.

6. **Touch dismissal: tap-elsewhere vs. timed.** The touch flow opens on
   long-press. To dismiss: tap anywhere outside the tooltip. We do **not**
   ship a "tap inside tooltip dismisses" behaviour because that conflates
   with interactive content. We do **not** ship a "tooltip auto-dismisses
   after N seconds on touch" behaviour because it contradicts WCAG 1.4.13
   *persistent* even though the SC technically scopes only to hover/focus.
   **Decision:** tap-elsewhere only. Document.

7. **Disabled-trigger workaround.** PrimeNG's `showOnDisabled` synthesises
   pointer events on a transparent wrapper. We don't ship that. Consumers
   who need a tooltip on a disabled control should wrap the disabled
   element in a non-disabled `<span>` and put the tooltip directive there
   instead. Document the snippet. The reason for not auto-wrapping is
   that the wrapper would need to know how to size/position itself
   relative to the disabled child — too many edge cases for too marginal a
   benefit.

8. **`KJ_TOOLTIP_GROUP` global fallback vs. opt-in.** Default behaviour:
   every `[kjTooltip]` participates in a single global group, so a toolbar
   of icon buttons gets skip-delay coordination "for free" without an
   explicit `[kjTooltipGroup]` wrapper. Counter-argument: this means
   tooltips on opposite sides of the page (which the user doesn't perceive
   as related) also share skip-delay state — moving the cursor between
   them within 300 ms opens both instantly, which can feel "leaky".
   **Decision:** ship the global fallback. The 300 ms window plus normal
   cursor travel speed makes cross-page leaks rare in practice. If usage
   shows otherwise, revisit by scoping the global group to the
   `<body>`-attached overlay container so the timing is module-local.

9. **Tooltip on a `<a>` link with a `title` attribute.** Browsers
   render `title` as a native tooltip. If the consumer also adds
   `[kjTooltip]`, the user sees both: the kouji tooltip (styled) and
   the browser tooltip (chrome-default). **Decision:** the directive
   removes the trigger's `title` attribute on first init (storing the
   value if it was non-empty so it can be restored on directive
   teardown). Documented in TSDoc. Side benefit: consumers who upgrade
   from `title=""` to `[kjTooltip]=""` automatically get the AAA
   contract without leaving a dangling `title` behind.

10. **Server-side rendering.** `KjOverlayService.createFromTemplate`
    appends to `document.body`. SSR-safe via `afterNextRender()` from the
    overlay primitive. Tooltip ARIA wiring (`aria-describedby` on the
    trigger) is set in the directive's host bindings so it renders on
    the server too — the description text is rendered (`hidden`) inside
    the portal on first client paint, before any user interaction.
    AT users with SSR'd content get the description on focus, same as
    CSR. Document in spec coverage.

11. **`kjOpen` two-way binding interactions with hover.** If the consumer
    binds `[(kjOpen)]="state"` and the user hovers, our directive
    updates `state`. Then if the consumer programmatically sets `state =
    false` while the cursor is still over the trigger, what happens?
    **Decision:** `kjOpen=false` closes immediately and overrides hover
    state — but the next `mouseenter` (re-entry) will reopen. The
    "force closed despite hover" state lasts until the next
    `mouseenter` or `mouseleave`. Documented; spec'd.

12. **Group skip-delay across portals.** The overlay container is a
    sibling of `<body>`'s normal children. Group context is provided
    on the `[kjTooltipGroup]` directive's host element, but the actual
    tooltip content lives in the portal. The controller passes the
    group context across the portal boundary explicitly (it's just an
    object reference). No issue, just worth noting in the
    implementation.

13. **Hover-only without focus support is impossible to opt into.** We
    don't ship a `kjTooltipEvent: 'hover'` mode. A consumer who
    *really* wants a hover-only tooltip is welcome to write
    `(mouseenter)`/`(mouseleave)` handlers themselves and ignore our
    directive — but our directive will not let them violate WCAG 2.1.1.
    Documented as an explicit non-feature.

14. **Open-delay reset on quick re-hover.** If the user hovers, leaves
    before the open delay elapses, then re-enters within the
    skip-delay window, the controller skips the delay (Radix behaviour).
    If outside the skip-delay window, the open-delay starts over.
    Documented. Spec'd.

15. **Scroll/resize while open.** The `KjAnchor` primitive recomputes
    position on scroll/resize via `requestAnimationFrame`-throttled
    listeners. This is a primitive concern, not tooltip-specific, but
    worth flagging here as the primary consumer driving the requirement.
