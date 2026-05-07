# Toggle / Switch

Reference architecture for the kouji-ui **Switch** — a binary on/off form
control rendered as a sliding thumb in a track. Semantically equivalent to a
[`Checkbox`](./checkbox.md) (single boolean), visually a slider. WAI-ARIA
`role="switch"`.

> **Naming alert — read this first.** The repository today has *two* things
> that the English word "toggle" can mean, and the existing `KjToggle`
> directive at `packages/core/src/toggle/toggle.ts` covers the *wrong one*
> for this analysis:
>
> - **Toggle button** — a regular `<button>` that flips between pressed and
>   unpressed (`aria-pressed`). shadcn calls this `Toggle`. Material calls it
>   `MatButtonToggle`. PrimeNG calls it `ToggleButton` /
>   `SelectButton`. **kouji already has it twice over:** the `kjPressed`
>   `ModelSignal<boolean | undefined>` on [`KjButton`](../actions/button.md)
>   and the standalone `KjToggle` directive plus the wrapper-in-flight at
>   `packages/components/src/toggle/toggle.ts`. Both produce
>   `aria-pressed`. They are **not** form controls — they have no
>   `KjFormControl` … wait — actually `KjToggle` *does* compose
>   `KjFormControl`. See [Decision: KjToggle's awkward middle
>   ground](#decision-kjtoggles-awkward-middle-ground) below.
> - **Switch (this document)** — a binary form control with a sliding-thumb
>   visual (`role="switch"`, `aria-checked`). PrimeNG names this
>   `ToggleSwitch` (renamed from `InputSwitch`). Material names it
>   `MatSlideToggle`. shadcn names it `Switch`.
>
> The two are not interchangeable: `aria-pressed` (button toggle) and
> `aria-checked` (switch / form control) are read by assistive technology in
> different contexts and are *not* aliases — see
> [WAI-ARIA `switch` role](https://www.w3.org/TR/wai-aria-1.2/#switch).
>
> **Decision in this analysis** — ship a new `KjSwitch` directive (the
> Switch) under `packages/core/src/switch/` and a `KjSwitchComponent`
> wrapper at `packages/components/src/switch/`. The existing `KjToggle`
> directive is renamed to `KjToggleButton` (selector `[kjToggleButton]`) and
> moved under `packages/core/src/toggle-button/` to align with shadcn's
> "Toggle" / Material's "Button Toggle". The wrapper-in-flight at
> `packages/components/src/toggle/toggle.ts` becomes
> `KjToggleButtonComponent` at the matching path. Old selectors stay as
> deprecated aliases until v1.0. See [Composition
> model](#composition-model) for the full file layout.
>
> The body of this analysis covers **Switch only** unless explicitly
> cross-referencing the Toggle Button.

## Source comparison

### PrimeNG — `<p-toggleswitch>` (formerly `<p-inputswitch>`)

- [primeng.org/toggleswitch](https://primeng.org/toggleswitch). Single
  component. `[(ngModel)]` / `[formControl]` bind a `boolean`. Inputs:
  `disabled`, `readonly`, `tabindex`, `inputId`, `name`, `falseValue`,
  `trueValue` (lets the model use any pair of values, not just
  `true`/`false`), `ariaLabel`, `ariaLabelledBy`, plus visual hooks
  `style`, `styleClass`. **Output:** `(onChange)` emits
  `{ originalEvent, checked }`. **No `(blur)` / `(focus)` outputs** —
  PrimeNG relies on the bound form control's touched state.
- The host element has `role="switch"`, `aria-checked` reflecting the
  current state, `tabindex="0"`. Space and Enter both toggle. Disabled
  state uses `aria-disabled` (not native `disabled`) and clears
  `tabindex` to `-1`.
- Styling: a track (`.p-toggleswitch-slider`) with a thumb
  (`.p-toggleswitch-handle`) animated via `transform: translateX()` on
  the `data-p-checked` attribute. Sizes are not first-class — consumers
  scale via CSS variables (`--p-toggleswitch-width` etc.).
- Form integration: PrimeNG uses Angular `ControlValueAccessor` directly
  on the component (registered with `NG_VALUE_ACCESSOR` multi-provider).

### Angular Material — `<mat-slide-toggle>`

- [material.angular.dev/components/slide-toggle](https://material.angular.dev/components/slide-toggle).
  Self-contained component. Renders a `<button role="switch">` (not a
  native checkbox), with the track and thumb as styled children of the
  button. The button is the focusable, labelable element.
- Inputs: `name`, `id`, `labelPosition` (`'before' | 'after'`), `ariaLabel`,
  `ariaLabelledby`, `ariaDescribedby`, `required`, `checked`, `disabled`,
  `disableRipple`, `tabIndex`, `color` (theme palette: primary / accent /
  warn), `hideIcon` (whether to render the inner check icon on the thumb
  in M3 themes). **Outputs:** `(change)` — `MatSlideToggleChange { source,
  checked }` — and `(toggleChange)` — fires before two-way `checked`
  updates.
- Implements `ControlValueAccessor` and registers with parent
  `<mat-form-field>` only when explicitly placed inside one (rare; the
  slide-toggle is normally not wrapped — its label is a sibling
  `<label>` projected inside the component template).
- Keyboard: `Space` toggles, `Enter` toggles (because the host is a
  `<button>` and both keys activate buttons natively). Arrow keys
  optionally toggle (Material binds Left → off, Right → on for
  consistency with the slider).
- Accessibility: `role="switch"`, `aria-checked` from the model. When
  disabled, `aria-disabled="true"` and the button's native `disabled`
  attribute is *not* set (Material's `disableRipple` is the only
  effect; the button stays in the tab order).

### shadcn/ui — `<Switch>`

- [ui.shadcn.com/docs/components/switch](https://ui.shadcn.com/docs/components/switch).
  React component built on Radix UI's
  [`@radix-ui/react-switch`](https://www.radix-ui.com/primitives/docs/components/switch)
  primitive. Renders a `<button role="switch">` with a child
  `<span data-state="checked|unchecked">` for the thumb. Same shape as
  Material — a button, not a checkbox.
- Props: `checked`, `defaultChecked`, `onCheckedChange(checked: boolean)`,
  `disabled`, `required`, `name`, `value`, plus standard HTML attrs.
  No size variants out of the box — sizes are theme-CSS only.
- Composes with shadcn's `<Form>` / `<FormField>` (react-hook-form
  bridge): `<FormField>` clones the projected switch and injects
  `id`, `aria-describedby`, `aria-invalid` via Radix's `<Slot>`.
- Keyboard: identical to Radix Switch — `Space` toggles, `Enter` does
  *not* toggle (Radix deliberately follows
  [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
  which lists Space as the only required key for switches; Material
  honors Enter because the host is a button and Enter is the native
  button-activation key).

### Pattern picked up

The shadcn / Material model — **render a `<button role="switch">`**, not a
native `<input type="checkbox">` re-skinned to look like a switch. Three
reasons:

1. Native `<input type="checkbox">` has `role="checkbox"` baked in; you
   cannot move it to `switch` without an explicit `role="switch"`
   attribute, which screen readers historically did not all support.
   Modern AT (NVDA 2020+, JAWS 2021+, VoiceOver iOS 14+) all read
   `role="switch"` correctly. **Use `role="switch"`** on a `<button>`.
2. A `<button role="switch">` has `Enter` and `Space` activation
   natively. A `<div role="switch" tabindex="0">` doesn't, and forces us
   to wire keyboard handlers.
3. The form value is owned by the `KjFormControl` host directive (as
   for [`KjCheckbox`](./checkbox.md)), not by a hidden native
   `<input>`. We don't need a native checkbox to participate in form
   serialization — Angular forms work via `ControlValueAccessor`, not
   form-data submission.

**One deviation from Material: Enter does not toggle.** WAI-ARIA APG
specifies Space only, and Radix matches that. Material's Enter handler
is a side-effect of the host being a `<button>` (browser default). We
don't fight the browser default — `<button>`'s native Enter activation
fires `click`, and we toggle on click — so in practice Enter *will*
toggle. We don't *advertise* it, and the keyboard contract documents
Space as the canonical key.

## Decision: needs a core directive?

**Yes — a new `KjSwitch` directive** at `packages/core/src/switch/switch.ts`.

The directive owns six contracts:

1. **`role="switch"` and `aria-checked` reflection.** A static `role` on
   the host plus `[attr.aria-checked]="kjChecked().toString()"`. The
   single most important difference from `KjButton`'s
   `aria-pressed` — switches are *form controls*, buttons are *actions*.
2. **`ControlValueAccessor` plumbing** via composed `KjFormControl` —
   exactly as `KjCheckbox` does. One signal (`kjChecked`) is the model;
   `(click)` and `(keydown.space)` call `notifyChange`; `(blur)` calls
   `notifyTouched`.
3. **Field registration.** Compose
   [`KjFormControl`](../../../packages/core/src/primitives/forms/form-control.ts)'s
   field-registration path (defined in [Field](./field.md), open
   question 2: option *a*) so Switch participates in `KjField`'s
   describedby chain, label-for, and required-mirror without consumer
   wiring. The `<label>` outside the switch points at the switch's
   id via `for=`.
4. **Disabled stance.** ARIA-disabled (`aria-disabled="true"` +
   `data-disabled`), button stays focusable. Capture-phase click
   suppression (copy-paste from `KjButton`). Native `disabled` is
   **not** set on the host `<button>`. WCAG 2.1 AAA: discoverable but
   blocked.
5. **Focus-visible.** Composed `KjFocusRing` — keyboard-only
   `data-focus-visible`.
6. **Keyboard contract.** `Space` is bound explicitly (matches
   APG; matches shadcn / Radix). `(click)` covers mouse, touch, and
   `Enter` (native `<button>` activation). No `Arrow` keys — those are
   for Slider, not Switch.

Items 1, 2, 4, 5, 6 are stateful screen-reader-facing contracts; item 3 is
cross-cutting. None of this is theme-specific styling, so a directive is
correct. A second styled wrapper component (`KjSwitchComponent`) renders
the track + thumb DOM and the optional inline label.

## Decision: KjToggle's awkward middle ground

The existing `KjToggle` directive is shaped like a press-button (sets
`aria-pressed`, no `role`, fires `(click)` to flip a `kjPressed` model)
**but** composes `KjFormControl` for form integration. That hybrid does
not match any source library:

- It is **not** a Switch — wrong role / wrong ARIA attribute.
- It is **almost** a Toggle Button (shadcn `Toggle`,
  Material `MatButtonToggle`, PrimeNG `ToggleButton`) — but those
  components do *not* register as form controls. `MatButtonToggle` is
  used inside `MatButtonToggleGroup` which is a single form control
  (the *group* implements CVA), not the buttons. shadcn `Toggle` has
  no form integration at all.
- It is **redundant** with `KjButton`'s `kjPressed` model. Anyone who
  wants a toggle button binds `[(kjPressed)]` on a regular
  `<button kjButton>`. There is nothing `KjToggle` does that
  `<button kjButton [(kjPressed)]>` does not, *except* CVA wiring —
  and CVA wiring is the exact thing a toggle button doesn't need.

**Decision.** Rename `KjToggle` → `KjToggleButton`, drop `KjFormControl`
from its `hostDirectives`, position it as the canonical answer for
"toggle button on its own" (when you can't or don't want to use
`KjButton` because you need a non-button host like a `<div>` chip in a
toolbar). Inside a toggle-button-group, it composes a future
`KjToggleButtonGroup` which *is* the form control.

This frees the name "toggle" for the cross-walk between Switch (which
end-user docs sometimes call "toggle") and Toggle Button. The Switch
sibling is `KjSwitch`, unambiguous.

The existing `[kjToggle]` selector and `<kj-toggle>` selector are kept
as deprecated aliases that resolve to `KjToggleButton` /
`KjToggleButtonComponent` until v1.0, with a dev-mode console warning.

## Base features

- **Variants (preset, configurable):** `default`, `success`, `destructive`.
  Open-set string. Extend via
  `provideKjSwitch({ variants: [...KJ_SWITCH_DEFAULTS.variants, 'brand'] })`.
  Match the [Button](../actions/button.md) preset config token shape.
- **Sizes (preset, configurable):** `sm`, `md`, `lg`. `md` is the
  default and **must** clear the WCAG 2.5.5 (AAA) 44×44 minimum touch
  target on the *track* (the track is the click region, not the thumb).
- **States:** `kjChecked` (model, the form value), `kjDisabled`
  (forwarded to `KjDisabled`), `kjReadonly` (PrimeNG ships it; useful
  for "show the value but don't let me toggle" — see [Open
  questions](#open-questions--risks)), `kjRequired` (manual override
  for non-`Validators.required` cases; mirrors Field's `kjFieldRequired`).
- **`kjTrueValue` / `kjFalseValue`** (PrimeNG). Lets the bound form
  value be e.g. `'enabled' | 'disabled'` or `1 | 0` instead of
  `true | false`. The directive maps DOM toggling onto these tokens.
  Useful for legacy server APIs. Not in Material or shadcn; *opt-in*
  via these two inputs (defaults `true` / `false`).
- **Slots (wrapper):** default `<ng-content>` for an inline label
  positioned via `kjLabelPosition` (`'before' | 'after'`, default
  `'after'`). Visually-hidden text for the on/off announcement is
  rendered automatically when the consumer projects no content (see
  [Accessibility](#accessibility-wcag-21-aaa)).
- **State model:** stateless besides `kjChecked` (model). Parent owns
  `disabled` / `readonly`; the directive only observes them.
- **Element flexibility:** the directive attaches to a `<button>`. We
  do **not** support attaching to `<div>` or `<input>`:
  - `<div>` requires manual `tabindex` / keyboard wiring — pointless
    when `<button>` does it for free.
  - `<input type="checkbox">` cannot have `role="switch"` reliably
    overridden in older AT and forces a hidden-input dance for
    custom visuals. The wrapper component renders a `<button>`
    internally; consumers using `[kjSwitch]` directly use it on a
    `<button>`.

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role** | core directive | `role="switch"` static on the host. Decision over `role="checkbox"`: `switch` is the modern AT-supported idiom (NVDA 2020+, JAWS 2021+, VoiceOver iOS 14+) and disambiguates from a literal checkbox visual. WCAG 4.1.2. |
| **`aria-checked`** | core directive | `[attr.aria-checked]="kjChecked().toString()"`. Always reflected (`'true' \| 'false'` — never `'mixed'`; switches don't have an indeterminate state). WCAG 4.1.2. |
| **Label association** | Field + `KjFieldLabel` (preferred), or `kjAriaLabel` | When wrapped in `<div kjField>` with `<label kjFieldLabel>`, the label's `for=` resolves to the switch's auto-minted id (Field owns the id minting; see [Field analysis](./field.md)). Outside a field, the wrapper accepts `kjAriaLabel` or projected content; with projected content, the wrapper auto-mints a label `<span id>` and points `aria-labelledby` at it. WCAG 1.3.1, 3.3.2, 4.1.2. |
| **`aria-describedby`** | Field | Switch participates in Field's describedby chain identically to [Input](./input.md) and [Checkbox](./checkbox.md) — `KjFormControl`'s field-registration path supplies the chain to the host. Standalone (no field), the consumer can set `aria-describedby` directly. WCAG 1.3.1. |
| **`aria-invalid`** | core directive | `[attr.aria-invalid]="formCtrl.touched() && kjInvalid() ? 'true' : null"`. Touched-gated, mirrors Input. Switches don't visually scream invalid often (a switch is normally not invalid in isolation; "you must accept the terms" is a common case where invalid + required apply). WCAG 3.3.1, 4.1.2. |
| **`aria-required`** | Field, fallback to `kjRequired` | Field auto-derives from `Validators.required`; standalone consumers set `kjRequired`. Reflected only when `true`. WCAG 3.3.2. |
| **`aria-disabled`** | composed `KjDisabled` | `aria-disabled="true"` + `data-disabled`. Native `<button>` `disabled` attribute is **not** set — switch stays focusable. Capture-phase click suppression mirrors [Button](../actions/button.md). WCAG 2.1.1, 2.4.7, 4.1.2. |
| **`aria-readonly`** | core directive | `[attr.aria-readonly]="kjReadonly() ? 'true' : null"`. Readonly switches reject toggling but are still focusable and announce as switches. WCAG 4.1.2. |
| **Keyboard contract** | core directive | `Space` toggles (host binding `(keydown.space)` with `preventDefault` + call `toggle()`). `Enter` toggles via the native `<button>` `click` activation (we listen to `(click)`). No arrow keys — those are for Slider, not Switch (matches APG). WCAG 2.1.1. |
| **Focus management** | n/a | Switches don't move focus on activation. Nothing to manage. |
| **Focus-visible** | composed `KjFocusRing` | Sets `data-focus-visible` only on keyboard focus. Wrapper CSS keys `:focus-visible` on the **track**, not the thumb. WCAG 2.4.7 AAA. |
| **Touch target ≥ 44×44** | wrapper CSS | The *track* (the `<button>` host) is the click region; size `md` produces ≥ 2.75rem block-size with adequate inline-size. Sizes `sm` is below 44×44 and is **opt-in only** for desktop-only contexts (mirrors PrimeNG: small switches exist but consumer accepts the trade-off). Doc explicitly. WCAG 2.5.5 AAA. |
| **Color/contrast** | themes layer | Track-off vs background: ≥ 3:1 (non-text). Track-on vs background: ≥ 3:1. Thumb vs track: ≥ 3:1. Thumb-icon (when shown) vs thumb: ≥ 4.5:1 (≥ 7:1 AAA). The "off" state cannot rely on color alone — the *thumb position* is the primary cue. WCAG 1.4.11 (non-text contrast), 1.4.1 (use of color). |
| **State cue beyond color** | core/wrapper | Position of the thumb (`translateX`) is the canonical state cue for sighted users; `aria-checked` is the cue for AT users. Optional thumb glyph (`✓` when on, blank when off — Material's M3 `hideIcon=false`) provides redundant non-text cue. Wrapper exposes `kjShowStateIcon` to opt-in. WCAG 1.4.1. |
| **Reduced motion** | wrapper CSS | Track-thumb transition (`transform`, `background-color`) must be wrapped in `@media (prefers-reduced-motion: reduce) { transition: none; }` in theme CSS. The transform still happens (the thumb still ends up on the right side); it just snaps. WCAG 2.3.3 AAA. |
| **State-change announcement** | n/a (handled by AT) | Toggling fires `aria-checked` change; AT announces "on" / "off" automatically. We do **not** add a manual `aria-live` region — that double-announces. WCAG 4.1.3. |
| **Visible state label** | wrapper, optional | Some products show a textual "On" / "Off" beside the switch. The wrapper exposes `kjStateLabels` (`{ on: string, off: string } \| undefined`) to render them inline as decorative spans (`aria-hidden="true"` because `aria-checked` already carries the semantics). Default `undefined` — no extra labels. |
| **Label click-to-toggle** | wrapper | When the wrapper renders an inline label (`<ng-content>`), clicking the label toggles the switch (mirrors `<label>` native semantics). Implemented by wrapping the entire host in a clickable region that forwards clicks to the inner `<button>` (the same pattern `KjCheckboxComponent` uses). WCAG 2.5.5 (effectively enlarges target). |

**Where each piece lives:**
- `role`, `aria-checked`, `aria-invalid`, `aria-readonly`, `aria-required`
  → on the **core directive** (`KjSwitch`).
- `aria-disabled` / `data-disabled` → on the composed
  `KjDisabled` host directive.
- `aria-label` / `aria-labelledby` → on the **host** when `kjAriaLabel`
  is set on the directive, or threaded through Field via
  `aria-labelledby`. The wrapper component drives both paths.
- `aria-describedby` → on the **host**, fed by Field's chain (same
  mechanism as `KjInput`).
- Visual state (`data-checked`, `data-size`, `data-variant`,
  `data-focus-visible`) → on the **host** (mix of core directive +
  preset host directives).
- Track / thumb DOM, transitions, optional glyph → in the **wrapper**.

## Composition model

```text
packages/core/src/
  switch/                       ← NEW
    switch.ts                   ← KjSwitch directive
    config.ts                   ← KJ_SWITCH_CONFIG token + KJ_SWITCH_DEFAULTS + provideKjSwitch
    switch.spec.ts
    switch.example.ts           ← core-only themed default example
    switch.retro.example.ts
    switch.finance.example.ts
    switch.sizes.example.ts
    index.ts

  toggle-button/                ← RENAMED from toggle/
    toggle-button.ts            ← KjToggleButton (was KjToggle, KjFormControl removed)
    toggle-button.spec.ts
    index.ts

  toggle/                       ← KEPT as deprecated alias shell until v1.0
    index.ts                    ← re-exports KjToggleButton as KjToggle, console.warn on dev-mode use

packages/components/src/
  switch/                       ← NEW
    switch.ts                   ← KjSwitchComponent
    switch.css
    switch.default.example.ts
    switch.checked.example.ts
    switch.disabled.example.ts
    switch.with-label.example.ts
    switch.in-field.example.ts
    switch.sizes.example.ts
    index.ts

  toggle-button/                ← RENAMED from toggle/
    toggle-button.ts            ← KjToggleButtonComponent
    toggle-button.css
    toggle-button.default.example.ts
    toggle-button.checked.example.ts
    toggle-button.disabled.example.ts
    toggle-button.with-label.example.ts
    index.ts

  toggle/                       ← KEPT as deprecated alias shell until v1.0
    index.ts                    ← re-exports KjToggleButtonComponent as KjToggleComponent
```

### `KjSwitch` directive

```ts
@Directive({
  selector: '[kjSwitch]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant,  inputs: ['kjVariant'] },
    { directive: KjSize,     inputs: ['kjSize'] },
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  providers: [...bindPresets(KJ_SWITCH_CONFIG)],
  host: {
    'role': 'switch',
    'type': 'button',                                  // when host is <button>; harmless attr otherwise
    '[attr.aria-checked]':  'kjChecked().toString()',
    '[attr.aria-invalid]':  'invalidAttr()',
    '[attr.aria-readonly]': 'kjReadonly() ? "true" : null',
    '[attr.aria-required]': 'kjRequired() ? "true" : null',
    '[attr.data-checked]':  'kjChecked() ? "" : null',
    '[attr.data-readonly]': 'kjReadonly() ? "" : null',
    '(click)':              'onClick($event)',
    '(keydown.space)':      'onSpace($event)',
    '(blur)':               'formCtrl.notifyTouched()',
  },
})
export class KjSwitch {
  readonly formCtrl = inject(KjFormControl);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Whether the switch is on. Two-way bindable via `[(kjChecked)]`. */
  readonly kjChecked = model<boolean>(false);

  /** Touched-gated invalid flag; mirrors KjInput. */
  readonly kjInvalid = input<boolean>(false);

  /** Read-only — toggling is rejected, but the switch stays focusable. */
  readonly kjReadonly = input<boolean>(false);

  /** Manual override when `Validators.required` isn't used (matches Field). */
  readonly kjRequired = input<boolean>(false);

  /** Form value emitted when on. Default `true`. */
  readonly kjTrueValue  = input<unknown>(true);
  /** Form value emitted when off. Default `false`. */
  readonly kjFalseValue = input<unknown>(false);

  protected readonly invalidAttr = computed(() =>
    this.formCtrl.touched() && this.kjInvalid() ? 'true' : null,
  );

  constructor() {
    // Capture-phase click suppression while disabled — same pattern as KjButton.
    afterNextRender(() => {
      this.el.nativeElement.addEventListener(
        'click',
        (event: Event) => {
          if (this.formCtrl.disabled() || this.kjReadonly()) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        },
        { capture: true },
      );
    });

    // Reflect Angular form-model writes back to kjChecked.
    effect(() => {
      const v = this.formCtrl.value();
      const next = v === this.kjTrueValue();
      if (next !== this.kjChecked()) this.kjChecked.set(next);
    });
  }

  /** @internal */
  onClick(_e: Event): void {
    if (this.formCtrl.disabled() || this.kjReadonly()) return;
    this.toggle();
  }

  /** @internal */
  onSpace(e: Event): void {
    if (this.formCtrl.disabled() || this.kjReadonly()) return;
    e.preventDefault();
    this.toggle();
  }

  private toggle(): void {
    const next = !this.kjChecked();
    this.kjChecked.set(next);
    this.formCtrl.notifyChange(next ? this.kjTrueValue() : this.kjFalseValue());
  }
}
```

### `KjSwitchComponent` (wrapper, selector `kj-switch`)

Renders the track + thumb DOM, the optional inline label, and forwards
inputs to the directive. Uses a `<button>` host for the directive; the
wrapper itself is a `<label>`-like region that captures clicks on the
inline label and forwards them to the inner button.

```ts
@Component({
  selector: 'kj-switch',
  standalone: true,
  imports: [KjSwitch],
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <span class="kj-switch-row" [attr.data-label-position]="labelPosition()" (click)="onRowClick($event)">
      @if (labelPosition() === 'before' && hasContent()) {
        <span class="kj-switch-label" [id]="labelId"><ng-content /></span>
      }
      <button
        #host
        kjSwitch
        type="button"
        class="kj-switch-track"
        [(kjChecked)]="checked"
        [kjDisabled]="disabled()"
        [kjReadonly]="readonly()"
        [kjRequired]="required()"
        [kjVariant]="variant()"
        [kjSize]="size()"
        [kjTrueValue]="trueValue()"
        [kjFalseValue]="falseValue()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-labelledby]="ariaLabelledBy() ?? (hasContent() ? labelId : null)"
      >
        <span class="kj-switch-thumb" aria-hidden="true">
          @if (showStateIcon()) {
            <span class="kj-switch-thumb-icon"></span>
          }
        </span>
        @if (stateLabels(); as labels) {
          <span class="kj-switch-state-label" aria-hidden="true">{{ checked() ? labels.on : labels.off }}</span>
        }
      </button>
      @if (labelPosition() === 'after' && hasContent()) {
        <span class="kj-switch-label" [id]="labelId"><ng-content /></span>
      }
    </span>
  `,
  styleUrl: './switch.css',
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'kj-switch', '[attr.data-disabled]': "disabled() ? '' : null" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSwitchComponent {
  readonly checked       = model<boolean>(false);
  readonly disabled      = input(false);
  readonly readonly      = input(false);
  readonly required      = input(false);
  readonly variant       = input<string>('default');
  readonly size          = input<'sm' | 'md' | 'lg'>('md');
  readonly labelPosition = input<'before' | 'after'>('after');
  readonly ariaLabel     = input<string | undefined>(undefined);
  readonly ariaLabelledBy = input<string | undefined>(undefined);
  readonly trueValue     = input<unknown>(true);
  readonly falseValue    = input<unknown>(false);
  readonly showStateIcon = input(false);
  readonly stateLabels   = input<{ on: string; off: string } | undefined>(undefined);

  protected readonly labelId = `kj-switch-${++switchIdCounter}`;

  // hasContent() — viewChild + nativeElement.childElementCount-style probe; or
  // signal-based content-children query. Default false; flips true when a slot
  // child is projected. (Implementation detail; see Open question #5.)
  protected readonly hasContent = signal(false);

  /** Forward label clicks to the inner button. The button itself bubbles
   *  through, so we early-return to avoid a double-toggle. */
  protected onRowClick(e: MouseEvent): void {
    if (this.disabled() || this.readonly()) return;
    const btn = this.host().nativeElement;
    if (e.target === btn || btn.contains(e.target as Node)) return;
    btn.click();
  }
}

let switchIdCounter = 0;
```

### `KjSwitchConfig` and `provideKjSwitch`

```ts
export interface KjSwitchConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

export const KJ_SWITCH_DEFAULTS: KjSwitchConfig = {
  variants: ['default', 'success', 'destructive'],
  sizes: ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
};

export const KJ_SWITCH_CONFIG = new InjectionToken<KjSwitchConfig>('kj.switch.config', {
  factory: () => KJ_SWITCH_DEFAULTS,
});

export function provideKjSwitch(config: Partial<KjSwitchConfig>): Provider[] {
  return [{ provide: KJ_SWITCH_CONFIG, useValue: { ...KJ_SWITCH_DEFAULTS, ...config } }];
}
```

Mirrors [`KJ_BUTTON_CONFIG`](../../../packages/core/src/button/config.ts)
exactly.

### Cross-component pointers

- **[`data-input/checkbox.md`](./checkbox.md)** — semantic equivalent
  (binary form value). Switch *is* a checkbox-shaped control with a
  switch role; `KjSwitch` and `KjCheckbox` share the same
  `KjFormControl` integration, the same `(blur)` / touched contract,
  and the same field-registration path. The differences are:
  (a) host element is `<button>` not a generic element with
  `tabindex`; (b) `role="switch"` not `role="checkbox"`;
  (c) no `indeterminate` state (switches are strictly binary —
  Material, PrimeNG, and shadcn all agree); (d) the visual is a
  sliding thumb, so the `data-checked` reflection drives a
  `transform` instead of a `::after` glyph. Anyone reading both
  analyses will notice the duplication — that's expected; the two
  components are deliberately parallel.
- **[`actions/button.md`](../actions/button.md)** — the `kjPressed`
  pattern is the reference for **toggle buttons**, *not* switches.
  Documenting this in both directions: Button's `kjPressed` covers
  the press-toggle semantic; this analysis explicitly rejects
  reusing `kjPressed` for the switch (different ARIA, different
  accessible name pattern, different visual). The capture-phase
  click suppression and the ARIA-disabled stance, on the other
  hand, are **copy-paste from Button** — same code path, same
  rationale.
- **[`data-input/field.md`](./field.md)** — Switch participates
  identically to Input / Checkbox. Field auto-mints the switch's
  `id`, wires `for=` on the label, registers describedby ids, and
  feeds `aria-required` / `aria-invalid` via the context. No
  Switch-specific Field code is needed — the shared
  `KjFormControl` registration path (Field's open question #2,
  option *a*) covers it. The label uses `<label kjFieldLabel>`
  with `for=`, **not** `aria-labelledby`, because the switch host
  is a `<button>` and `<label for>` works on `<button>` (per
  [HTML living standard](https://html.spec.whatwg.org/#the-label-element)).
- **[`data-input/form.md`](./form.md)** — Form-level orchestration
  (cross-field validators, submit handling) treats Switch as a
  regular form control. No Switch-specific behaviour at the Form
  layer.
- **[`data-input/input.md`](./input.md)** — Mirror this
  document's preset config token + `provideKjSwitch` shape;
  Input's analysis flags the same as a planned improvement
  (`KJ_INPUT_CONFIG` + `provideKjInput`). Switch ships the
  pattern from day 1.
- **`primitives/forms/form-control.ts`** — Switch consumes the
  same `KjFormControl` signals (`disabled`, `touched`, `value`)
  every other form control consumes. The `value` is the form
  value (not the boolean); the `kjChecked` model is the visual
  state. The `effect()` in `KjSwitch` keeps them in sync via
  `kjTrueValue` / `kjFalseValue`.
- **`primitives/interaction/disabled.ts`,
  `primitives/interaction/focus-ring.ts`** — composed unchanged.
- **`primitives/a11y/aria-describedby.ts`** (planned, see
  Field analysis) — when shipped, Switch's host carries the
  field's describedby chain via `KjAriaDescribedBy`.

## Inputs / Outputs / Models — `kj`-prefixed

### Core directive (`KjSwitch`, selector `[kjSwitch]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjChecked` | `model` | `boolean` | `false` | The visual on/off state. Two-way bindable. The form value emitted is `kjTrueValue` / `kjFalseValue`, not the boolean directly. |
| `kjInvalid` | `input` | `boolean` | `false` | Touched-gated; reflects `aria-invalid`. Field feeds this via context when present. |
| `kjReadonly` | `input` | `boolean` | `false` | Reflects `aria-readonly`. Toggling rejected; focusable. |
| `kjRequired` | `input` | `boolean` | `false` | Reflects `aria-required`. Field feeds this via context when `Validators.required` is on the bound `NgControl`. |
| `kjTrueValue` | `input` | `unknown` | `true` | Form value emitted when on. PrimeNG-style mapping. |
| `kjFalseValue` | `input` | `unknown` | `false` | Form value emitted when off. |
| `kjDisabled` | forwarded via `hostDirectives` to `KjDisabled` | `boolean` | `false` | Reflects `aria-disabled` / `data-disabled`. Click suppressed in capture phase. |
| `kjVariant` | forwarded via `hostDirectives` to `KjVariant` | `string` | `'default'` | Validated against `KJ_SWITCH_CONFIG.variants`. |
| `kjSize` | forwarded via `hostDirectives` to `KjSize` | `string` | `'md'` | Validated against `KJ_SWITCH_CONFIG.sizes`. |

No outputs on the directive. Bidirectional value flow is via
`KjFormControl`'s `[(ngModel)]` / `[formControl]`, plus the
`[(kjChecked)]` model for non-forms callers — same pattern as
`KjCheckbox`.

### Wrapper component (`KjSwitchComponent`, selector `kj-switch`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `checked` | `model` | `boolean` | `false` | Forwarded as `[(kjChecked)]`. **TODO: rename to `kjChecked` per `rules/code_style.md` (kj-prefix mandatory). Document and rename pre-v1 alongside the [Checkbox/Toggle wrapper rename](#open-questions--risks) (matches the `KjCheckboxComponent` open question).** |
| `disabled` | `input` | `boolean` | `false` | **TODO: rename to `kjDisabled`.** |
| `readonly` | `input` | `boolean` | `false` | **TODO: rename to `kjReadonly`.** |
| `required` | `input` | `boolean` | `false` | **TODO: rename to `kjRequired`.** |
| `variant` | `input` | `string` | `'default'` | **TODO: rename to `kjVariant`.** |
| `size` | `input` | `'sm' \| 'md' \| 'lg'` | `'md'` | **TODO: rename to `kjSize`.** |
| `labelPosition` | `input` | `'before' \| 'after'` | `'after'` | **TODO: rename to `kjLabelPosition`.** |
| `ariaLabel` | `input` | `string \| undefined` | `undefined` | **TODO: rename to `kjAriaLabel`.** |
| `ariaLabelledBy` | `input` | `string \| undefined` | `undefined` | **TODO: rename to `kjAriaLabelledBy`.** |
| `trueValue` | `input` | `unknown` | `true` | **TODO: rename to `kjTrueValue`.** |
| `falseValue` | `input` | `unknown` | `false` | **TODO: rename to `kjFalseValue`.** |
| `showStateIcon` | `input` | `boolean` | `false` | **TODO: rename to `kjShowStateIcon`.** Renders an inner ✓/blank glyph on the thumb (Material M3 `hideIcon=false`). |
| `stateLabels` | `input` | `{ on: string; off: string } \| undefined` | `undefined` | **TODO: rename to `kjStateLabels`.** Decorative inline state text; `aria-hidden`. |

Per `rules/code_style.md` shape (A): the directive selector already
starts with `kj`, so property names carry the prefix.

## Examples to ship

Match the structure under `packages/components/src/checkbox/` and
`packages/components/src/button/`.

### Wrapper (`packages/components/src/switch/`)

1. **Default** — `switch.default.example.ts`. Single switch, `[(checked)]`
   bound to a signal. The minimal recipe.
2. **Checked** — `switch.checked.example.ts`. Pre-toggled; demonstrates
   the on-state DOM and `data-checked` styling.
3. **Disabled** — `switch.disabled.example.ts`. Both off-and-disabled
   and on-and-disabled — common in UI ("this setting is locked").
4. **With label** — `switch.with-label.example.ts`. Inline label after
   the track; click on label toggles.
5. **In a field** — `switch.in-field.example.ts`. `<div kjField>` with
   `<label kjFieldLabel>` above (or `kjFieldLabelPosition="start"`).
   Demonstrates the canonical Field composition for a Switch.
6. **Sizes** — `switch.sizes.example.ts`. `sm` / `md` / `lg` side by
   side, with the `sm` variant flagged "desktop-only" in copy.
7. **Reactive form** — `switch.reactive.example.ts`. `[formControl]`
   binding, `Validators.requiredTrue` (e.g. "I accept the terms"),
   touched-gated error rendering through `KjFieldError`.
8. **Custom values** — `switch.custom-values.example.ts`.
   `kjTrueValue="enabled"` / `kjFalseValue="disabled"` so the form
   emits string tokens instead of booleans.
9. **State icon** — `switch.state-icon.example.ts`.
   `kjShowStateIcon=true` renders the on-thumb checkmark.
10. **State labels** — `switch.state-labels.example.ts`. Decorative
    "On" / "Off" text alongside the track (Material's M3 inline label
    look).

### Core-only (`packages/core/src/switch/`)

11. **Default themed** — `switch.example.ts`. The headless directive
    on a `<button>` with default-theme CSS in the example styles.
    Documents the no-wrapper recipe.
12. **Retro themed** — `switch.retro.example.ts`. Square 80s-style
    track + thumb; demonstrates that all visual state is owned by
    theme CSS targeting `data-checked` / `data-size` / `data-variant`.
13. **Finance themed** — `switch.finance.example.ts`. Compact slim
    track for dense data tables.
14. **Sizes** — `switch.sizes.example.ts`. Same layout as the
    wrapper's sizes example; demonstrates `KjSize` integration.

## Open questions / risks

1. **`role="switch"` AT support floor.** NVDA 2020.4+, JAWS 2021+,
   VoiceOver iOS 14+ all read `role="switch"` correctly with
   "switch" or "toggle" verbiage. Older AT (NVDA 2018, IE 11 + JAWS)
   announces the host as a button only and may miss the
   `aria-checked` pair. Decision: **target the modern AT floor**
   (kouji's stated WCAG 2.1 AAA stance presumes modern AT). Document
   the floor in `rules/accessibility.md`. Rejection alternative —
   `role="checkbox"` on a non-`<input>` element — would lose the
   "switch" verbiage (some users specifically benefit from "switch"
   announcement to distinguish from list-of-things checkboxes). Stay
   on `switch`.

2. **`kjPressed` reuse on `KjButton` for switch UX.** Tempting, but
   wrong:
   - `kjPressed` reflects `aria-pressed` (button toggle), not
     `aria-checked` (form control). They are not aliases — APG and
     WAI-ARIA assign them to different patterns. Same announcement
     in some AT, different in others.
   - `KjButton` does not compose `KjFormControl`. Switches are
     form controls.
   - The visual contract differs: a press-toggle's "pressed" state
     is depressed-button styling; a switch's "checked" state is
     thumb-on-the-right styling. Themeable from the same flag
     (`data-pressed` vs `data-checked`), but using `data-pressed`
     for a switch crosses the wires for any consumer reading
     theme CSS.
   **Decision: ship `KjSwitch` separately.** Documented above.

3. **Rename `KjToggle` → `KjToggleButton`.** Risky for any consumer
   who already binds `[kjToggle]`. Mitigation:
   - Keep the `[kjToggle]` selector as a deprecated alias on
     `KjToggleButton`; ship a dev-mode `console.warn` (one-shot per
     instance) when used.
   - Update the spec to assert both selectors work; add a "use
     `[kjToggleButton]` instead" test message.
   - Remove the alias at v1.0. The library is still in alpha
     ([rules/stack.md](../../../rules/stack.md) — pre-1.0 API
     latitude); the rename earns the right name forever.
   The alternative — leaving `KjToggle` as is — perpetuates the
   "what does toggle mean here?" confusion and forces every future
   contributor to re-derive the answer. Bite the bullet now.

4. **`<button>` as the only supported host.** Decision: yes, only
   `<button>`. Rejecting `<div role="switch" tabindex="0">` because
   it requires re-implementing every browser-native button
   behaviour (Space activation timing, Enter activation, click
   targeting on inner spans, focus-ring defaults). Rejecting
   `<input type="checkbox">` because:
   - The custom visual requires hiding the input and styling a
     sibling, which is brittle and forces a `<label>`-wrapping
     dance.
   - `role="switch"` on a `<input type="checkbox">` is technically
     valid HTML but the role override is the *least* well-supported
     overlap in older AT.
   - The form-data submission angle — the only thing native
     `<input type="checkbox">` gives us — doesn't apply: kouji uses
     `KjFormControl` / `ControlValueAccessor`, not form-data.

5. **`hasContent()` detection in the wrapper.** The wrapper needs
   to know whether `<ng-content>` was filled to decide:
   - Whether to render the `<span class="kj-switch-label">` element
     at all (don't render it empty — it would still take up a flex
     slot).
   - Whether to wire `aria-labelledby` to the label or fall back
     to `kjAriaLabel`.
   Two options:
   (a) `contentChild(TemplateRef)` — fragile, doesn't catch raw text.
   (b) `viewChild` on the label `<span>` and read
       `nativeElement.childNodes.length` after `afterNextRender`.
   Recommendation: (b). Set the signal once after the first render;
   re-check on `ngContentChanges` is unnecessary because slot
   content rarely changes dynamically in practice.
   Alternative: **always** render the label `<span>` and let CSS
   `:empty { display: none }` handle it, no signal needed. Simpler.
   Decision: **CSS `:empty` first**; promote to (b) only if the
   `aria-labelledby` fallback proves to be a real bug.

6. **`kjReadonly` semantics.** PrimeNG ships it; Material does not.
   Use case: "show the user's current preference but block toggling
   from this view (e.g. they need to navigate to settings to
   change)". Implementation: reject toggle in capture phase
   (`onClick` / `onSpace` early-return), set `aria-readonly`. The
   trickier question: does `aria-readonly` make sense on a
   `role="switch"`? WAI-ARIA's spec lists `aria-readonly` as
   supported on `switch`. Some AT may not announce it — verify on
   NVDA / JAWS / VoiceOver. Document the verification in the
   directive's TSDoc.

7. **`kjTrueValue` / `kjFalseValue` and Angular forms `setValue` /
   `patchValue`.** When the form-side calls
   `formControl.setValue('enabled')` and `kjTrueValue='enabled'`,
   the directive's `effect()` correctly flips `kjChecked` to
   `true`. When it calls `setValue('off')` (a value that matches
   neither true nor false), what happens? Recommendation: treat
   any value that strictly equals `kjTrueValue` as on; everything
   else as off. Document. Mirrors PrimeNG.

8. **`<label for="…">` on a `<button>` — does it work?** Per the
   [HTML spec](https://html.spec.whatwg.org/#the-label-element),
   `<label for>` may target *labelable* elements:
   button, input (not all types), meter, output, progress, select,
   textarea. **`<button>` is labelable.** Click-on-label fires
   `click` on the button. This is what we rely on for Field-driven
   labelling.

9. **Inline label position vs Field label position.** The wrapper
   has `kjLabelPosition` (the inline label, after the track by
   default), which is independent of `kjFieldLabelPosition` on
   Field (the Field's external label, top by default). Inside a
   Field, prefer the Field label and leave the wrapper's slot
   empty — two labels for the same control is an a11y anti-pattern
   (Field's open question #8). Document.

10. **Keyboard: arrow keys?** APG says no; Material binds them
    (Right/Up = on, Left/Down = off) for slider-consistent UX.
    PrimeNG doesn't. shadcn / Radix doesn't. Decision: **don't
    bind**. Consumers who want them can add `(keydown.arrowRight)`
    on the host. Rationale: arrow-key toggling on a binary control
    is non-discoverable and inconsistent with checkbox (which is
    semantically the same and doesn't take arrows). Document.

11. **Touch target on `sm`.** WCAG 2.5.5 AAA target is 44×44.
    `sm` is intentionally smaller (desktop-only dense forms,
    settings tables). Document the trade-off in the wrapper's
    TSDoc and in the size-example's copy. Apps targeting AAA on
    mobile must use `md` / `lg`. Material's M3 spec also notes
    a similar trade-off for compact density.

12. **Animation on first render under SSR.** The thumb's
    `transform` transition can fire on hydration if the
    server-rendered DOM has `data-checked=""` and the client
    setup re-applies the same attribute (no transition in theory;
    in practice some stacks see a "flash"). Mitigation: theme CSS
    should disable transitions on the very first frame —
    `.kj-switch-track:not([data-hydrated]) .kj-switch-thumb {
    transition: none; }`, with the directive flipping
    `data-hydrated` in `afterNextRender`. Document in the
    switch-token spec.

13. **Required + checkbox-style contract.** `Validators.required`
    on a `boolean` form control is satisfied by *any* truthy
    value, including `false`. For "you must accept the terms",
    the right validator is `Validators.requiredTrue`. The Field
    auto-derivation reads `hasValidator(Validators.required)`;
    for `requiredTrue` it falls through. Add a follow-up in
    Field's analysis to also check `hasValidator(Validators.requiredTrue)`.
    Until then, consumers using `requiredTrue` set
    `kjFieldRequired` manually.

14. **`name` attribute and form serialization.** Some apps still
    use `<form action="…">` POST with native form-data
    serialization (rare but real). Switch is not a native input,
    so it does not serialize. PrimeNG ships a hidden
    `<input type="hidden" [name]>` mirror inside the component
    for this exact reason. Decision: **defer.** Apps that need
    server-side form-data use Angular forms + a fetch / HTTP
    client; the kouji-ui stance ([rules/stack.md](../../../rules/stack.md))
    presumes Angular reactive forms. Document as a known gap;
    revisit if a real consumer needs it.

15. **Color-only state cue.** WCAG 1.4.1 prohibits using color
    alone to convey state. The thumb position is the primary
    non-color cue (left = off, right = on). Theme authors must
    not over-rely on color (e.g. red-track-off vs green-track-on
    with no position change) — the position must move. Document
    as a hard requirement in the switch-token spec.

16. **Indeterminate state.** Switches do not support
    indeterminate (Material, PrimeNG, shadcn all agree). If a
    consumer asks for "the user has not yet decided" UX, they
    should use a `KjCheckbox` with `[indeterminate]` instead.
    Document.

17. **Clicking the inline label when `kjReadonly=true`.** The
    wrapper's `onRowClick` early-returns on disabled but should
    also early-return on readonly — same as the directive's
    `onClick`. Implemented above. Note in the spec.

18. **Spec coverage.** Mirror `KjCheckbox`'s spec
    (`packages/core/src/checkbox/checkbox.spec.ts`) plus extras:
    - `aria-checked` reflects the model.
    - Space toggles; Enter toggles; Tab does not toggle.
    - `aria-disabled`/`data-disabled` set when disabled, native
      `disabled` not set.
    - Click in capture phase suppressed when disabled / readonly.
    - `kjTrueValue` / `kjFalseValue` map correctly to the form
      value in both directions.
    - `axe` audit passes on default and disabled states.
    - Spec for the `KjToggleButton` rename: old `[kjToggle]`
      selector still works, console.warn fires once, new
      `[kjToggleButton]` selector is the canonical path.

19. **Component dependency on Field for full a11y.** Outside a
    Field, the wrapper's `kjAriaLabel` / `kjAriaLabelledBy` /
    projected-content paths are sufficient. Inside a Field, the
    Field handles `id` / `for=` / describedby / required /
    invalid. Document both recipes; the in-field path is the
    recommended one for "real" forms.
