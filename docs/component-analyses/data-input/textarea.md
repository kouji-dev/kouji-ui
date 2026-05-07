# Textarea

Reference architecture for the kouji-ui Textarea — a multi-line text input.
Not yet shipped. The closely related `KjInput` directive
(`packages/core/src/input/input.ts`) is the foundational pattern; this
analysis decides how much of it Textarea reuses, where it must diverge, and
where the auto-resize behaviour should live.

## Source comparison

- **PrimeNG** — [primeng.org/textarea](https://primeng.org/textarea). Ships
  a dedicated `pTextarea` directive on `<textarea>`. Inputs: `autoResize`
  (boolean), `variant` (`outlined` | `filled`), `pSize` (`small` | `large`),
  `invalid`, plus all native `<textarea>` attributes (`rows`, `cols`,
  `maxlength`, `minlength`, `placeholder`, `disabled`, `readonly`).
  Auto-resize is implemented inside the directive itself (no separate
  directive): on every `input` event it resets `style.height = 'auto'` and
  then measures `scrollHeight`. `rows` / native height bounds become the
  minimum; max-height is left to CSS. Form integration is the standard
  Angular CVA on the underlying `<textarea>`.
- **Angular Material** — [material.angular.dev/components/input](https://material.angular.dev/components/input).
  **Reuses `MatInput`.** The same `matInput` selector matches `<input>` and
  `<textarea>`; nothing is textarea-specific in the directive. Auto-resize
  is a **separate concern** shipped as `cdkTextareaAutosize` from
  `@angular/cdk/text-field` with `cdkAutosizeMinRows` / `cdkAutosizeMaxRows`
  inputs. Ships a small `TextFieldModule` that includes a hidden mirror /
  shadow textarea trick to measure intrinsic height without flicker.
  Character counter is **not** built into the directive — it lives on
  `<mat-form-field>` as `<mat-hint align="end">`, manually wired by the
  consumer to `formControl.value.length`.
- **shadcn/ui** — [ui.shadcn.com/docs/components/textarea](https://ui.shadcn.com/docs/components/textarea).
  A single `<Textarea>` React component that is just `<textarea>` plus
  Tailwind classes. No auto-resize, no min/max rows, no character counter
  baked in — all of those are recipes the consumer composes (the docs show
  pairing with `react-textarea-autosize` or a manual ref-based hook).
  Variant surface is empty: just the className-driven default look.

**Pattern picked up:** Material's split is the cleanest — one input
directive that works on `<input>` **and** `<textarea>`, auto-resize as a
separately-composable directive. PrimeNG's all-in-one directive is simpler
to consume but couples sizing logic to the form-control logic. shadcn's
"just a styled element" stance shows the minimum viable surface.

## Decision: needs a core directive?

Two questions, two answers.

### 1. Reuse `KjInput` or ship a new `KjTextarea`?

**Reuse `KjInput`. Broaden its selector.** Today the directive is selected
by `[kjInput]`, and the field is typed
`ElementRef<HTMLInputElement>`. Three concrete things change so the same
directive attaches to a `<textarea>`:

1. **Selector** stays `[kjInput]` — it's an attribute selector, not a tag
   match, so `<textarea kjInput>` already binds. **No selector change
   required.** This matches Material's stance and keeps the public API
   surface a single token.
2. **Element typing** widens from `ElementRef<HTMLInputElement>` to
   `ElementRef<HTMLInputElement | HTMLTextAreaElement>`. The constructor's
   value-reflection `effect()` (`this.el.nativeElement.value = String(val)`)
   is identical on both elements — `value` is a string property on both.
3. **Host binding for `(input)`** — already uses
   `$any($event.target).value`, which works for both element types.

Everything else — `aria-invalid`, `data-invalid`, native `disabled`
reflection, blur-touched, the `KjFormControl` host directive, the
`KjFocusRing` host directive, and the `KjDisabled` host directive — is
identical for the two elements. There is **no behaviour worth duplicating**
into a separate `KjTextarea`. A second directive would be a maintenance
burden with no offsetting benefit.

What we **don't** do: rename to `[kjTextField]` or similar. The selector is
already in the field. Rename costs all consumers; broadening the typing
costs nothing.

### 2. Does auto-resize belong in `KjInput` or a separate directive?

**Separate directive: `KjAutoresize` in `packages/core/src/primitives/forms/`.**
Three reasons.

1. **Single responsibility.** `KjInput` is form-integration plus
   focus / disabled / invalid reflection. Auto-resize is geometry — it
   reads `scrollHeight` and writes `style.height`. Mixing the two means
   every `<input kjInput>` carries dead measurement code, and every test
   for forms behaviour sees a directive that also touches CSS height.
2. **Opt-in, not on by default.** Most textareas use a fixed `rows="4"`
   shape. Auto-resize is the minority case. Putting it behind a separate
   directive keeps the default behaviour fast and surprise-free.
3. **Reusable beyond textareas.** `<div contenteditable kjAutoresize>` is
   a plausible future use; binding the logic to a form-control directive
   blocks that.

The selector pattern matches Material's CDK split (`matInput` +
`cdkTextareaAutosize`) without the CDK dependency.

```html
<!-- fixed-rows: just kjInput -->
<textarea kjInput rows="4" [formControl]="bio"></textarea>

<!-- auto-grow: opt in -->
<textarea kjInput kjAutoresize [kjMinRows]="2" [kjMaxRows]="8"
          [formControl]="bio"></textarea>
```

`KjAutoresize` is a leaf primitive (like `KjFocusRing`, `KjDisabled`) — no
public API beyond its inputs, no state, no context. It fits the
"primitives" folder.

## Base features

### Reused from `KjInput` (no new surface)

- **Form integration:** `formControl`, `formControlName`, `ngModel`. CVA
  via `KjFormControl` host directive.
- **`kjInvalid`:** `input<boolean>(false)`. Combined with `formCtrl.touched()`
  to drive `aria-invalid` / `data-invalid`.
- **`kjDisabled`:** forwarded via `KjDisabled` host directive. Sets
  `aria-disabled` + `data-disabled` and also reflects native `disabled`
  via the existing `[attr.disabled]` host binding.
- **Focus-visible:** `KjFocusRing` host directive — keyboard-only
  `data-focus-visible`.
- **Value reflection:** the constructor `effect()` writes the form-control
  signal back to `nativeElement.value`. Works unchanged on `<textarea>`.

### New on the wrapper (`KjTextareaComponent`, selector `kj-textarea`)

| Feature | Type | Default | Notes |
|---|---|---|---|
| `kjRows` | `input<number>(3)` | `3` | Bound to native `<textarea [rows]>`. Acts as the visual default and the auto-resize floor when `KjAutoresize` is **not** applied. |
| `kjPlaceholder` | `input<string>('')` | `''` | Mirrors `KjInputComponent.placeholder`. |
| `kjValue` | `input<string>('')` | `''` | Uncontrolled fallback; templated forms use `[(ngModel)]` / `[formControl]`. Mirrors Input. |
| `kjInvalid` | `input<boolean>(false)` | `false` | Forwarded to `[kjInvalid]` on the inner `<textarea>`. |
| `kjDisabled` | `input<boolean>(false)` | `false` | Forwarded to `[kjDisabled]`. |
| `kjResize` | `input<'none' \| 'vertical' \| 'horizontal' \| 'both'>('vertical')` | `'vertical'` | CSS `resize` value, exposed as a `data-resize` attribute the wrapper CSS reads. **Mutually exclusive** with `kjAutoresize` — when auto-resize is on, the wrapper sets `resize: none` regardless. |
| `kjAutoresize` | `input<boolean>(false)` | `false` | When `true`, the wrapper applies the `kjAutoresize` directive and **disables the user-drag handle**. |
| `kjMinRows` | `input<number \| undefined>(undefined)` | `undefined` | Forwarded to `KjAutoresize` only when `kjAutoresize === true`. Falls back to `kjRows` if unset. |
| `kjMaxRows` | `input<number \| undefined>(undefined)` | `undefined` | Forwarded to `KjAutoresize`. No upper bound when unset (browser default; user can scroll inside). |
| `kjMaxLength` | `input<number \| undefined>(undefined)` | `undefined` | Bound to native `[maxlength]`. Drives the optional counter. |
| `kjShowCounter` | `input<boolean>(false)` | `false` | When `true`, the wrapper renders `{ length } / { kjMaxLength }` below the textarea, wired to `KjLiveRegion` for screen-reader announcement. **Requires `kjMaxLength`.** Console-warn in dev if `kjShowCounter && !kjMaxLength`. |

The wrapper is element-wrapper-with-`display: contents` exactly like
`KjInputComponent`, except the projected element is `<textarea>` instead of
`<input>`.

### `KjAutoresize` directive (new primitive)

| Input | Type | Default | Notes |
|---|---|---|---|
| `kjMinRows` | `input<number>(1)` | `1` | Computes minimum height in pixels from the textarea's `lineHeight` × rows + paddings + borders. |
| `kjMaxRows` | `input<number \| undefined>(undefined)` | `undefined` | Same calculation for max. Beyond max, sets `overflow-y: auto`. |

Behaviour:

- On every `input` event and on `kjValue` changes (effect): set
  `style.height = 'auto'` (collapse), read `scrollHeight`, clamp to
  `[minHeight, maxHeight]`, set `style.height = clamped + 'px'`.
- On window `resize`: re-measure (font metrics may change with
  fluid type).
- Sets `[style.resize]="'none'"` and `[style.overflow-y]` (`auto` when
  capped, `hidden` otherwise) — auto-resize and the user drag handle don't
  mix; allowing both produces drift the next time the user types.
- Uses `afterNextRender()` for the first measurement (SSR-safe; `scrollHeight`
  is `0` in node environments).

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role** | DOM | Native `<textarea>`. No explicit `role`. |
| **`aria-invalid`** | `KjInput` (reused) | `[attr.aria-invalid]="formCtrl.touched() && kjInvalid() ? 'true' : null"`. Identical to Input. |
| **`aria-disabled`** | `KjDisabled` host directive | Reflects `kjDisabled()`. Native `disabled` is also set via `[attr.disabled]` (see Input contract). |
| **`aria-describedby`** | wrapper / consumer | When `kjShowCounter` is on, the wrapper composes the counter element's `id` into `aria-describedby` via `KjAriaDescribedby` (`packages/core/src/a11y/aria-describedby.ts`). For helper text / error messages, the **Field** wrapper (`data-input/field.md`) owns the `aria-describedby` plumbing — Textarea defers to it. |
| **`aria-multiline`** | not set | Default for `<textarea>` is `aria-multiline="true"`; AT defaults handle it. |
| **Label** | consumer / Field wrapper | `<label for="…">` or `<kj-field>` wrapping. Required for WCAG 1.3.1 / 4.1.2. Same posture as Input. |
| **Counter announcement** | wrapper | The character-counter element is rendered with `kjLiveRegion` `kjPoliteness="polite"`. Update text only on **threshold crossings** (e.g. ≤ 20 chars remaining, ≤ 0) rather than on every keystroke — announcing "199 / 200, 198 / 200, …" is hostile. Pattern documented inline. |
| **Focus-visible** | `KjFocusRing` (host directive on `KjInput`) | `data-focus-visible` reflected on the textarea. Wrapper CSS keys `:focus-visible` for the outline. |
| **Keyboard contract** | native | `<textarea>` is fully native: `Enter` inserts a newline (does **not** submit a parent form — this is the documented difference vs. Input); `Tab` moves focus **out** of the textarea (does not insert a tab character). No custom keys. |
| **Touch target ≥ 44×44** | wrapper CSS | `kjRows` defaults to `3`; min-height computed from line-height ensures ≥ 44 px even at the smallest theme size. Auto-resize floor (`kjMinRows`) defaults to `1` but the wrapper enforces a `min-height: 2.75rem` floor in CSS independent of rows. |
| **Resize handle visible** | wrapper CSS | Default `resize: vertical`. Handle is theme-styled but present — users can manually grow the field. Disabled when `kjAutoresize` is on. |
| **Contrast** | themes layer | Same `--kj-color-base-*` tokens as Input; ≥ 7:1 on filled state, validated per theme. |
| **`maxlength` truncation** | native | When `kjMaxLength` is set, native truncation applies. AT users hear an audible "limit reached" via the counter live region (when shown). When the counter is not shown, **silent** truncation is the failure mode — recommend always pairing `kjMaxLength` with `kjShowCounter` or a Field hint. Documented as a guideline, not enforced. |

**Where it lives:** all stateful a11y attributes (`aria-invalid`,
`aria-disabled`, `data-invalid`, focus-visible) live on `KjInput` —
reused as-is. The textarea-only additions (counter live region,
`aria-describedby` for the counter) live on the wrapper, because they're
visual + theme-controlled. `KjAutoresize` itself sets no ARIA — it's pure
geometry.

## Composition model

**No new core directive.** Textarea reuses `KjInput` directly. The wrapper
composes a new primitive (`KjAutoresize`) and reuses an existing one
(`KjLiveRegion`).

Effective directive stack on `<textarea kjInput>`:

```text
KjInput
  └─ hostDirectives:
       KjDisabled         (kjDisabled passthrough)
       KjFocusRing
       KjFormControl      (CVA — provides NG_VALUE_ACCESSOR)
```

Effective stack on the wrapper-rendered textarea when `kjAutoresize` is on:

```text
KjInput   +   KjAutoresize  +  KjAriaDescribedby (when counter is on)
```

`KjAutoresize` does **not** compose any other primitive. It's a leaf.

**No injection-token context.** Textarea is a leaf control like Input.
There is no parent / child relationship to mediate.

**Cross-component pointers:**

- **Input** (`data-input/input.md`) — the parent pattern. Any contract
  documented there applies here unchanged unless this file says otherwise.
  The element-typing widening (`HTMLInputElement | HTMLTextAreaElement`)
  is the only directive-level change required to support textarea, and
  belongs in the Input source file with a one-line TSDoc note ("the
  directive accepts both `<input>` and `<textarea>` — see Textarea
  analysis").
- **Field / Form Field** (`data-input/field.md`) — owns the label
  + helper text + error message wrapping. Textarea ships its own counter
  because the counter is **field-specific** (consumes the textarea's
  `value.length`), but the rest of the field shell (label, error text,
  `aria-describedby` for errors) is delegated to `<kj-field>`. Spec out
  there how the field wires Textarea's `kjMaxLength` into a default
  hint when no counter is set.
- **Form** (`data-input/form.md`) — validation contracts. Textarea's
  `kjInvalid` follows the same `touched && invalid` posture as Input;
  no Form-specific changes.
- **Number Input / Password Input / Input Mask** (`data-input/number-input.md`,
  `password-input.md`, `input-mask.md`) — these also reuse `KjInput`. The
  pattern of "broaden `KjInput` to host element variants instead of
  forking the directive" generalises: each of those analyses should
  cite this decision.
- **`KjLiveRegion`** (`packages/core/src/a11y/live-region.ts`) — the
  character-counter live region uses it directly, with
  `kjPoliteness="polite"` and threshold-based `announce()` calls (not
  per-keystroke).
- **`KjAriaDescribedby`** (`packages/core/src/a11y/aria-describedby.ts`) —
  used by the wrapper to wire the counter's `id` into the textarea's
  `aria-describedby`. When a Field wrapper is also in play, both ids are
  composed (the directive supports multi-id sets per its existing API).

## Inputs / Outputs / Models

### Core directive (`KjInput`, reused)

No new inputs. Behaviour as documented in `data-input/input.md`. Element
typing widened to `HTMLInputElement | HTMLTextAreaElement` — internal,
not part of the public API.

### New primitive (`KjAutoresize`, selector `[kjAutoresize]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjMinRows` | `input<number>(1)` | `1` | Floor in rows, converted to px via measured `lineHeight`. |
| `kjMaxRows` | `input<number \| undefined>(undefined)` | `undefined` | Ceiling in rows. Beyond it, `overflow-y: auto`. |

No outputs. No exported methods needed (re-measurement happens
automatically via `(input)` host binding and a value-watching `effect()`).

### Wrapper (`KjTextareaComponent`, selector `kj-textarea`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjValue` | `input<string>('')` | `''` | Uncontrolled fallback. |
| `kjPlaceholder` | `input<string>('')` | `''` | |
| `kjRows` | `input<number>(3)` | `3` | |
| `kjResize` | `input<'none' \| 'vertical' \| 'horizontal' \| 'both'>('vertical')` | `'vertical'` | Forced to `'none'` when `kjAutoresize()` is `true`. |
| `kjAutoresize` | `input<boolean>(false)` | `false` | |
| `kjMinRows` | `input<number \| undefined>(undefined)` | `undefined` | |
| `kjMaxRows` | `input<number \| undefined>(undefined)` | `undefined` | |
| `kjMaxLength` | `input<number \| undefined>(undefined)` | `undefined` | |
| `kjShowCounter` | `input<boolean>(false)` | `false` | Requires `kjMaxLength`. |
| `kjInvalid` | `input<boolean>(false)` | `false` | |
| `kjDisabled` | `input<boolean>(false)` | `false` | |

All names are `kj`-prefixed per `rules/code_style.md`. No outputs — value
flow is via Angular forms binding on the inner textarea.

## Examples to ship

Files live at `packages/components/src/textarea/` and a core-only set at
`packages/core/src/input/` (the existing input folder; the textarea
example reuses `KjInput`).

1. **Default** — `textarea.example.ts`. `<kj-textarea kjRows="4"
   kjPlaceholder="Tell us…" [(ngModel)]="bio">`.
2. **Auto-resize** — `textarea.autoresize.example.ts`. Two textareas
   side-by-side, one fixed-rows and one with `kjAutoresize kjMinRows="2"
   kjMaxRows="8"`. Demonstrates the floor + ceiling behaviour.
3. **Character counter** — `textarea.counter.example.ts`.
   `kjMaxLength="200" kjShowCounter` with a `FormControl`. Shows the
   live-region threshold announcements.
4. **Disabled / invalid** — `textarea.states.example.ts`. Touched-and-invalid,
   disabled, and read-only states adjacent.
5. **Field-wrapped** — `textarea.field.example.ts`. Inside `<kj-field>` with
   label, helper text, and error message — proves the
   `aria-describedby` composition with the counter.
6. **Core-only** — `input.textarea.example.ts` under `packages/core/`.
   `<textarea kjInput [formControl]="ctrl">` with no wrapper, demonstrating
   the directive reuse claim. Add a sibling
   `input.textarea.autoresize.example.ts` that adds `kjAutoresize`
   directly.
7. **Themed** — `textarea.example.ts`, `textarea.retro.example.ts`,
   `textarea.finance.example.ts` (per-theme variations under
   `packages/core/src/input/` — same pattern Button uses).

## Open questions / risks

- **Widening `KjInput`'s element typing.** The constructor's
  `el = inject<ElementRef<HTMLInputElement>>(ElementRef)` annotation needs
  to become `HTMLInputElement | HTMLTextAreaElement`. Internal-only — no
  consumer break. Single-file change in `packages/core/src/input/input.ts`.
  Also widen the spec to cover the `<textarea kjInput>` path so we don't
  regress.
- **`form.updateOn: 'blur'` + auto-resize.** With blur-update forms, the
  `KjInput` value-reflection `effect()` only fires once per blur, but
  `KjAutoresize` measures on every `(input)`. They don't conflict —
  measurement reads `scrollHeight` from the live DOM, not from the form
  signal — but document this so future readers don't try to drive
  auto-resize off the form signal.
- **SSR + auto-resize.** `scrollHeight` is `0` server-side. `afterNextRender()`
  delays the first measurement until hydration. Verify with the SSR
  example app before shipping.
- **`<textarea>` inside `<form>` and `Enter`.** `<textarea>` does **not**
  submit a parent form on `Enter` (this is the whole point — it inserts
  newline). Document that consumers wanting "Enter to submit, Shift-Enter
  for newline" need to add their own keydown handler — kouji does not
  ship a built-in for this (Slack-style send-on-enter is a recipe, not a
  primitive).
- **`maxlength` clamping is silent.** Native truncation when the user
  pastes a too-long string doesn't fire any change event the user notices.
  Strongly recommend always pairing `kjMaxLength` with `kjShowCounter`,
  but enforcement would be paternalistic. Console-warn in dev if
  `kjMaxLength` is set without `kjShowCounter` **and** no Field wrapper is
  detected (latter check is hard; downgrade to a docs note if the wrapper
  detection isn't worth the complexity).
- **Counter announcement strategy.** Per-keystroke announcements are
  hostile; threshold announcements (e.g. "20 characters remaining", "limit
  reached") are friendly. The wrapper hard-codes thresholds at
  `kjMaxLength - 20`, `kjMaxLength - 10`, `kjMaxLength`. Open: should
  thresholds be configurable? Probably not — YAGNI until a consumer asks.
- **Resize handle inside Field shell.** When a Field wraps the textarea
  with a border that's drawn on the wrapper rather than the textarea
  itself (some themes do this), the resize handle drag area still works
  but the visual feedback is weird. Themes can opt in to redrawing the
  border on the textarea via `data-bordered="self"` or similar — leave
  to theme-level decisions, document the issue here.
- **Auto-resize jitter on rapid input.** Setting `height: auto` then
  re-measuring causes a single-frame collapse. PrimeNG works around it
  with a hidden mirror element; Material's CDK does the same. Ours is
  simpler (direct `style.height` toggling) and is fine in practice on
  modern browsers, but if jitter shows up under stress, fall back to the
  mirror-textarea pattern. Track as a follow-up; don't pre-build it.
- **Why not `KjTextarea` as a subclass / re-export of `KjInput`?**
  Rejected. A subclass adds a class with the same body and a different
  selector, doubling the surface and forcing consumers to pick. The
  `[kjInput]` selector already names the contract — broaden the typing
  and document.
