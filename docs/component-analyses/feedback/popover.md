# Popover

> **Roadmap:** Feedback — *core directive family*. A trigger-anchored
> floating panel that contains rich, interactive content (buttons, links,
> form fields, summaries). Distinct from
> [`KjTooltip`](./tooltip.md) — popovers are **interactive**, opened on
> click/Enter/Space, focus moves into the panel. Distinct from
> [`KjDialog`](../actions/dialog.md) — popovers are **anchored** to a
> trigger and *non-modal by default*; dialogs are centered modals.
> Distinct from [`KjDropdownMenu`](../actions/dropdown-menu.md) — popovers
> hold arbitrary content, dropdown menus hold a structured list of
> `menuitem`s with roving tabindex.
> **Builds on:** [`KjOverlayService`](../../../packages/core/src/primitives/overlay/overlay.ts) (portal mount), `KjAnchor` primitive (shared anchored-positioning math, decided in [`tooltip.md`](./tooltip.md) §8.1 — to be carved out at `packages/core/src/primitives/overlay/anchor.ts`), [`KjFocusTrap`](../../../packages/core/src/a11y/focus-trap.ts) (modal mode), [`KjAriaDescribedBy`](../../../packages/core/src/a11y/aria-describedby.ts) (optional describer wiring), and the project's no-CDK / no-floating-ui constraint from [`rules/stack.md`](../../../rules/stack.md).
> **Cross-refs:** [Tooltip](./tooltip.md) — read-only sibling sharing `KjAnchor`. [Dropdown Menu](../actions/dropdown-menu.md) — structured-items sibling sharing `KjAnchor`. [Confirm Popup](../actions/confirm-popup.md) — a *narrowed* popover specialised for "are you sure?" prompts. [Dialog](../actions/dialog.md) / [Alert Dialog](../actions/alert-dialog.md) — modal counterparts. [Combobox](../data-input/combobox.md) — its listbox panel **is** a popover (with `role="listbox"` instead of `role="dialog"`). [Speed Dial](../actions/speed-dial.md) — anchored FAB sharing the same anchor primitive.

There is already a working but **partial** implementation in
[`packages/core/src/popover/popover.ts`](../../../packages/core/src/popover/popover.ts).
This analysis treats the existing code as a v0 sketch and specifies the
v1 shape the family should converge on. The v0 sketch already gets
several things right (compound `[kjPopover]` / `[kjPopoverTrigger]` /
`[kjPopoverContent]` / `[kjPopoverClose]` shape; auto-id; `aria-expanded`
+ `aria-controls` on the trigger; `aria-haspopup="dialog"`; click-outside
and Escape both close; `data-side` / `data-align` reflection). It is
missing: portal mounting (currently renders inline as a sibling of the
trigger and inherits parent clipping / `overflow:hidden` / `transform`
ancestors); focus management on open/close (focus does not move to the
panel; closing does not restore focus to the trigger); the
modal/non-modal distinction with focus-trap + scroll-lock for the modal
mode; the connected-positioning math (currently relies on raw CSS only,
no flip / shift / collision avoidance); a `role="dialog"` host attribute
on the content (it inherits whatever the consumer's element role is);
the `aria-labelledby` wiring from content to a heading inside;
arrow/anchor-aware visual flourish; an optional `[kjPopoverArrow]`; the
trigger-types contract (click vs. hover vs. manual). The v1 design
brings the v0 surface in line with the Tooltip family decisions in
[`tooltip.md`](./tooltip.md) and converges on a shared `KjAnchor`
primitive across the whole anchored-overlay family.

---

## 1. Source comparison

### PrimeNG — `p-popover` (formerly `p-overlayPanel`)

PrimeNG's popover (<https://primeng.org/popover>) is a **component**
(`<p-popover #op>`) that the consumer toggles imperatively from a
trigger element via a template ref:

```html
<button (click)="op.toggle($event)" type="button">Show</button>
<p-popover #op>
  <h3>Profile</h3>
  <input pInputText placeholder="Name" />
  <button pButton (click)="op.hide()">Save</button>
</p-popover>
```

Public surface (PrimeNG 17/18, abridged):

| Input                        | Notes                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `dismissable`                | `boolean`. Default `true`. Outside-click dismissal.                                                             |
| `showCloseIcon`              | `boolean`. Default `false`. Renders a built-in close icon inside the panel.                                     |
| `appendTo`                   | `'body' \| HTMLElement \| string`. Default `'body'`. Always escapes clipping containers.                        |
| `style` / `styleClass`       | Pass-through CSS hooks.                                                                                         |
| `baseZIndex` / `autoZIndex`  | Stacking control.                                                                                               |
| `ariaCloseLabel`             | Localisable label for the built-in close icon.                                                                  |
| `focusOnShow`                | `boolean`. Default `true`. Whether focus moves into the panel on open.                                          |
| `showTransitionOptions` / `hideTransitionOptions` | Animation duration/easing strings.                                                       |

| Output                       | Notes                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `onShow`                     | After the panel is visible.                                                                                     |
| `onHide`                     | After the panel is hidden.                                                                                      |

Imperative API: `op.show($event, target?)`, `op.hide()`,
`op.toggle($event, target?)`. Position is relative to the **event target**
(or an explicit `target` element argument), not a declared trigger
directive — every consumer wires the trigger themselves.

Behaviour worth lifting:

- **Auto-mount to `body`.** Escapes clipping/transform ancestors. The
  right default for floating UI; what the existing kouji v0 misses.
- **Click-outside dismissal.** Plus Escape. Standard.
- **Position-relative-to-target.** A popover may be invoked from any
  arbitrary element (including a row in a table); the imperative
  argument lets a single popover instance serve many triggers.

Critique:

- Trigger wiring is manual — consumer is responsible for `aria-haspopup`,
  `aria-controls`, `aria-expanded`, focus restoration on close, and
  Enter/Space activation. Easy to omit; common 4.1.2 violation in the
  wild.
- `focusOnShow` is a binary input but doesn't say *where* in the panel
  focus lands. PrimeNG focuses the panel container itself, which AT
  reads as "dialog" but doesn't position the user inside the natural
  reading order of the content.
- **No modality control.** The panel is always non-modal — there is no
  `[modal]` flag for cases where the popover should focus-trap and
  scroll-lock (e.g. a profile-edit popover deep enough to warrant it).
  Consumers reach for `<p-dialog>` instead, which is wrong shape (no
  anchoring).
- No `role="dialog"` / `aria-labelledby` enforcement — the panel is a
  bare `<div>` unless the consumer adds them.
- No outside-click *configurable*. `dismissable=false` is all-or-nothing;
  there is no separate "Esc closes but outside-click does not" mode (a
  common requirement for forms in popovers where a stray click should
  not lose typed input).
- **No declarative trigger directive.** No
  `[pPopoverTriggerFor]="myPopover"` shorthand. Trigger remains a manual
  template-ref + `(click)` wiring affair.

### Angular Material — *no first-class `Popover`*

This is the gap to call out. Material provides:

- [`MatTooltip`](https://material.angular.dev/components/tooltip/overview)
  — read-only, hover/focus, plain text (the read-only sibling).
- [`MatMenu`](https://material.angular.dev/components/menu/overview) — a
  structured *menu* with `role="menu"` and `menuitem` children (the
  "structured-list" sibling, our `KjDropdownMenu`).
- [`MatDialog`](https://material.angular.dev/components/dialog/overview)
  — programmatically-opened modal centered overlay (the modal sibling).
- [`@angular/cdk/overlay`](https://material.angular.dev/cdk/overlay/overview)
  primitives (`OverlayModule`, `FlexibleConnectedPositionStrategy`,
  `OverlayRef`) — the *building blocks* a consumer would use to roll
  their own popover.

There is **no `MatPopover`**. The official Material pattern for "show a
small floating panel of arbitrary interactive content anchored to a
button" is "build it yourself on top of `Overlay` + `cdk-portal` +
`FlexibleConnectedPositionStrategy`". A community CDK helper at
[`@matheo/cdk-experimental` / various blogs](https://medium.com/angular-in-depth/) fills the gap, but
it is not a first-party Material primitive.

Implications for kouji:

- We must ship a popover. Consumers coming from Material have no
  out-of-the-box equivalent; the brief calls this out explicitly.
- The closest *Material* shape to model after is `MatMenu`'s trigger
  directive, not its panel: `[matMenuTriggerFor]` is a clean trigger
  declaration, including auto-wired `aria-haspopup="menu"`,
  `aria-expanded`, focus restoration on close, and Enter/Space
  activation. We mirror that shape with `[kjPopoverTriggerFor]`
  pointing at a sibling `<ng-template kjPopoverContent>`.
- We **do not** rely on `@angular/cdk/overlay` — explicitly forbidden by
  [`rules/stack.md`](../../../rules/stack.md). We reimplement the
  connected-positioning math via the shared `KjAnchor` primitive
  carved out as part of the Tooltip work (see
  [`tooltip.md`](./tooltip.md) §8.1).
- Material's *focus contract* is the right reference for the modal
  case: `MatDialog` uses `cdk/a11y`'s `FocusTrap` + restores focus on
  close. Our `KjFocusTrap` primitive provides the same contract; we
  compose it on the content directive when (and only when) `kjModal`
  is `true`.

### shadcn/ui — `Popover` (Radix `Popover` primitive)

shadcn's popover (<https://ui.shadcn.com/docs/components/popover>) is a
re-skin of Radix UI's `Popover`. Radix follows the WAI-ARIA APG and is
the cleanest reference for the compound shape:

```tsx
<Popover>
  <PopoverTrigger asChild><Button>Open</Button></PopoverTrigger>
  <PopoverContent side="bottom" align="start" sideOffset={8} modal={false}>
    <PopoverArrow />
    <h4>Dimensions</h4>
    <p>Set the dimensions for the layer.</p>
    <input type="number" />
    <PopoverClose>Close</PopoverClose>
  </PopoverContent>
</Popover>
```

Surface worth lifting:

- **Compound shape.** `Popover` (state container) + `PopoverTrigger` +
  `PopoverContent` + `PopoverArrow` + `PopoverClose` + `PopoverAnchor`.
  Maps cleanly to the Tooltip family's decision in
  [`tooltip.md`](./tooltip.md) §2.
- **`modal` prop.** Default `false`. When `true`, focus is trapped
  inside the panel and the rest of the page is `inert`/scroll-locked.
  Exactly the discriminator we need.
- **`open` / `defaultOpen` / `onOpenChange`.** Controlled and
  uncontrolled. We expose only the controlled mode (`kjOpen` model);
  "uncontrolled" is just "don't bind it" in Angular.
- **`onOpenAutoFocus` / `onCloseAutoFocus`.** Cancellable focus events
  emitted on open and close — consumers can call
  `event.preventDefault()` to opt out and place focus themselves. Useful
  for popovers where the natural first focus target is *not* the first
  focusable inside (e.g. a popover containing a form should focus the
  first input, not the cancel button).
- **`onPointerDownOutside` / `onInteractOutside` / `onEscapeKeyDown`.**
  Each is a separate cancellable callback. We collapse these into two
  configurable flags (`kjCloseOnOutsideClick`, `kjCloseOnEsc`) plus
  emit a cancellable `kjCloseRequested` event so consumers can veto.
- **`PopoverArrow`.** Pure visual flourish positioned by the
  positioning system (Radix uses floating-ui's `arrow` middleware). Our
  `KjAnchor` primitive computes arrow offset alongside the panel
  position so `[kjPopoverArrow]` only needs CSS.
- **`PopoverAnchor`** — a *separate* anchor element that decouples "the
  thing the panel positions next to" from "the thing that opens it".
  Useful for menubar-style UIs where the trigger is a small chevron but
  the panel should align to the parent button. We **defer** this to v2;
  v1 always anchors to the trigger.
- **`PopoverClose`** — convenience close button. Already exists in v0
  as `[kjPopoverClose]`.

Critique:

- Radix's "anchor element" indirection (`PopoverAnchor`) is powerful but
  rare. Defer.
- Radix's outside-click model on touch is fragile (synthesises
  `pointerdown` outside detection that breaks inside iframes). We use
  the `composedPath()`-based approach already proven by `KjOverlayService`.
- React-only (Radix). Behaviour transfers; code does not.

### WAI-ARIA APG — Disclosure vs. Dialog patterns

The APG does not have a "Popover" pattern per se. It has two patterns
that *together* describe the popover space:

- [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) —
  a button toggles the visibility of a section of content. The button
  carries `aria-expanded`. The disclosed region typically has *no*
  ARIA role (it's just content, becoming visible). Focus does **not**
  move into the disclosed region; the user Tabs there naturally as
  part of the document order. Outside-click does not close.
- [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
  — `role="dialog"` (or `alertdialog`), `aria-modal="true"`,
  `aria-labelledby` to a heading. Focus moves *into* the dialog on
  open and is trapped there until close, then returned to the
  invoking element. Escape closes.

A popover sits between these. Our model:

| Mode                         | APG pattern        | `role`       | `aria-modal` | Focus moves into panel? | Outside-click closes? | Escape closes? | Tab trapped? | Scroll-lock? |
| ---------------------------- | ------------------ | ------------ | ------------ | ----------------------- | --------------------- | -------------- | ------------ | ------------ |
| `kjModal=false` (**default**) | Disclosure (extended) | `dialog`  | `false`      | yes (auto-focus first focusable, opt-out) | yes (configurable) | yes (configurable) | no — Tab leaves naturally | no |
| `kjModal=true`               | Dialog Modal       | `dialog`     | `true`       | yes                     | yes                   | yes            | yes — `KjFocusTrap` | yes — `<body>` overflow lock |

We use `role="dialog"` in **both** modes, even non-modal. Rationale:
the APG Disclosure pattern technically says "no role on the disclosed
region", but real-world AT testing shows that named, focused, anchored
panels work better with `dialog` semantics — screen readers announce
the panel boundary on entry and the title via `aria-labelledby`. The
`aria-modal` distinction (`true` vs `false`) is what actually drives
AT modality behaviour. Radix takes the same position. The trigger
always carries `aria-haspopup="dialog"` to match.

### Cross-library summary

|                                 | PrimeNG `p-popover`           | Material — *no popover*    | Radix `Popover`              | kouji direction                                                |
| ------------------------------- | ----------------------------- | -------------------------- | ---------------------------- | -------------------------------------------------------------- |
| Compound shape                  | no — single component         | n/a                        | yes — `Trigger`/`Content`/`Arrow`/`Close` | **yes** — `[kjPopover]` + `[kjPopoverTrigger]` + `[kjPopoverContent]` + `[kjPopoverArrow]` + `[kjPopoverClose]` |
| Trigger directive               | no — manual template-ref      | (`MatMenu`-style only)     | `<PopoverTrigger>`           | **yes** — `[kjPopoverTriggerFor]` shorthand mirroring `[matMenuTriggerFor]` and Tooltip's `[kjTooltipTriggerFor]` |
| Modality                        | non-modal only                | n/a                        | `modal` prop, default `false` | **`kjModal` flag, default `false`** (non-modal disclosure)     |
| Focus on open                   | `focusOnShow=true` → panel    | n/a                        | first focusable, cancellable | **first focusable in content (or content itself), cancellable via `kjOpenAutoFocus` event** |
| Focus restore on close          | not guaranteed                | n/a                        | yes — restored to trigger    | **yes — restored to trigger** (always, both modes)             |
| Focus trap (when modal)         | n/a                           | n/a                        | yes (`modal=true`)           | **yes via `KjFocusTrap`** when `kjModal=true`                  |
| Scroll-lock (when modal)        | n/a                           | n/a                        | yes (`modal=true`)           | **yes** when `kjModal=true`                                    |
| Outside-click closes            | yes (`dismissable`)           | n/a                        | yes (`onPointerDownOutside`) | **yes — `kjCloseOnOutsideClick`, default `true`, cancellable** |
| Escape closes                   | yes                           | n/a                        | yes (`onEscapeKeyDown`)      | **yes — `kjCloseOnEsc`, default `true`, cancellable**          |
| Portal / append-to-body         | yes (default)                 | (CDK Overlay)              | yes                          | **yes** — via `KjOverlayService.createFromTemplate`            |
| Positioning                     | manual + auto-flip            | (CDK overlay)              | floating-ui                  | **CSS Anchor Positioning + manual `KjAnchor` fallback** (no-CDK, no-floating-ui) |
| Arrow                           | no                            | n/a                        | `<PopoverArrow>`             | **yes — `[kjPopoverArrow]`**, position computed by `KjAnchor`  |
| Trigger types                   | manual (`(click)` only)       | n/a                        | click only (Radix design)    | **click (default), manual (programmatic), hover (opt-in, narrow use case)** |
| Open / close events             | `onShow` / `onHide`           | n/a                        | `onOpenChange` (cancellable)  | **`kjOpenChange` (model) + `kjCloseRequested` (cancellable)**  |
| ARIA role on content            | none                          | n/a                        | `dialog`                     | **`dialog` (both modes)**                                       |
| `aria-modal`                    | n/a                           | n/a                        | reflects `modal` prop        | **reflects `kjModal`**                                          |
| `aria-labelledby` enforcement   | none                          | n/a                        | auto-wired to `<DialogTitle>` | **auto-wired** — `[kjPopoverTitle]` directive sets the id; if absent and `kjAriaLabel` empty, dev warning |
| `aria-haspopup` on trigger      | none                          | n/a                        | `dialog`                     | **`dialog`** (matches `kjModal`-agnostic content role)          |

---

## 2. Decision — does it need a core directive?

**Yes — definitively. This is the heaviest of the anchored-overlay
family.** Five concerns converge:

1. **State.** Open/closed, controlled/uncontrolled binding via
   `kjOpen` model, programmatic toggle/show/hide.
2. **Positioning.** Anchored positioning with collision avoidance —
   shared with Tooltip / Dropdown Menu / Confirm Popup / Speed Dial /
   Combobox via the new `KjAnchor` primitive.
3. **Focus management.** Focus moves into the panel on open
   (cancellable); focus restored to the trigger on close. In modal
   mode, focus is trapped via `KjFocusTrap`.
4. **A11y wiring.** `aria-expanded` + `aria-controls` +
   `aria-haspopup="dialog"` on trigger; `role="dialog"` +
   `aria-modal` + `aria-labelledby` on content; auto-id; auto-title
   wiring via `[kjPopoverTitle]`.
5. **Dismissal.** Escape, outside-click, programmatic close — each
   configurable, all cancellable via `kjCloseRequested` so consumer
   logic (e.g. "warn before discarding form changes") can intervene.

Putting this in a wrapper would force every consumer (and every theme)
to re-implement focus restoration, focus trap, ARIA wiring, and outside-
click detection. Those are exactly the things "easy to get wrong" — see
the Material gap and the PrimeNG critique above. Core owns them.

The family is split into six directives, mirroring the Tooltip family
shape but with click-driven semantics and two modality modes:

| Directive                 | Selector                       | Role                                                                                                                |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `KjPopover`               | `[kjPopover]`                  | **Root state container.** Provides `KJ_POPOVER` context. Owns the `kjOpen` model, the `KjOverlayRef`, the `KjAnchor` instance, and the focus-restore target. Lives on the consumer's structural parent (commonly the same element as the trigger group). Stateless host — no DOM mutations beyond context provision. |
| `KjPopoverTrigger`        | `[kjPopoverTrigger]`           | The button that toggles the popover. Sets `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, captures the trigger element for focus restore, handles click + Enter/Space activation. Also accepts the `[kjPopoverTriggerFor]="tplRef"` shorthand for consumers who prefer Material/Tooltip-style trigger declaration without an outer `[kjPopover]` wrapper (the directive then provides its own internal `KJ_POPOVER` instance). |
| `KjPopoverContent`        | `[kjPopoverContent]`           | The floating panel. `role="dialog"`, `aria-modal` reflects `kjModal`, auto-id, `data-side` / `data-align` / `data-state` reflected. Hosted in a portal via `KjOverlayService`, **not** as a sibling of the trigger in the consumer's DOM. Owns focus-on-open (auto-focus first focusable), focus-restore-on-close. Composes `KjFocusTrap` host directive when `kjModal=true`. |
| `KjPopoverArrow`          | `[kjPopoverArrow]`             | Optional non-focusable visual flourish projected inside `[kjPopoverContent]`. Pure styling hook (`data-side` reflected for CSS rotation; `--kj-popover-arrow-x`/`-y` CSS vars set by `KjAnchor`). `aria-hidden="true"`. |
| `KjPopoverTitle`          | `[kjPopoverTitle]`             | Marks the heading element inside the content. Generates an auto-id and registers it with `KJ_POPOVER` so `[kjPopoverContent]` wires `aria-labelledby` to it. Mirrors `KjDialogTitle` in the dialog family. |
| `KjPopoverClose`          | `[kjPopoverClose]`             | Convenience close button. Already exists in v0; kept. Calls `ctx.hide('user-close')` on click; reason propagates to `kjCloseRequested`. |

Why this split:

- **`[kjPopover]` is *optional* when `[kjPopoverTriggerFor]` is used.**
  The two ergonomic shapes serve different ceremony budgets:
  - *Compound shape* (matches v0 + Tooltip family): consumer writes
    `<div kjPopover><button kjPopoverTrigger>…</button><div *kjPopoverContent>…</div></div>`.
    Explicit; suits cases with multiple sibling controls inside one
    state container.
  - *Trigger-for shape* (matches Material `[matMenuTriggerFor]` and
    Tooltip's `[kjTooltipTriggerFor]`): consumer writes
    `<button [kjPopoverTriggerFor]="profile">Profile</button>` +
    `<ng-template #profile><div kjPopoverContent>…</div></ng-template>`.
    No outer wrapper. Suits flat templates and one-off popovers.
  Both shapes share the same `KjPopoverController` (private). The
  trigger-for shape internally provides its own `KJ_POPOVER` context
  on the trigger element so children inside the projected template
  inject correctly.
- **Modal vs. non-modal is a *content* concern, not a separate
  directive.** `[kjPopoverContent]` accepts `kjModal: input<boolean>(false)`
  and conditionally enables `KjFocusTrap` and scroll-lock at runtime.
  Two directives (`KjPopoverContent` + `KjModalPopoverContent`) would
  be cleaner but doubles the API surface for one boolean. We keep one
  directive and document the modal flow.
- **No core component (no `kj-popover`)** in `@kouji-ui/core` — the
  package is directives-only by policy
  ([`rules/architecture.md`](../../../rules/architecture.md) §
  *Package Structure*). The styled wrapper in `@kouji-ui/components`
  provides a `<kj-popover>` Angular component for ergonomics, but it
  composes the same directives.

### Popover vs. Tooltip vs. Dropdown Menu vs. Dialog vs. Combobox boundary

This is the load-bearing decision worth restating in **every** anchored-
overlay file:

| Aspect                | `KjTooltip`              | `KjPopover` (non-modal)             | `KjPopover` (modal)                | `KjDropdownMenu`                  | `KjDialog`                          | `KjCombobox` listbox panel          |
| --------------------- | ------------------------ | ----------------------------------- | ---------------------------------- | --------------------------------- | ----------------------------------- | ----------------------------------- |
| ARIA role             | `tooltip`                | `dialog` + `aria-modal=false`       | `dialog` + `aria-modal=true`       | `menu`                            | `dialog` + `aria-modal=true`        | `listbox`                            |
| `aria-haspopup` on trigger | `false` (n/a; uses `aria-describedby`) | `dialog`                  | `dialog`                            | `menu`                            | n/a (modal launched programmatically or via dialog trigger) | `listbox`                |
| Anchored to trigger?  | yes                      | yes                                 | yes                                | yes                               | **no — centered**                  | yes                                  |
| Triggered by          | hover **and** focus      | click / Enter / Space               | click / Enter / Space              | click / Enter / Space + ArrowDown | programmatic / explicit dialog trigger | input focus + typing            |
| Interactive content   | **forbidden**            | allowed (anything)                  | allowed (anything)                 | structured menu items only        | allowed (anything)                  | structured options only              |
| Content shape         | text or non-interactive  | arbitrary                           | arbitrary                          | `menuitem` / `menuitemcheckbox` / `menuitemradio` / `separator` | arbitrary | `option` items only                  |
| Focus on open         | stays on trigger         | moves to first focusable in panel   | moves to first focusable in panel  | moves to first menu item (roving) | moves to first focusable in dialog  | stays on input; activedescendant    |
| Focus trap            | n/a                      | no                                  | yes (`KjFocusTrap`)                | yes (`KjFocusTrap`)               | yes (`KjFocusTrap`)                 | no (focus stays on input)            |
| Scroll-lock           | no                       | no                                  | yes                                | no                                | yes                                 | no                                   |
| Outside-click closes  | n/a (mouseleave)         | yes (configurable)                  | yes (configurable)                 | yes                               | yes (backdrop click)                | yes                                  |
| Escape closes         | yes                      | yes (configurable)                  | yes (configurable)                 | yes (returns focus to trigger)    | yes (unless `KjAlertDialog`)        | yes (also clears active option)      |
| Persistent            | until dismissed          | until explicit close                | until explicit close               | until item activated or dismissed | until explicit close                | while typing / on selection          |
| Examples              | label on icon button     | profile card, inline edit form, share menu | full edit form too long for inline | command list, action menu        | full-screen edit, alert dialog      | autocomplete, async search           |

The discriminating questions for consumers:

1. *"Is the floating content read-only text describing the trigger?"*
   → **Tooltip**.
2. *"Is the floating content a structured list of commands the user
   picks one of?"* → **Dropdown Menu**.
3. *"Is the floating content a structured list of options the user
   selects from to fill a value (with type-to-filter)?"* →
   **Combobox** (or **Select** for static lists).
4. *"Is the floating content arbitrary, anchored to a trigger, and
   small enough that the rest of the page should remain interactive?"*
   → **Popover (non-modal)**.
5. *"Is the floating content arbitrary, anchored to a trigger, but
   complex enough that the user must finish or cancel before
   interacting elsewhere?"* → **Popover (modal)**.
6. *"Is the floating content arbitrary and *not* anchored to a
   specific trigger (it interrupts the workflow centrally)?"* →
   **Dialog**.

The boundary between "non-modal popover with a form" and "modal
popover with a form" is judgement. Default is non-modal; `kjModal=true`
is opt-in for popovers deep enough to warrant focus-trap + scroll-lock.

---

## 3. Base features

### Trigger contract

- **Open events:** `click` on the trigger; `Enter` and `Space` keypresses
  (default Angular `<button>` behaviour translates these to `click`,
  but for non-`<button>` triggers — e.g. an `<a>` styled as a button —
  the directive listens explicitly to ensure keyboard activation
  always works, satisfying WCAG 2.1.1).
- **Close events:** `click` on `[kjPopoverClose]`; `click` outside the
  panel (when `kjCloseOnOutsideClick=true`); `Escape` keypress (when
  `kjCloseOnEsc=true`); `kjOpen` set to `false` programmatically; the
  trigger element being detached from the DOM (`MutationObserver` —
  same pattern as Tooltip and Confirm Popup); the panel itself
  detached from the DOM (cleanup).
- **No auto-hide timer.** Popovers are user-dismissed.
- **Hover trigger (opt-in, narrow).** `kjTriggerEvent: 'click' | 'hover' | 'manual'`,
  default `'click'`. We expose `'hover'` for the rare use case where a
  popover acts like an enriched tooltip with one or two interactive
  links inside (e.g. a profile preview on a name mention). Hover-mode
  popovers automatically apply WCAG 1.4.13 *hoverable* contract via
  the same hover-on-content listeners as Tooltip — the panel stays
  open while the cursor is on either trigger or panel; closing
  requires `mouseleave` from both *plus* a 300 ms grace period (or
  Escape). **We strongly discourage `'hover'`** in TSDoc — see Open
  Questions §3.
- **`'manual'` trigger.** Disables all built-in triggers; the consumer
  drives via `kjOpen` model. Used for programmatic onboarding tours,
  spec tests, and "open this popover when X validates".
- **Disabled triggers:** if the trigger is `disabled`, the directive
  is inert (no listeners, no `aria-expanded`). Documented in TSDoc.

### Modality (`kjModal`)

The single most important `[kjPopoverContent]` input.

| Mode                   | `kjModal`     | Behaviour                                                                                                                     |
| ---------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Non-modal (default)**| `false`       | `aria-modal="false"`. No focus trap. Page underneath remains interactive. No scroll-lock. Tab moves focus *out* of the panel and continues through document order — outside-click then closes the panel as a side effect. (Net effect: the panel feels like part of the document, just floating.) |
| **Modal**              | `true`        | `aria-modal="true"`. `KjFocusTrap` activated — Tab cycles inside the panel only. `<body>` scroll-lock applied (component layer; core sets `data-kj-scroll-lock` and the wrapper supplies the CSS). Outside-click still closes (configurable). Background is **not** rendered with a scrim by core — that is a wrapper concern; if a scrim is desired, the wrapper layers a `[data-kj-popover-backdrop]` element. |

**Default position:** `kjModal=false`. Rationale:

- Most popovers (profile cards, share menus, inline edit fields, info
  callouts) genuinely should not block the rest of the page. Modal-by-
  default would force every consumer to opt out, and the opt-out
  experience is worse than the opt-in (focus-trap mistakes are loud,
  non-modal-by-default is silent).
- The conventional choice across the ecosystem (Radix, PrimeNG, the
  community Material patterns) is non-modal default.
- Users wanting modal-anchored content typically want a
  [`KjDialog`](../actions/dialog.md) or
  [`KjAlertDialog`](../actions/alert-dialog.md) — modal popovers are
  a niche corner.

### Positioning

We solve this without `floating-ui` and without `@angular/cdk/overlay`
(both forbidden by [`rules/stack.md`](../../../rules/stack.md)). Same
two-layer design as Tooltip — and **shared with Tooltip** via the
`KjAnchor` primitive:

1. **Preferred:** native [CSS Anchor Positioning](https://developer.mozilla.org/docs/Web/CSS/CSS_anchor_positioning)
   when supported. The trigger gets a generated `anchor-name`; the
   panel binds `position-anchor` and `position-area` reflecting
   `kjPopoverSide` / `kjPopoverAlign`. Browser handles flipping on
   collision via `position-try-fallbacks`. Feature-detected via
   `CSS.supports('anchor-name', '--x')`.
2. **Fallback:** manual positioning via `getBoundingClientRect()` +
   resize/scroll listener, computed in the shared `KjAnchor` primitive
   at `packages/core/src/primitives/overlay/anchor.ts`. Same
   collision-avoidance algorithm (main-axis flip then cross-axis
   shift) as floating-ui's `flip` + `shift` middlewares.

The `KjAnchor` primitive also computes arrow position so
`[kjPopoverArrow]` can position itself via CSS variables
(`--kj-popover-arrow-x`, `--kj-popover-arrow-y`) without a separate
calculation per popover instance. This is the same primitive Tooltip
uses; we reuse not duplicate.

| Input                    | Type                                        | Default     | Notes                                                       |
| ------------------------ | ------------------------------------------- | ----------- | ----------------------------------------------------------- |
| `kjPopoverSide`          | `'top' \| 'right' \| 'bottom' \| 'left'`   | `'bottom'`  | Reflected as `data-side` (matches v0 default).              |
| `kjPopoverAlign`         | `'start' \| 'center' \| 'end'`              | `'start'`   | Reflected as `data-align` (matches v0 default).             |
| `kjPopoverOffset`        | `number`                                    | `8`         | Px gap between trigger and panel. Reflected as `--kj-popover-offset`. |
| `kjAvoidCollisions`      | `boolean`                                   | `true`      | Forwarded to `KjAnchor`.                                    |
| `kjCollisionPadding`     | `number`                                    | `8`         | Px padding from viewport edge for collision detection.      |
| `kjArrowPadding`         | `number`                                    | `4`         | Px keep-away from panel corners for the arrow when shifted. |

The core directive does **no positioning work itself**. It reflects
`data-side` / `data-align` / `data-state="open|closed"` on the panel
element and delegates everything else to the `KjAnchor` primitive (or
the CSS anchor-positioning fallback). This keeps the directive
headless and lets the wrapper override positioning entirely.

### Outside-click and Escape

Both configurable, both cancellable.

| Input                       | Type      | Default | Notes                                                                                  |
| --------------------------- | --------- | ------- | -------------------------------------------------------------------------------------- |
| `kjCloseOnEsc`              | `boolean` | `true`  | Escape closes. Mandatory for AAA modal popovers (WCAG 2.1 *2.1.2 No Keyboard Trap*) but configurable for non-modal where consumer may have its own Esc handler. |
| `kjCloseOnOutsideClick`     | `boolean` | `true`  | Click outside panel + outside trigger closes. Defaults to `true` for non-modal; *also* `true` for modal (the modal popover is dismissable like a dialog). |
| `kjCloseOnOutsideFocus`     | `boolean` | `false` | Focus moving outside the panel (in non-modal mode) closes. Default `false` because Tab is the natural way to leave a non-modal popover and we don't want every Tab to close. Useful for cases where the popover should feel "auto-dismissing on attention shift" (e.g. a hover-popover with focus mode). |

Outside-click detection uses `document` `pointerdown` (not `click`) so
the panel closes *before* the click target receives its event — this
prevents a second-click being needed when the user clicks a button
outside the panel. Detection uses `event.composedPath()` so shadow-DOM
consumers work. Trigger element is excluded from "outside" so clicking
the trigger always toggles (rather than close-then-reopen).

**Cancellable close.** Whatever the close source (Esc, outside-click,
programmatic, close button, trigger detachment), the directive emits
`kjCloseRequested(event: KjPopoverCloseEvent)` *before* committing the
close. The event has `event.preventDefault()`. Use case: form-in-popover
where the consumer wants to confirm "discard changes?" before
dismissal. If the close is not prevented, the directive proceeds and
fires `kjOpenChange(false)`. If it *is* prevented, the panel stays
open and `kjOpenChange` is not emitted; the consumer is responsible
for eventually setting `kjOpen=false` when ready.

```ts
export interface KjPopoverCloseEvent {
  readonly reason: 'escape' | 'outside-click' | 'outside-focus' | 'close-button' | 'programmatic' | 'trigger-detached';
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}
```

### Focus management

This is the part the v0 sketch entirely omits.

**On open:**

1. Capture `document.activeElement` as the focus-restore target. (Almost
   always the trigger, but a programmatic `kjOpen=true` could fire
   from anywhere.)
2. After the panel is mounted and visible (post `afterNextRender`),
   emit `kjOpenAutoFocus(event: KjAutoFocusEvent)`. Cancellable via
   `event.preventDefault()`.
3. If not prevented: search the panel for the first focusable element
   matching the standard tabbable selector
   (`button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])`,
   plus elements with `[autofocus]`). Focus it. If none found, focus
   the panel itself (its `tabindex="-1"` is set host-side so it can
   receive focus programmatically without entering the Tab order).
4. If `[autofocus]` is present on a child, that takes precedence over
   "first focusable" — same as the platform.

**On close:**

1. Emit `kjCloseAutoFocus(event: KjAutoFocusEvent)`. Cancellable.
2. If not prevented: focus the captured trigger element. (Wrapped in a
   try/catch in case the trigger was removed from the DOM mid-popover
   — in that case focus moves to `<body>`, matching the dialog
   convention.)
3. Dispose the overlay ref via `KjOverlayRef.dispose()`.

```ts
export interface KjAutoFocusEvent {
  readonly element: HTMLElement; // the would-be focus target
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}
```

**Inside the panel (non-modal):**

- `Tab` / `Shift+Tab` cycles through the panel's focusable elements
  in document order. When focus reaches the last (resp. first)
  focusable, the next Tab moves out into the rest of the document —
  which (with `kjCloseOnOutsideFocus=false`, default) leaves the
  panel open and lets the user continue navigating; outside-click
  detection eventually closes it when the user actually clicks
  somewhere.

**Inside the panel (modal):**

- `KjFocusTrap` host directive is composed on `[kjPopoverContent]`
  conditionally (Angular doesn't support conditional host directives
  yet, so we *always* compose it but enable/disable via its
  `kjFocusTrap: input<boolean>` flag, bound to `kjModal`). Tab
  cycles within the panel only. Shift+Tab from the first focusable
  wraps to the last. WCAG 2.1.2 *No Keyboard Trap* requires Escape
  to leave; we provide it.

### Variants / Sizes

`[kjPopoverContent]` composes `KjVariant` (host directive). Default
variant is `'default'`. Other accepted values: `'accent'`, `'success'`,
`'warning'`, `'danger'`. The variant only affects chrome (border /
background tokens applied by the wrapper) — *not* semantics. A
`'danger'` popover is **not** an alert dialog; if the message is
critical and modal, use [`KjAlertDialog`](../actions/alert-dialog.md).

`[kjPopoverContent]` does **not** compose `KjSize`. Size is content-
driven (panel sizes to its content) with a wrapper-imposed
`max-width: min(20rem, calc(100vw - 1rem))` cap. Consumers wanting
larger panels declare their own width on the projected content; the
wrapper does not interfere.

### Disabled state

`kjPopoverDisabled: input<boolean>(false)` on `[kjPopoverTrigger]`
suppresses opening entirely. Useful for conditional popovers (e.g.
"show this popover only after the user clicks Save"). Reflects to
`data-disabled` on the trigger; `aria-expanded` is still wired (set
to `false`) but the click handler short-circuits.

### State model

`kjOpen: model<boolean>(false)` — two-way bindable on `[kjPopover]`
(when used in compound shape) and on `[kjPopoverTrigger]` (when used
in trigger-for shape). Setting `kjOpen=true` opens immediately
(skipping no delays — popover is click-driven, not delay-driven).
Setting `kjOpen=false` closes immediately, going through the same
`kjCloseRequested` cancellable cycle as Esc/outside-click.

`kjOpenChange` output mirrors the model. Useful for analytics and
controlled-mode consumers who don't want two-way binding.

---

## 4. Accessibility (WCAG 2.1 AAA)

WAI-ARIA APG references:

- [Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
  — the non-modal mode pattern.
- [Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
  — the modal mode pattern.
- [WCAG SC 2.1.2 *No Keyboard Trap*](https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html)
  — Escape must leave the focus-trapped panel.
- [WCAG SC 2.4.3 *Focus Order*](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)
  — focus restoration to trigger on close.
- [WCAG SC 4.1.2 *Name, Role, Value*](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html)
  — `role="dialog"` + `aria-labelledby`; `aria-haspopup` + `aria-expanded` + `aria-controls` on trigger.

### Roles

| Element                       | Role / value                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `[kjPopover]` host            | none (state container; transparent in DOM).                                                  |
| `[kjPopoverTrigger]` host     | inherits whatever the consumer's element is (typically `button`). Directive does **not** override `role`. |
| `[kjPopoverContent]` host     | `role="dialog"`. Hard-coded; not configurable. (The v0 sketch sets no role; v1 mandates it.) The trigger's `aria-haspopup="dialog"` matches. |
| `[kjPopoverArrow]` host       | none (decorative). `aria-hidden="true"`.                                                     |
| `[kjPopoverTitle]` host       | inherits whatever the consumer's element is (typically `h2`–`h4`). Directive registers its id with the parent context for `aria-labelledby` wiring. |
| `[kjPopoverClose]` host       | inherits (typically `button`). Directive does not override `role`.                            |

### ARIA wiring

**Trigger (`[kjPopoverTrigger]` host bindings):**

- `[attr.aria-haspopup]="'dialog'"`
- `[attr.aria-expanded]="ctx.open()"`
- `[attr.aria-controls]="ctx.popoverId"` (always set, even when
  closed — same rationale as Tooltip's `aria-describedby`: AT scans
  on focus, not on visibility change)
- `[attr.aria-disabled]="kjPopoverDisabled() ? 'true' : null"`
- Mouse: `(click)="toggle()"`
- Keyboard: `(keydown.enter)="…"`, `(keydown.space)="…"` only when
  the host element is not a native `<button>` — for `<button>` the
  browser already converts these to `click`.
- Reflects `data-state="open|closed"` for wrapper styling.

**Content (`[kjPopoverContent]` host bindings):**

- `role="dialog"`
- `[attr.aria-modal]="kjModal()"`
- `[attr.id]="ctx.popoverId"`
- `[attr.aria-labelledby]="ctx.titleId() || null"` — wired by
  `[kjPopoverTitle]` registering its auto-id; `null` if none and
  `kjAriaLabel` is also empty (dev warning fires in that case)
- `[attr.aria-label]="kjAriaLabel() || null"` — accepted as fallback
  when no `[kjPopoverTitle]` is projected
- `[attr.aria-describedby]="kjAriaDescribedBy() || null"` — composed
  via `KjAriaDescribedBy` host directive so consumer-supplied
  describedby ids stack (e.g. with a `[kjPopoverDescription]`
  helper directive in v2)
- `[attr.tabindex]="-1"` — so the panel itself can be focused
  programmatically when no inner focusable exists
- `[attr.hidden]="!ctx.open() ? '' : null"` — visibility toggled via
  `hidden` attribute (matches v0; AT respects it)
- `[attr.data-state]="ctx.open() ? 'open' : 'closed'"`
- `[attr.data-side]="ctx.kjPopoverSide()"`
- `[attr.data-align]="ctx.kjPopoverAlign()"`

**Title (`[kjPopoverTitle]` host bindings):**

- `[attr.id]="autoId"` — auto-generated `kj-popover-title-{n}`
- registers itself with the parent `KJ_POPOVER` context on `ngOnInit`,
  unregisters on `DestroyRef.onDestroy()`.

**Arrow (`[kjPopoverArrow]` host bindings):**

- `aria-hidden="true"`
- `[attr.data-side]="ctx.kjPopoverSide()"`
- inline styles `--kj-popover-arrow-x` / `--kj-popover-arrow-y` set
  by `KjAnchor`.

### Keyboard contract

| Key                 | When focus is on…              | Behaviour                                                                                       |
| ------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | Trigger (closed)               | Normal Tab — moves to next focusable in document.                                                |
| `Enter` / `Space`   | Trigger (closed)               | Opens the popover. Focus moves into panel (per focus-management contract above).                 |
| `Tab`               | Inside panel, non-modal        | Moves to next focusable inside panel; if last, moves out into document. Panel stays open.        |
| `Shift+Tab`         | Inside panel, non-modal        | Moves to previous focusable inside panel; if first, moves *back to the trigger* (per APG Disclosure pattern §"Keyboard Interaction"). |
| `Tab`               | Inside panel, modal            | Cycles within panel (`KjFocusTrap`). Last → first.                                               |
| `Shift+Tab`         | Inside panel, modal            | Cycles within panel. First → last.                                                                |
| `Escape`            | Inside panel, any mode         | Closes the popover (when `kjCloseOnEsc=true`). Focus restores to trigger. Emits `kjCloseRequested` first; if prevented, stays open. **Stops propagation** in modal mode (so an outer modal isn't accidentally closed); does **not** stop propagation in non-modal mode (consumer outer-Esc handlers run). |
| any other key       | Inside panel                   | Delegated to consumer's content (forms etc.).                                                    |

### Focus management (summary, see §3 for full)

- **Open:** capture trigger; auto-focus first focusable in panel (or
  panel itself); cancellable via `kjOpenAutoFocus` event.
- **Close:** restore focus to captured trigger; cancellable via
  `kjCloseAutoFocus` event.
- **Modal:** `KjFocusTrap` host directive on content, enabled when
  `kjModal=true`. Tab cycles inside.
- **Non-modal:** no trap. Tab leaves naturally. Shift+Tab from first
  focusable returns to trigger (matches APG Disclosure).

### Touch

Click triggers fire on tap on touch devices — no special handling
needed beyond the click-driven contract. Outside-click detection uses
`pointerdown` which works for touch.

For hover-mode popovers (the rare case), touch falls back to long-press
the same way Tooltip does, via the same `kjTouchGestures` /
`kjTouchHoldMs` inputs (default `'auto'` / `500ms`). On touch, modal
mode is recommended over non-modal because outside-tap is the only
dismissal gesture.

### Screen reader behaviour

- AT announces the panel boundary on entry via the `dialog` role +
  `aria-labelledby` to the title. Modal mode causes AT to constrain
  navigation to within the panel (the `aria-modal=true` contract).
- The panel's visibility is toggled via `hidden` attribute (matches
  v0). AT respects `hidden`.
- Reduced motion: the wrapper's open/close transition guards on
  `@media (prefers-reduced-motion: reduce)`. Core has no animation
  hooks beyond `data-state` reflection.

### Touch target (WCAG 2.5.5 AAA)

- The trigger element's target is the consumer's responsibility
  (typically `KjButton`'s 44×44 minimum applies).
- `[kjPopoverClose]` is itself a button; same 44×44 contract via
  whatever button styling the consumer applies (typically `kjButton`).
- The arrow is decorative and not a touch target.

### Colour & contrast (WCAG 1.4.6 AAA)

Headless core sets no colour. Styled wrapper must hit 7:1 contrast for
panel text against the panel surface and 3:1 for the panel border /
arrow stroke against the page background. Forced-colours mode: ensure
a visible border survives Windows High Contrast (don't rely on
background fill or shadow alone).

### Accessibility Review (against rules/accessibility.md)

- `1.3.1 Info and Relationships` — `aria-haspopup` / `aria-controls`
  / `aria-expanded` programmatically wire trigger ↔ panel;
  `aria-labelledby` wires panel ↔ title.
- `1.4.1 Use of Color` — variants are chrome-only; semantics carried
  by content, not colour.
- `1.4.6 Contrast (Enhanced)` — wrapper enforces 7:1; documented in
  styled-wrapper notes.
- `1.4.10 Reflow` — wrapper caps panel width; collision-avoidance
  shifts panel within viewport.
- `1.4.13 Content on Hover or Focus` — applies only to the (rare)
  hover-mode popover. Same three-part contract as Tooltip
  (dismissible via Esc, hoverable via panel's own mouseenter/leave
  listeners, persistent — no auto-hide).
- `2.1.1 Keyboard` — Enter/Space opens; Tab cycles inside (modal) or
  flows naturally (non-modal); Esc closes.
- `2.1.2 No Keyboard Trap` — modal mode mandates Esc to leave;
  cannot be disabled when `kjModal=true` (we override
  `kjCloseOnEsc=false` with a dev warning when `kjModal=true`).
- `2.4.3 Focus Order` — focus moves into panel on open; restored to
  trigger on close.
- `4.1.2 Name, Role, Value` — `role="dialog"` hard-coded;
  `aria-labelledby` to projected title or `aria-label` fallback;
  trigger has full `aria-haspopup` + `aria-expanded` + `aria-controls`.

---

## 5. Composition model

```
packages/core/src/popover/
  popover.ts                          // KjPopover (state container, root, optional wrapper)
  popover-trigger.ts                  // KjPopoverTrigger (also accepts [kjPopoverTriggerFor])
  popover-content.ts                  // KjPopoverContent (role="dialog", portal-mounted, focus management)
  popover-arrow.ts                    // KjPopoverArrow (decorative)
  popover-title.ts                    // KjPopoverTitle (auto-id, registers for aria-labelledby)
  popover-close.ts                    // KjPopoverClose (existing in v0; kept)
  popover.controller.ts               // KjPopoverController — private shared logic (open/close, focus capture/restore, kjCloseRequested cycle, anchor lifecycle)
  popover.context.ts                  // KJ_POPOVER, KjPopoverContext, KJ_POPOVER_DEFAULTS, KjPopoverDefaults, KjPopoverCloseEvent, KjAutoFocusEvent
  popover.example.ts                  // (existing) basic compound
  popover.modal.example.ts            // (new) modal mode with form
  popover.trigger-for.example.ts      // (new) trigger-for shape (no outer wrapper)
  popover.placements.example.ts       // (new) all four sides
  popover.cancellable-close.example.ts // (new) form-in-popover with discard-changes confirmation
  popover.retro.example.ts            // (existing)
  popover.finance.example.ts          // (existing)
  popover.spec.ts                     // (existing, expand)
  index.ts
```

The existing v0 implementation
([`packages/core/src/popover/popover.ts`](../../../packages/core/src/popover/popover.ts))
co-locates all four directives (`KjPopover` / `KjPopoverTrigger` /
`KjPopoverContent` / `KjPopoverClose`) in a single file. v1 splits per
[`rules/architecture.md`](../../../rules/architecture.md) §
*One Directive Per File*.

### Shared-state mechanism

```ts
// popover.context.ts

import { InjectionToken, Signal } from '@angular/core';

export type KjPopoverSide = 'top' | 'right' | 'bottom' | 'left';
export type KjPopoverAlign = 'start' | 'center' | 'end';
export type KjPopoverTriggerEvent = 'click' | 'hover' | 'manual';

export interface KjPopoverDefaults {
  side?: KjPopoverSide;                        // default 'bottom'
  align?: KjPopoverAlign;                      // default 'start'
  offset?: number;                             // default 8
  collisionPadding?: number;                   // default 8
  modal?: boolean;                             // default false
  closeOnEsc?: boolean;                        // default true
  closeOnOutsideClick?: boolean;               // default true
  closeOnOutsideFocus?: boolean;               // default false
  triggerEvent?: KjPopoverTriggerEvent;        // default 'click'
}
export const KJ_POPOVER_DEFAULTS = new InjectionToken<KjPopoverDefaults>('KjPopoverDefaults');

export interface KjPopoverContext {
  readonly open: Signal<boolean>;
  readonly popoverId: string;
  readonly titleId: Signal<string | null>;
  readonly modal: Signal<boolean>;
  readonly kjPopoverSide: Signal<KjPopoverSide>;
  readonly kjPopoverAlign: Signal<KjPopoverAlign>;

  // Mutations — all go through here so KjCloseRequested can fire centrally
  show(): void;
  hide(reason: KjPopoverCloseEvent['reason']): void;
  toggle(): void;

  // Title registration (called by [kjPopoverTitle])
  registerTitleId(id: string): void;
  unregisterTitleId(id: string): void;

  // Focus capture/restore targets
  captureTriggerFocus(el: HTMLElement): void;
  restoreTriggerFocus(): void;
}
export const KJ_POPOVER = new InjectionToken<KjPopoverContext>('KjPopover');

export interface KjPopoverCloseEvent {
  readonly reason:
    | 'escape'
    | 'outside-click'
    | 'outside-focus'
    | 'close-button'
    | 'programmatic'
    | 'trigger-detached';
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

export interface KjAutoFocusEvent {
  readonly element: HTMLElement;
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}
```

The v0 `KjPopoverContext` is missing `titleId`, `modal`, `show()`,
`hide(reason)`, `registerTitleId`, `captureTriggerFocus`, and the
`KjPopoverDefaults` injection token. v1 adds them. The v0 `toggle()`
and `hide()` are kept (with `hide()` updated to take a reason).

### `hostDirectives` composition

- `[kjPopover]` (state container): composes nothing. Pure context
  provider. No host bindings on the consumer's element.
- `[kjPopoverTrigger]`:
  - `KjFocusRing` (forwarded as-is) — the trigger usually *is* a
    `KjButton` which already brings its own focus ring; the directive
    does **not** auto-add `KjFocusRing` to avoid double rings. Documented.
  - **Nothing else.** Sets host attrs / listeners directly.
- `[kjPopoverContent]`:
  - `KjVariant` (input `kjVariant: kjVariant`) — chrome variant.
  - `KjFocusTrap` (input alias `kjFocusTrap: kjFocusTrap`, internally
    bound to `kjModal()` via a sync effect) — focus trap when modal.
  - `KjAriaDescribedBy` (input alias `kjAriaDescribedBy: kjAriaDescribedBy`)
    — describer composition for content with optional helper text.
- `[kjPopoverArrow]`: composes nothing. Pure host attrs.
- `[kjPopoverTitle]`: composes nothing. Pure host attrs (auto-id).
- `[kjPopoverClose]`: composes nothing. Single `(click)` listener
  calling `ctx.hide('close-button')`.

### Portal mounting

`[kjPopoverContent]` mounts to `document.body` via `KjOverlayService`,
*not* as a sibling of the trigger in the consumer's DOM. This is the
v0's primary gap. Concretely:

- In compound shape (`<div kjPopover><button kjPopoverTrigger>… <div *kjPopoverContent>…</div></div>`),
  the `*kjPopoverContent` structural directive (`*` syntax — note the
  asterisk) creates a `<ng-template>` that the controller stamps into a
  `KjOverlayService.createFromTemplate` call on first open. Subsequent
  opens reuse the same overlay ref, toggling visibility via
  `KjOverlayRef.open()` / `close()`.
- In trigger-for shape (`<button [kjPopoverTriggerFor]="tplRef">` +
  `<ng-template #tplRef>…</ng-template>`), the trigger directive owns
  the `KjOverlayRef` directly — no separate `[kjPopover]` wrapper
  needed.
- `KjOverlayRef.dispose()` is called in `DestroyRef.onDestroy()` to
  clean up the body-level node.
- The overlay container's `position: fixed` is set by `KjOverlayService`;
  `top` / `left` / `transform` are set by the `KjAnchor` primitive on
  each open and on resize/scroll (rAF-throttled).

**Migration note for v0 consumers:** The v0 sketch expects
`[kjPopoverContent]` as an *attribute* directive on a regular `<div>`
that is a sibling of the trigger inside the consumer's DOM. v1 changes
this to a *structural* directive (`*kjPopoverContent`) so the host
template can be stamped into the portal. The `[kjPopoverContent]`
attribute form is kept as a deprecated alias that warns in dev mode
(suggests migration to the asterisk form). Removed in v2.

### Reuse of existing primitives

| Primitive            | Reused for                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `KjOverlayService`   | Portal mount of the panel to `document.body`, escaping clipping containers. Same as Tooltip / Dialog.    |
| `KjAnchor` (new — to be carved out, see [`tooltip.md`](./tooltip.md) §8.1) | Connected positioning math (side/align/offset, flip, shift, arrow position). Same primitive Tooltip / Dropdown Menu / Confirm Popup / Speed Dial / Combobox use. |
| `KjFocusTrap`        | Modal mode (`kjModal=true`). Composed as host directive on `[kjPopoverContent]`, gated by an effect bound to `kjModal()`. |
| `KjVariant`          | Chrome variant on `[kjPopoverContent]`. Default `'default'`.                                              |
| `KjAriaDescribedBy`  | Optional describer composition on `[kjPopoverContent]` (consumer-supplied describedby ids stack).         |
| `KjVisuallyHidden`   | Not used directly; mentioned in TSDoc for accessible-name patterns inside popovers.                       |
| `KjLiveRegion`       | Not used. Popover is announced via `dialog` role + `aria-labelledby`, not via live region.                |
| `KjRovingTabindex`   | Not used. (Dropdown Menu uses it — popover content is arbitrary, not a structured list.)                  |
| `KjFocusRing`        | Used by the *trigger button* (consumer's `KjButton`), not by popover directives directly.                  |
| `KjSize`             | Not used. Size is content-driven.                                                                          |
| `KjDisabled`         | Not used directly; `kjPopoverDisabled` on `[kjPopoverTrigger]` is a local input.                          |

### Cross-component pointers

- **[Tooltip](./tooltip.md)** — read-only sibling. Same `KjAnchor`
  primitive, same `KjOverlayService`, but `role="tooltip"`,
  hover/focus-driven, no focus management. The Tooltip-vs-Popover
  boundary is documented in *both* files (see §2 above and the
  corresponding section in `tooltip.md`).
- **[Dropdown Menu](../actions/dropdown-menu.md)** — structured-items
  sibling. Same `KjAnchor`, same portal mount. Different role
  (`menu` not `dialog`); different keyboard contract (roving tabindex
  + type-ahead). A dropdown menu is *almost* a popover with structure
  imposed; the structure justifies a separate family rather than a
  popover-with-`<menuitem>` shape.
- **[Confirm Popup](../actions/confirm-popup.md)** — a *narrowed*
  popover for "are you sure?" prompts. Built on the same `KjPopover`
  primitives with opinionated defaults (modal, two buttons, focus on
  cancel by default).
- **[Dialog](../actions/dialog.md)** — modal centered overlay. *Not*
  anchored. The discriminator: anchored vs. centered. Modal popovers
  exist (`kjModal=true`) but they are still anchored to their
  trigger; if the design wants centered modality, that's a dialog.
- **[Alert Dialog](../actions/alert-dialog.md)** — same as Dialog but
  with `role="alertdialog"` and outside-click *not* dismissable.
  Popover never reaches alertdialog territory; if a destructive
  confirmation is needed, that's `KjAlertDialog`, not a danger-variant
  popover.
- **[Drawer](../actions/drawer.md) / [Bottom Sheet](../actions/bottom-sheet.md)**
  — side-anchored modal panels. They share the modal/scroll-lock
  concern with modal popover but anchor to a viewport edge, not to a
  trigger. Different directive family.
- **[Speed Dial](../actions/speed-dial.md)** — anchored FAB. Same
  `KjAnchor` primitive; different content shape (a fan of action
  buttons, not arbitrary content).
- **[Combobox](../data-input/combobox.md)** — its listbox panel **is**
  a popover (in implementation terms — anchored, portal-mounted, dismissable),
  but with `role="listbox"` instead of `role="dialog"` and an
  `aria-activedescendant` model rather than focus-into-panel. Combobox
  *internally* uses the same `KjAnchor` primitive but wires its own
  `[kjListbox]` semantics on the panel. We do **not** force Combobox
  to compose `KjPopover` directives — the role mismatch is too sharp.
- **[Select](../data-input/select.md)** — same shape as Combobox but
  for static lists. Same `KjAnchor` reuse.
- **[Context Menu](../actions/context-menu.md)** — popover-shape
  triggered by right-click instead of left-click; structurally a
  dropdown menu with a non-button trigger.
- **[Button](../actions/button.md)** — the canonical trigger element.
  `[kjPopoverTrigger]` does not compose `KjButton`; it sits *on top
  of* whatever the consumer used as their trigger. Triggers should
  *always* be focusable interactive elements (typically `<button>`)
  to satisfy WCAG 2.1.1 — TSDoc warns when applied to non-interactive
  elements.

---

## 6. Inputs / Outputs / Models

All members `kj`-prefixed per [`rules/architecture.md`](../../../rules/architecture.md) §
*Host Directives for Behaviour Composition* / *Input aliasing*.

### `[kjPopover]` (state container, optional in trigger-for shape)

| Member                       | Kind   | Type                                              | Default                                | Notes                                                                                  |
| ---------------------------- | ------ | ------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `kjPopoverSide`              | input  | `KjPopoverSide`                                   | from defaults or `'bottom'`            | Reflected as `data-side` on content.                                                   |
| `kjPopoverAlign`             | input  | `KjPopoverAlign`                                  | from defaults or `'start'`             | Reflected as `data-align` on content.                                                  |
| `kjPopoverOffset`            | input  | `number`                                          | from defaults or `8`                   | Px gap between trigger and panel.                                                       |
| `kjAvoidCollisions`          | input  | `boolean`                                         | `true`                                 | Forwarded to `KjAnchor`.                                                                |
| `kjCollisionPadding`         | input  | `number`                                          | `8`                                    | Px viewport padding for collision.                                                      |
| `kjOpen`                     | model  | `boolean`                                         | `false`                                | Two-way bindable. Programmatic open/close. Goes through `kjCloseRequested` on close.    |
| `kjTriggerEvent`             | input  | `KjPopoverTriggerEvent`                           | from defaults or `'click'`             | `'click' \| 'hover' \| 'manual'`. `'manual'` disables built-in trigger listeners.       |

| Output                       | Kind   | Payload                                           | Notes                                                                                  |
| ---------------------------- | ------ | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `kjOpenChange`               | output | `boolean`                                         | Convenience event paired with the `kjOpen` model.                                       |
| `kjCloseRequested`           | output | `KjPopoverCloseEvent`                             | Cancellable. Fires before each close attempt regardless of source.                       |
| `kjOpenAutoFocus`            | output | `KjAutoFocusEvent`                                | Cancellable. Fires before auto-focus on open.                                            |
| `kjCloseAutoFocus`           | output | `KjAutoFocusEvent`                                | Cancellable. Fires before focus restoration on close.                                    |

### `[kjPopoverTrigger]` (also serves as trigger-for entry point)

| Member                       | Kind   | Type                                              | Default                                | Notes                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| `kjPopoverTriggerFor`        | input  | `TemplateRef<unknown> \| undefined`               | `undefined`                            | When set, this directive provides its own `KJ_POPOVER` context. Used in *trigger-for* shape. The template is expected to contain a `[kjPopoverContent]` (or `*kjPopoverContent`) at root. |
| `kjPopoverDisabled`          | input  | `boolean`                                         | `false`                                | Suppresses opening. Reflects `data-disabled`.                                          |
| `kjPopoverSide`              | input  | `KjPopoverSide`                                   | inherited                              | Override side for this trigger (when in trigger-for shape).                            |
| `kjPopoverAlign`             | input  | `KjPopoverAlign`                                  | inherited                              |                                                                                       |
| `kjPopoverOffset`            | input  | `number`                                          | inherited                              |                                                                                       |
| `kjOpen`                     | model  | `boolean`                                         | `false`                                | Same model as `[kjPopover]`. In compound shape, `[kjPopover]` and `[kjPopoverTrigger]` share state via `KJ_POPOVER`; the model can be bound on either. |
| `kjTriggerEvent`             | input  | `KjPopoverTriggerEvent`                           | inherited                              |                                                                                       |

| Output                       | Kind   | Payload                                           | Notes                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `kjOpenChange`               | output | `boolean`                                         |                                                                                       |
| `kjCloseRequested`           | output | `KjPopoverCloseEvent`                             | Same payload as on `[kjPopover]`.                                                      |
| `kjOpenAutoFocus`            | output | `KjAutoFocusEvent`                                |                                                                                       |
| `kjCloseAutoFocus`           | output | `KjAutoFocusEvent`                                |                                                                                       |

### `[kjPopoverContent]` (structural in v1: `*kjPopoverContent`)

| Member                       | Kind   | Type                                              | Default                                | Notes                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| `kjModal`                    | input  | `boolean`                                         | `false`                                | Modality flag. `true` enables `KjFocusTrap` and `<body>` scroll-lock; sets `aria-modal="true"`. |
| `kjAriaLabel`                | input  | `string`                                          | `''`                                   | Fallback accessible name when no `[kjPopoverTitle]` is projected.                       |
| `kjAriaDescribedBy`          | input  | `string \| string[]`                              | `''`                                   | Forwarded to `KjAriaDescribedBy` host directive.                                        |
| `kjVariant`                  | input  | `'default' \| 'accent' \| 'success' \| 'warning' \| 'danger'` | `'default'`                | Forwarded to `KjVariant` host directive (chrome only — semantics live in content).       |
| `kjCloseOnEsc`               | input  | `boolean`                                         | from defaults or `true`                | Esc closes. Forced `true` (with dev warning) when `kjModal=true`.                       |
| `kjCloseOnOutsideClick`      | input  | `boolean`                                         | from defaults or `true`                | Outside-click closes.                                                                   |
| `kjCloseOnOutsideFocus`      | input  | `boolean`                                         | from defaults or `false`               | Outside-focus closes (non-modal hover-popover use case).                                  |
| `kjPanelClass`               | input  | `string \| string[]`                              | `''`                                   | Forwarded to the panel container (the body-level overlay div). Wrapper styling hook.    |

`[kjPopoverContent]` exposes no outputs of its own — events propagate to the parent
`[kjPopover]` / `[kjPopoverTrigger]`.

### `[kjPopoverArrow]`

No public inputs/outputs. Reflects `data-side` from the parent
context for CSS positioning.

### `[kjPopoverTitle]`

No public inputs/outputs. Generates an auto-id and registers it with
`KJ_POPOVER` for `aria-labelledby` wiring on the content.

### `[kjPopoverClose]` (existing in v0; kept)

No public inputs/outputs. Single `(click)` listener calling
`ctx.hide('close-button')`.

---

## 7. Examples to ship

`@doc-example` groups in the directives' TSDoc:

1. **Basic compound** (`popover.example.ts`, exists — keep updated):
   `[kjPopover]` + `[kjPopoverTrigger]` + `*kjPopoverContent` with a
   small profile card. Demonstrates compound shape and the default
   non-modal mode.
2. **All four sides** (`popover.placements.example.ts`, new): four
   triggers, one per side. Resize viewport to demonstrate flip-on-
   collision via `KjAnchor`.
3. **Trigger-for shape** (`popover.trigger-for.example.ts`, new):
   `<button [kjPopoverTriggerFor]="profileTpl">` with the content in
   a sibling `<ng-template>`. No outer `[kjPopover]`. Demonstrates
   the flat ergonomic.
4. **Modal mode with form** (`popover.modal.example.ts`, new):
   `[kjModal]="true"`, projected form fields, a submit and cancel
   button. Demonstrates focus-trap + scroll-lock + Esc-to-cancel.
5. **Cancellable close** (`popover.cancellable-close.example.ts`,
   new): `(kjCloseRequested)="confirmDiscard($event)"` to prompt
   "discard changes?" when the user tries to dismiss a dirty form.
   Demonstrates the cancellable-close pattern.
6. **Themed** (`popover.retro.example.ts`,
   `popover.finance.example.ts`, exist): retro and finance theme
   variants matching the existing structure of other component
   examples.
7. **Programmatic open** (snippet in TSDoc): `[(kjOpen)]="open"`
   driven by a signal — used in onboarding tours / spec tests.
   Documented as the recommended path for programmatic control.
8. **Cancel via auto-focus opt-out** (snippet in TSDoc):
   `(kjOpenAutoFocus)="$event.preventDefault()"` to keep focus on
   the trigger when the popover is opened during a contextual hint
   tour (so subsequent Tab continues from where the user left off).

---

## 8. Open questions / risks

1. **`KjAnchor` primitive doesn't exist yet.** Same blocker as Tooltip
   — see [`tooltip.md`](./tooltip.md) §8.1. Tooltip and Popover are
   the two heaviest consumers of `KjAnchor`; they should drive its
   API together. The right shape: an injectable / standalone class
   accepting `(anchorEl, panelEl, options)` where `options` is
   `{ side, align, offset, collisionPadding, arrowPadding,
   avoidCollisions, prefersCssAnchor }`. The primitive returns a
   handle with `update()`, `dispose()`, and exposes a signal
   `placement: Signal<{ side, align, arrowX, arrowY }>` so the
   directive can reflect resolved placement (which may differ from
   requested after collision avoidance) onto `data-side` /
   `data-align`. **Recommendation:** carve out as part of joint
   Tooltip + Popover v1 work; refactor v0 popover to consume it.

2. **CSS Anchor Positioning browser support.** Same as Tooltip §8.2.
   Manual fallback is mandatory until Safari ships. `KjAnchor` picks
   path at runtime via `CSS.supports('anchor-name', '--x')`.

3. **`'hover'` trigger event for popover.** Genuine ergonomic risk:
   a hover-popover with interactive content fights against itself —
   the user must move the cursor onto the panel without losing it,
   *and* the panel content is interactive (so the user is expected
   to click things). The grace-period tolerance has to be generous
   to allow cursor traversal *and* avoid accidental dismissal mid-
   click. **Decision:** ship `'hover'` as a supported trigger event
   but with an explicit dev-mode warning when `kjTriggerEvent='hover'`
   *and* `[kjPopoverContent]` projects any focusable element. The
   warning text: "Hover-trigger popovers with interactive content
   are difficult to use accessibly. Consider `'click'` triggering or
   a `KjTooltip`." Power users who know what they're doing can
   suppress.

4. **`kjModal=true` but `kjCloseOnEsc=false` is invalid.** WCAG 2.1.2
   *No Keyboard Trap* requires Esc to leave a focus-trapped region.
   We override `kjCloseOnEsc=false → true` when `kjModal=true` with
   a dev warning. **Decision:** silent override + warning. If a
   consumer genuinely wants no-Esc-close in a modal popover, they
   should be using `[kjAlertDialog]` (which is allowed to be
   non-Esc-dismissable for "irreversible action confirmation" cases).

5. **`*kjPopoverContent` (structural) vs. `[kjPopoverContent]` (attribute).**
   v0 uses the attribute form, which forces inline-DOM rendering
   (and thus inherits clipping ancestors). v1 needs the structural
   form for portal mounting. **Decision:** ship structural form as
   the primary; keep attribute form as deprecated alias with dev-
   warning for one minor version, then remove. Document migration in
   the changelog.

6. **`[kjPopoverTriggerFor]` on a trigger that is *also* inside a
   `[kjPopover]`.** Ambiguous — which `KJ_POPOVER` context wins?
   **Decision:** if `kjPopoverTriggerFor` is set, the trigger
   directive provides its *own* `KJ_POPOVER` (overriding the outer
   one for itself and its descendants in the projected template);
   if not set, it inherits from the nearest ancestor `[kjPopover]`.
   Dev warning when both are present (likely consumer mistake).

7. **Outside-click on popover-inside-popover.** Common case: a popover
   contains a button that opens a second popover. Clicking outside
   the inner popover should close the inner one only, not also the
   outer. **Decision:** outside-click detection uses
   `event.composedPath()` and walks up checking each open popover's
   panel + trigger element registered in a global stack. The
   topmost-popover-whose-bounds-don't-contain-the-click-target
   closes; others stay open. Same stack pattern Dialog uses for
   nested-dialog Esc handling. The stack lives in
   `KjOverlayService` (or a new sibling singleton) so all anchored-
   overlay families share it.

8. **Scroll-lock implementation.** Modal popover applies
   `<body>` scroll-lock. The implementation: core sets
   `document.body.dataset.kjScrollLock = 'true'`; the wrapper CSS
   provides `body[data-kj-scroll-lock="true"] { overflow: hidden; padding-right: var(--scrollbar-width); }`.
   Multiple stacked modals coordinate via a counter so closing one
   doesn't release the lock while another is still open. Same
   primitive Dialog uses; lives in `KjOverlayService` (carved out
   alongside `KjAnchor`).

9. **`role="dialog"` for non-modal popover — APG compliance.** The
   APG Disclosure pattern strictly says no role on the disclosed
   region. We use `role="dialog"` + `aria-modal="false"` instead.
   Real-world AT testing (NVDA, JAWS, VoiceOver, TalkBack) shows
   this is *more* useful than role-less for anchored panels —
   announces panel boundary on entry, reads `aria-labelledby`. Radix
   takes the same position. **Decision:** stand by `role="dialog"`
   in both modes. Document the deviation from strict APG in TSDoc
   with rationale.

10. **`aria-haspopup` value when content has structured inner roles.**
    What if a consumer projects a `<ul role="listbox">` inside a
    `[kjPopoverContent]`? The trigger's `aria-haspopup="dialog"`
    suggests dialog semantics, but the content is effectively a
    listbox. **Decision:** the consumer chose the wrong primitive —
    they want `[kjSelect]` or `[kjCombobox]`, not a popover with a
    listbox inside. We do not auto-detect. The trigger's
    `aria-haspopup` stays `"dialog"`. Documented as anti-pattern in
    TSDoc with pointer to the right primitives.

11. **Auto-focus when no focusable child exists.** If the panel
    contains only static content (no buttons / inputs / links), we
    focus the panel itself (`tabindex="-1"` host attr). AT
    announces the panel boundary via the `dialog` role; the user
    presses Esc to leave. Edge case: a static-content popover
    triggered by hover. **Decision:** the no-focusable case is fine
    for click-triggered popovers; for hover-triggered popovers with
    no focusable children, the consumer should use a `KjTooltip`
    instead. Documented.

12. **Focus restoration when trigger is detached during open.** If
    the trigger element is removed from the DOM while the popover
    is open (e.g. its parent component re-renders a list), focus
    restoration on close has nowhere to go. **Decision:** focus
    falls back to `<body>` (matches dialog convention). Optionally
    consumers can override via `(kjCloseAutoFocus)="…"` to focus a
    sensible alternative. Documented with example.

13. **`(kjCloseRequested)` cancellation across nested popovers.**
    If two nested popovers close on a single Esc press (because the
    inner closes and bubbling Esc triggers the outer), the consumer
    might want to cancel one independently of the other. **Decision:**
    each popover fires its own `kjCloseRequested`; cancellation is
    per-popover; in modal mode Esc stops propagation (so only the
    innermost closes); in non-modal mode Esc bubbles (so both close
    in sequence, each cancellable independently). Mirrors the
    Tooltip §8.5 decision on Esc propagation.

14. **`PopoverAnchor` (decoupled anchor element).** Radix exposes a
    `<PopoverAnchor>` for anchoring the panel to a *different*
    element than the trigger. Use case: menubar where the trigger
    is a chevron but the panel should align to the parent button.
    **Decision:** defer to v2. The 80% case is "anchor to trigger";
    the decoupled case can be expressed in v1 by putting
    `[kjPopoverTrigger]` on the desired anchor element and a
    separate `(click)` handler on a chevron toggling `kjOpen`. Not
    pretty but works.

15. **Wrapper-imposed `max-width` and `KjAnchor` sizing.** The
    wrapper caps `max-width: min(20rem, calc(100vw - 1rem))` for
    Tooltip-like reflow. For Popover, content is often wider (a
    form). **Decision:** the wrapper caps `max-width: min(28rem,
    calc(100vw - 2rem))` for popovers. Consumers wanting wider
    panels can override via `kjPanelClass` or compose their own
    width. Document.

16. **SSR.** Same as Tooltip §8.10. `KjOverlayService` SSR-safe via
    `afterNextRender()`. Trigger ARIA wiring (`aria-haspopup`,
    `aria-expanded="false"`, `aria-controls`) is set in host
    bindings so renders on the server.

17. **`[kjPopover]` standalone usage.** It's tempting for consumers
    to use `[kjPopover]` *without* a trigger directive — e.g.
    binding `[(kjOpen)]` from a parent component. **Decision:** this
    is supported (the trigger-for shape already supports trigger-less
    operation; the compound shape can also operate trigger-less if
    `kjOpen` is bound). In trigger-less mode, focus-restoration
    falls back to `<body>` on close (no trigger captured). Document
    with example and warn that programmatic-only popovers should
    set `kjAriaLabel` since they have no obvious labelling source.

18. **Performance: outside-click listener stacking.** Each open
    popover adds a `document.pointerdown` listener. With many
    popovers (e.g. a row of icon buttons each with a popover), the
    listener count grows. **Decision:** use a single shared global
    `pointerdown` listener registered by the first opened popover
    and reference-counted as popovers open/close. Lives alongside
    the popover stack from §7. Implementation lives in
    `KjOverlayService` (or carved-out singleton).

19. **Touch on modal popover.** Outside-tap should close. Outside-
    *focus* doesn't apply on touch. **Decision:** same `pointerdown`-
    based detection works on touch; no additional handling needed.

20. **Animation / reduced motion.** Core does not animate.
    `data-state="open|closed"` reflection lets the wrapper apply
    enter/exit transitions. Wrapper guards on
    `@media (prefers-reduced-motion: reduce)`. The directive must
    *not* delay close for animation purposes — close is immediate
    at the directive level; the wrapper handles fade-out via CSS
    only (the `hidden` attribute applies on close, but the wrapper
    keeps the element visually animating-out via a sibling
    `data-state="closed"` selector that runs concurrent to `hidden`
    being applied). This is the same pattern Dialog uses.
