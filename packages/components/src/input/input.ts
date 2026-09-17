import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { KjFormControl, KjInput, type KjExtensible } from '@kouji-ui/core';

/** Native `type` values `<kj-input>` supports. Default `'text'`. */
export type KjInputType = 'text' | 'email' | 'password' | 'number'
                        | 'search' | 'tel' | 'url' | 'color'
                        | 'date' | 'time' | 'datetime-local';

/** Visual variants — `default` uses the field surface; `sunken` drops to
 *  body bg so the input pops against a card/surface parent. Open by design
 *  ({@link KjExtensible}): an unknown value reflects as `data-variant` for a
 *  consumer rule to pick up. */
export type KjInputVariant = KjExtensible<'default' | 'sunken'>;

/** Size tier — `xs` (28px) for filter rows / inline editors, `sm` (32px)
 *  for dense forms, `md` (36px, default) for standard rows, `lg` (44px)
 *  for touch-first primary inputs. Open by design ({@link KjExtensible}). */
export type KjInputSize = KjExtensible<'xs' | 'sm' | 'md' | 'lg'>;

/**
 * Styled wrapper around the headless KjInput directive.
 *
 * Supports `[(ngModel)]` and `[formControl]` bindings.
 *
 * @example
 * ```html
 * <kj-input type="email" placeholder="you@example.com" [(ngModel)]="email" />
 * ```
 *
 * @doc-keyboard
 *   Tab    — Moves focus into and out of the input (native input semantics)
 *   Enter  — Submits the parent <form> when present (native behavior)
 *
 * @doc-aria
 *   aria-invalid   — set to "true" only after the control is touched AND [invalid] is true; avoids announcing errors before the user has interacted
 *   data-invalid   — mirror of aria-invalid for CSS targeting
 *   data-type      — reflects the `type` input ("text" | "email" | "password" | ...) for type-specific styling
 *   data-variant   — reflects the visual `variant` input ("default" | "sunken")
 *   disabled       — native attribute reflected when the bound form control's disabled state is true
 *
 * @doc-css-var
 *   --kj-input-bg             — Background fill. Variant `sunken` retargets this to body bg.
 *   --kj-input-fg             — Foreground (text + caret) color.
 *   --kj-input-border-color   — Border color. Focus and invalid states retarget this.
 *   --kj-input-border-style   — Border line style. Default solid.
 *   --kj-input-border-width   — Border thickness. Inherits --kj-border.
 *   --kj-input-radius         — Corner radius. Inherits --kj-radius-field.
 *   --kj-input-padding-x      — Horizontal padding inside the input.
 *   --kj-input-padding-y      — Vertical padding inside the input.
 *   --kj-input-font           — Font family. Defaults to --kj-font-sans.
 *   --kj-input-font-size      — Font size. Sizes (sm/md/lg) override.
 *   --kj-input-placeholder-fg — Placeholder text color. Muted by default.
 *   --kj-input-height         — Explicit height. Sizes override; matches button md by default.
 *
 * @doc-touch
 *   Default height is 36px (md). Use `data-size="lg"` (2.75rem / 44px) when the input is the primary touch target in a form. The `type="color"` swatch renders at 44×32px — pair it with a textual label for the accessible name.
 *
 * @doc-a11y
 *   `<kj-input>` is a thin wrapper around the headless `kjInput` directive that
 *   composes `KjFormControl` (CVA), `KjDisabled`, and `KjFocusRing`. Always
 *   associate a `<label>` via `for=`/`id=` or wrap the input in the label — the
 *   component does not generate its own accessible name. Pair with a sibling
 *   error node referenced by `aria-describedby` to surface validation messages
 *   to screen readers. Focus visibility comes from `:focus-visible` only (2px
 *   primary outline), never on mouse click.
 *
 * @doc-related field,password-input,textarea,input-mask
 *
 * @doc-example Default
 *   Plain text input — anchors the chrome and the (ngModel) two-way pattern.
 *   @doc-file input.example.ts
 * @doc-example Usage
 *   Common input shapes — types, invalid state, disabled, and a (ngModel) bind.
 *   @doc-file input.usage.example.ts
 * @doc-example Color
 *   `type="color"` renders the native swatch wired through the same wrapper.
 *   @doc-file input.color.example.ts
 *
 * @doc
 * @doc-category Library/Data input
 * @doc-name input
 * @doc-description Themed text input with type variants, invalid and disabled state, and Angular forms support.
 * @doc-is-main
 */
@Component({
  selector: 'kj-input',
  standalone: true,
  imports: [KjInput],
  hostDirectives: [KjFormControl],
  template: `
    <input
      #nativeInput
      kjInput
      class="kj-input"
      [class]="kjClass()"
      [type]="type()"
      [value]="value()"
      [placeholder]="placeholder()"
      [attr.autocomplete]="autocomplete() || null"
      [attr.inputmode]="inputmode() || null"
      [attr.data-variant]="variant()"
      [attr.data-size]="resolvedSize() === 'md' ? null : resolvedSize()"
      [attr.aria-label]="ariaLabel() || null"
      [kjInvalid]="invalid()"
      [kjDisabled]="disabled()"
    />
  `,
  styleUrl: './input.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'style': 'display: contents;',
    '[attr.data-type]': 'type()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputComponent {
  /**
   * Class names added to the **styled root element** — the inner `.kj-input`,
   * not this `display: contents` host, which paints nothing and which no CSS
   * selector can usefully target.
   *
   * This is the supported per-instance override. Author the rule *unlayered*
   * so it beats `@layer kj.component` regardless of specificity, and set the
   * component's documented `--kj-*` knobs from it rather than re-declaring its
   * internals:
   *
   * ```html
   * <kj-input kjClass="danger-zone">…</kj-input>
   * ```
   * ```css
   * .danger-zone { --kj-input-bg: hotpink; }
   * ```
   */
  readonly kjClass = input<string>('');
  /** Native `type` of the inner `<input>`. Closed — each value changes behaviour. */
  readonly type = input<KjInputType>('text');
  /** Visual variant reflected as `data-variant` on the inner `<input>`. */
  readonly variant = input<KjInputVariant>('default');
  /**
   * Size tier reflected as `data-size` (omitted for the default `'md'`).
   *
   * `<kj-*>` element components take bare input names — see
   * `rules/code_style.md`. This is the only spelling; the prefixed one this
   * class used to also accept was removed rather than aliased (arch F-11).
   */
  readonly size = input<KjInputSize | undefined>(undefined);
  /** `size` if set, else `'md'`. */
  protected readonly resolvedSize = computed<KjInputSize>(() => this.size() ?? 'md');
  /** Initial text of the inner `<input>`. Default `''`. Use `[(ngModel)]` / `[formControl]` for two-way value. */
  readonly value = input<string>('');
  /** Native `placeholder` on the inner `<input>`. Default `''` (no placeholder). */
  readonly placeholder = input<string>('');
  /** Invalid state — reflected as `aria-invalid` once the control is touched. Default `false`. */
  readonly invalid = input(false, { transform: booleanAttribute });
  /** Disables the inner `<input>` (native `disabled`). Default `false`. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Accessible name for the inner `<input>`, written as `aria-label`. Empty
   * string omits the attribute.
   *
   * Use it only where no visible label can be associated — a table filter
   * row, a search field whose label is an adjacent icon. Inside a
   * `<kj-field>`, leave it unset: `KjFieldControl` wires `aria-labelledby` to
   * the field's `<kj-field-label>` and a competing `aria-label` would win over
   * the visible text (WCAG 2.5.3 Label in Name).
   */
  readonly ariaLabel = input<string>('');
  /** Native `autocomplete` attribute passthrough. Empty string omits the attribute. */
  readonly autocomplete = input<string>('');
  /** Native `inputmode` attribute passthrough. Empty string omits the attribute. */
  readonly inputmode = input<string>('');

  /** The composed headless `kjInput` in this component's view — the real CVA. */
  protected readonly innerInput = viewChild(KjInput);

  /** Native `<input>` element, queried via template-ref. Used by callers
   *  (cell editors, focus-trapping consumers) that need to move keyboard
   *  focus into the input without reaching into the DOM. */
  readonly nativeInput = viewChild<ElementRef<HTMLInputElement>>('nativeInput');

  /** Focus the underlying `<input>`. No-op until the view renders. */
  focus(): void {
    this.nativeInput()?.nativeElement.focus();
  }

  /**
   * The composed `KjFormControl` — this component's `ControlValueAccessor`.
   *
   * The wrapper is the element a consumer binds `[(ngModel)]` / `[formControl]`
   * to, but the control that owns the DOM is the headless `kjInput` in the view.
   * `delegateTo` joins the two, replaying anything Angular's forms layer wrote
   * before the view query resolved — which is why this is not four hand-written
   * accessor methods plus a pending-value buffer.
   */
  protected readonly formCtrl = inject(KjFormControl);

  constructor() {
    effect(() => this.formCtrl.delegateTo(this.innerInput()?.formCtrl));
  }
}
