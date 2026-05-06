# Button — Design

**Date:** 2026-05-06
**Status:** Spec — pending implementation plan
**Worktree:** `kouji-target-components` (branch `target-components-list`)
**Builds on:** [`2026-05-06-component-presets-design.md`](./2026-05-06-component-presets-design.md)

## 1. Goal

Restate Button's design as the first consumer of the Component Presets architecture. The directive owns the full a11y contract; the wrapper component owns presentation. Variant and size become user-configurable via `provideKjButton(…)` instead of closed unions. Loading and pressed states are added as first-class a11y inputs.

This spec assumes the presets spec is implemented; it depends on `KjVariant`, `KjSize`, `KJ_BUTTON_CONFIG`, and `provideKjButton`.

## 2. `KjButton` directive (final shape)

### 2.1 Composition

```ts
// packages/core/src/button/button.ts

@Directive({
  selector: '[kjButton]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant: variant'] },
    { directive: KjSize,    inputs: ['kjSize: size'] },
    { directive: KjDisabled, inputs: ['kjDisabled: disabled'] },
    KjFocusRing,
  ],
  providers: [...bindPresets(KJ_BUTTON_CONFIG)],
  host: {
    '[attr.aria-busy]':    'effectiveBusy()',
    '[attr.aria-pressed]': 'pressedAttr()',
  },
})
export class KjButton {
  /** When true, the button is in a loading/processing state. Sets `aria-busy="true"` and forces `aria-disabled="true"` to prevent activation. */
  loading = input<boolean>(false);

  /** Toggle state for press-toggle buttons. `undefined` (default) omits `aria-pressed` entirely. */
  pressed = input<boolean | undefined>(undefined);

  protected effectiveBusy = computed(() => this.loading() ? 'true' : null);
  protected pressedAttr   = computed(() => {
    const p = this.pressed();
    return p === undefined ? null : (p ? 'true' : 'false');
  });

  // KjDisabled is composed; when `loading()` is true we need to also force disabled.
  // Implementation: an effect inside this directive sets the `disabled` input on
  // the composed KjDisabled instance via the input alias, OR a small protected
  // computed input value is exposed to the template binding when wrapped.
  // (Final wiring is an implementation detail; see Implementation Notes.)
}
```

### 2.2 Inputs (alphabetical)

| Input      | Type                          | Default     | Reflected attr             | Source           |
|------------|-------------------------------|-------------|----------------------------|------------------|
| `disabled` | `boolean`                     | `false`     | `aria-disabled`            | `KjDisabled`     |
| `loading`  | `boolean`                     | `false`     | `aria-busy`, `aria-disabled` (forced) | `KjButton` |
| `pressed`  | `boolean \| undefined`        | `undefined` | `aria-pressed`             | `KjButton`       |
| `size`     | `string` (configured preset)  | from config | `data-size`                | `KjSize`         |
| `variant`  | `string` (configured preset)  | from config | `data-variant`             | `KjVariant`      |

The directive does **not** expose `type`, `ariaLabel`, or `routerLink` — those are native HTML / framework concerns owned by the underlying `<button>` or `<a>` element the directive sits on.

### 2.3 Host bindings

The directive sets only what its mixins don't already cover:

| Attr            | Value source                                                  |
|-----------------|---------------------------------------------------------------|
| `data-variant`  | `KjVariant` (composed)                                        |
| `data-size`     | `KjSize` (composed)                                           |
| `aria-disabled` | `KjDisabled` OR `loading() === true` (forced)                 |
| `aria-busy`     | `loading() ? 'true' : null`                                   |
| `aria-pressed`  | `pressed() === undefined ? null : (pressed() ? 'true' : 'false')` |

`role` is **not** set. `kjButton` should be applied to a `<button>` (which has the role for free) or an `<a>` (anchor-as-button — see §5). Using `kjButton` on a `<div>` is a misuse and not supported.

### 2.4 Implementation note: forcing disabled while loading

Two viable approaches:

1. Compose `KjDisabled` with the input aliased to `disabled`, and add an `effect()` inside `KjButton` that calls `KjDisabled.setDisabled(true)` (a public setter on `KjDisabled`) whenever `loading()` is true. Requires a small change to `KjDisabled` to accept programmatic forces.
2. Don't compose `KjDisabled` directly here; replicate its `aria-disabled` host binding inside `KjButton` and read both `disabled()` and `loading()`. Keeps `KjDisabled` simple but partially duplicates its logic.

Pick option 1 — `KjDisabled` already has a public-by-design surface and a programmatic-force is a useful primitive other consumers may want (e.g. a Form sets all controls disabled). Implementation detail: confirm `KjDisabled`'s current API during plan-writing.

## 3. `KjButtonComponent` wrapper (final shape)

```ts
// packages/components/src/button/button.ts

@Component({
  selector: 'kj-button',
  standalone: true,
  imports: [KjButton, KjSpinner], // KjSpinner: future Feedback component
  template: `
    <button
      [type]="type()"
      [attr.aria-label]="ariaLabel()"
      kjButton
      class="kj-button"
      [variant]="variant()"
      [size]="size()"
      [disabled]="disabled()"
      [loading]="loading()"
      [pressed]="pressed()"
    >
      @if (loading()) {
        <kj-spinner class="kj-button__spinner" aria-hidden="true" />
      }
      <ng-content />
    </button>
  `,
  styleUrl: './button.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjButtonComponent {
  variant   = input<string>('default');
  size      = input<string>('md');
  disabled  = input<boolean>(false);
  loading   = input<boolean>(false);
  pressed   = input<boolean | undefined>(undefined);
  type      = input<'button' | 'submit' | 'reset'>('button');
  ariaLabel = input<string | undefined>(undefined);
}
```

### 3.1 Notes on the wrapper

- `KjSpinner` is a future component (per the roadmap, Feedback §4). Until it lands, ship the spinner as a small inline element styled in `button.css` (a `<span class="kj-button__spinner">` with a CSS `border` + `animation`). Replace with the real `KjSpinner` once that component lands; tracked as a follow-up.
- `class="kj-button"` is fixed and theming-relevant; preset values arrive as `data-*` attributes via the directive.
- The `display: contents` host pattern continues so the wrapper element produces no layout box.

## 4. CSS (no architectural change, additive only)

`button.css` continues to:

1. Sit in `@layer kj.component`.
2. Declare component-scoped CSS custom properties at the top of `.kj-button` (e.g. `--kj-button-bg`, `--kj-button-fg`, `--kj-button-radius`, `--kj-button-padding-*`) defaulting to shared tokens.
3. Flip those custom properties via `[data-variant="…"]` / `[data-size="…"]` / `:hover` / `:focus-visible` / `[aria-disabled="true"]` selectors.

Additions for this spec:

- `.kj-button[aria-busy="true"]` — same visual treatment as disabled (cursor, opacity), plus optional `:where()` rule that hides text content when the spinner is present (alternative: simply place the spinner before content with a gap; pick during implementation).
- `.kj-button[aria-pressed="true"]` — sticky pressed visual (subtle inset shadow or token-flip).
- `.kj-button[data-size="icon"]` — enforce min-width AND min-height ≥ 44px (touch target, WCAG 2.5.5).
- `.kj-button[data-size="sm"]` — enforce min-height ≥ 44px even though height token is shorter; padding compensates.

The structural CSS reads only the custom properties; variant/size/state rules only flip them. No restating of structural CSS in any rule.

## 5. Anchor-as-button

PrimeNG, Material, and shadcn all support an `<a>` styled as a button (used for navigation actions). The `kjButton` directive selector targets attribute, not element — apply it to either:

```html
<button kjButton variant="default">Save</button>
<a kjButton variant="link" href="/profile">View profile</a>
```

The directive itself does nothing element-specific. The wrapper component (`<kj-button>`) renders a `<button>`; for the anchor case users either use the directive directly or use a future `<kj-link>` (Link is already a kouji component). No new component is needed; this is a documented usage pattern, not a new symbol.

## 6. A11y contract

| Concern              | Owner         | Mechanism |
|----------------------|---------------|-----------|
| Keyboard activation  | Native `<button>` | Space/Enter built in |
| Focus ring           | `KjFocusRing` | `:focus-visible` outline at ≥ 3:1 contrast |
| Disabled semantic    | `KjDisabled`  | `aria-disabled="true"`; pointer events suppressed |
| Loading busy         | `KjButton`    | `aria-busy="true"` + force `aria-disabled="true"` |
| Press-toggle state   | `KjButton`    | `aria-pressed="true|false"` (omitted when input is `undefined`) |
| Touch target ≥ 44×44 | `button.css`  | `min-height` / `min-width` rules per size |
| Decorative spinner   | template      | `aria-hidden="true"` on the spinner element |
| Icon-only label      | consumer      | Required `aria-label` on the `<button>`/`<kj-button>` (lint rule, not enforced at runtime) |
| Trigger semantics (`aria-haspopup` / `aria-expanded`) | **not Button's responsibility** | Owned by Dropdown Menu / Popover / Context Menu trigger directives when the button pairs with one |

WCAG 2.1 AAA target (per kouji's `CLAUDE.md`):
- 1.3.1 Info & Relationships — `aria-pressed`, `aria-busy`, `aria-disabled` give programmatic state.
- 1.4.6 Contrast (Enhanced) — variant tokens must meet 7:1 for text and 3:1 for non-text (focus ring); enforced in the default theme; not architectural.
- 2.1.1 Keyboard — native `<button>`.
- 2.5.5 Target Size — CSS rules above.
- 4.1.2 Name, Role, Value — `<button>` provides role and accessible name (from text content or `aria-label`).

A brief Accessibility Review section is required per `CLAUDE.md` after implementation.

## 7. Examples to ship

Component-package examples (each is one `.example.ts` file with one preview group):

| File                          | `@doc-example` label     | What it shows |
|-------------------------------|--------------------------|---------------|
| `button.example.ts`           | Default                  | Plain primary button. |
| `button.variants.example.ts`  | Variants                 | All shipped variants side by side. |
| `button.sizes.example.ts`     | Sizes                    | All shipped sizes side by side. |
| `button.disabled.example.ts`  | Disabled                 | `[disabled]` set, both wrapper and directive form. |
| `button.loading.example.ts`   | Loading                  | `[loading]` set, with spinner; demonstrates aria-busy. **New.** |
| `button.pressed.example.ts`   | Pressed (toggle)         | Press-toggle button toggled by a click. **New.** |
| `button.icon.example.ts`      | Icon-only                | `size="icon"` with a single icon child + `aria-label`. **New.** |
| `button.anchor.example.ts`    | Anchor as button         | `<a kjButton variant="link">` form. **New.** |
| `button.configured.example.ts`| Configured presets       | Shows a feature using `provideKjButton({ variants: [...defaults, 'brand'], defaults: { variant: 'brand' } })` at component-providers level. **New.** |

Total: 9 example files (4 existing, 5 new).

Core-package examples (already present): `button.example.ts`, `button.sizes.example.ts`, `button.retro.example.ts`, `button.finance.example.ts` — keep, but update example sources to use the new `variant`/`size` aliased input names instead of `kjVariant`/`kjSize` (the aliasing happens in `hostDirectives`, so the ergonomic name is `[variant]` / `[size]`).

## 8. Tests

### 8.1 Directive (`packages/core/src/button/button.spec.ts`)

- Default `variant` and `size` come from `KJ_BUTTON_DEFAULTS` when no override is provided.
- `provideKjButton({ defaults: { variant: 'destructive', size: 'sm' } })` flows to `data-variant="destructive"` and `data-size="sm"` on the host element.
- `loading` toggles `aria-busy="true"` and forces `aria-disabled="true"` regardless of `disabled` input.
- `pressed` undefined → no `aria-pressed` attribute. `pressed=true` → `aria-pressed="true"`. `pressed=false` → `aria-pressed="false"`.
- Dev-mode warning emitted once when `variant="bogus"` is set and `'bogus'` is not in the configured list. No warning in non-dev mode.
- `KjFocusRing` and `KjDisabled` host bindings are still applied (regression check that the migration didn't drop them).

### 8.2 Wrapper (`packages/components/src/button/button.spec.ts`)

- Renders `<button>` with `kjButton` and the configured class.
- Inputs flow through to the directive (set `[variant]` on `<kj-button>`, see `data-variant` on inner `<button>`).
- Spinner is rendered when `loading()` is true and not when false.
- `aria-label` on `<kj-button>` reaches the inner `<button>`.

### 8.3 E2E (Playwright)

Per kouji's global rule, after every feature add a passing E2E test. New scenarios:

- `loading-button.e2e.ts` — clicking a loading button is a no-op (event suppressed); spinner is visible; `aria-busy` is reported.
- `pressed-button.e2e.ts` — toggling a pressed button updates `aria-pressed` between `true`/`false`.
- `provider-override.e2e.ts` — a route configured with `provideKjButton({ variants: [...defaults, 'brand'], defaults: { variant: 'brand' } })` shows the configured default; a button explicitly setting `variant="default"` overrides the configured default.

## 9. Migration impact

| Change | Surface | Mitigation |
|---|---|---|
| `KjButtonVariant`, `KjButtonSize` literal unions removed | Public type API | Documented breaking change; users add CSS rules for new variants and configure via `provideKjButton`. |
| `kjVariant` / `kjSize` directive inputs renamed to `variant` / `size` (alias from `KjVariant` / `KjSize` via `hostDirectives`) | Directive usage | Existing core-package examples (`button.example.ts`, `button.sizes.example.ts`, `button.retro.example.ts`, `button.finance.example.ts`) updated to use the new names. |
| Wrapper input types change from `KjButtonVariant` / `KjButtonSize` to `string` | Component-package usage | TS will accept any string; users wanting the closed set narrow themselves with their own type. |
| New inputs `loading`, `pressed` on both directive and wrapper | Additive | None. |
| `KjDisabled` may grow a `setDisabled(value)` method (per §2.4 option 1) | Cross-component primitive | One small additive method; no callers broken. |

Existing wrapper inputs (`type`, `ariaLabel`) are preserved.

## 10. Out of scope

- **Button Group** (Toggle Button + Split Button as variants of Button Group, per the roadmap consolidation). Lives in its own design when we reach Button Group.
- **`KjSpinner`** as a real component — depended on by the Loading example. Until it's built, the spinner is inline DOM in the wrapper template plus CSS.
- **Lint rule for icon-only buttons missing `aria-label`** — best handled by an `eslint-plugin-kouji-ui` rule, out of this spec.
- **Anchor-as-button enhancements** like `routerLinkActive` integration — handled at the consumer's template level.

## 11. Files touched (summary)

**Edited (core):**

- `packages/core/src/button/button.ts` — adopt presets composition; remove `kjVariant`/`kjSize` inputs and host bindings; add `loading`, `pressed` inputs; add `aria-busy` / `aria-pressed` host bindings; remove `KjButtonVariant` / `KjButtonSize` exports.
- `packages/core/src/button/index.ts` — export changes.
- `packages/core/src/button/button.example.ts`, `button.sizes.example.ts`, `button.retro.example.ts`, `button.finance.example.ts` — update to use `[variant]` / `[size]` aliased input names.
- `packages/core/src/button/button.spec.ts` — extended per §8.1.
- `packages/core/src/primitives/disabled.ts` — add `setDisabled(value: boolean)` (per §2.4 option 1) if not already present.

**Edited (components):**

- `packages/components/src/button/button.ts` — add `loading`, `pressed` inputs; pass through; render spinner placeholder; update template input names.
- `packages/components/src/button/button.css` — add `[aria-busy="true"]` and `[aria-pressed="true"]` rules; add `[data-size="icon"]` and `[data-size="sm"]` min-size rules; add `.kj-button__spinner` styles (placeholder until `KjSpinner` exists).
- `packages/components/src/button/button.spec.ts` — extended per §8.2.

**New (components — examples):**

- `packages/components/src/button/button.loading.example.ts`
- `packages/components/src/button/button.pressed.example.ts`
- `packages/components/src/button/button.icon.example.ts`
- `packages/components/src/button/button.anchor.example.ts`
- `packages/components/src/button/button.configured.example.ts`

**New (E2E):**

- `apps/docs/e2e/loading-button.e2e.ts`
- `apps/docs/e2e/pressed-button.e2e.ts`
- `apps/docs/e2e/provider-override.e2e.ts`

**Public API:**

- `packages/core/src/public-api.ts` — drop `KjButtonVariant`, `KjButtonSize` exports; everything else from the presets spec is added there.
- `packages/components/src/public-api.ts` — no change (it already re-exports `./button/index`).

No changes to themes, routing, theme generator, manifest watcher, or other components.
