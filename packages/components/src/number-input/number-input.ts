import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ModelSignal,
  ViewEncapsulation,
  booleanAttribute,
  input,
  model,
  viewChild,
} from '@angular/core';
import {
  KjNumberInput,
  KjNumberInputGroup,
  KjNumberStepper,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjNumberInput` directive family.
 *
 * Renders an internal `[kjNumberInput]` field flanked (or stacked) with two
 * `[kjNumberStepper]` buttons. All directive inputs (`kjMin`, `kjMax`,
 * `kjStep`, `kjFormat`, `kjLocale`, `kjCurrency`, …) are forwarded; the
 * `[(kjValue)]` model is two-way bindable.
 *
 * @doc-example Default
 *   The bare-minimum recipe — a quantity stepper bound to a number signal.
 *   @doc-file number-input.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — quantity, bounded picker, and
 *   currency formatting. Use this as the copy-paste starting point.
 *   @doc-file number-input.usage.example.ts
 * @doc-example With explicit stepper buttons
 *   `kjStepperLayout="flanking"` keeps the +/- buttons on either side.
 *   @doc-file number-input.with-stepper.example.ts
 * @doc-example Min / max / step
 *   Bound the input via `kjMin` / `kjMax`; `kjStep` drives the +/- delta.
 *   @doc-file number-input.min-max.example.ts
 * @doc-example Decimal precision
 *   `kjMinimumFractionDigits` and `kjMaximumFractionDigits` pin the display.
 *   @doc-file number-input.decimal.example.ts
 * @doc-example Currency formatting
 *   `kjFormat="currency"` + `kjCurrency` + `kjLocale` — Intl.NumberFormat all the way.
 *   @doc-file number-input.currency.example.ts
 *
 * @doc-keyboard
 *   ArrowUp       — Increment by `kjStep`
 *   ArrowDown     — Decrement by `kjStep`
 *   PageUp        — Increment by `kjPageStep` (when > 0)
 *   PageDown      — Decrement by `kjPageStep` (when > 0)
 *   Home          — Jump to `kjMin`
 *   End           — Jump to `kjMax`
 *   Enter         — Commit the typed value and reformat
 *
 * @doc-aria
 *   role="spinbutton"   — On the inner `<input>` (provided by the directive)
 *   aria-valuemin       — Reflects `kjMin`
 *   aria-valuemax       — Reflects `kjMax`
 *   aria-valuenow       — Reflects the current numeric value
 *   aria-invalid        — Reflects `kjInvalid`
 *   aria-disabled       — Reflects `kjDisabled` on field + stepper buttons
 *   aria-label          — Wired from `kjAriaLabel`; required for icon-only / no-label usage
 *
 * @doc-touch
 *   The two stepper buttons render at `--kj-number-input-stepper-size`
 *   (defaults to 2.75rem / 44px) — meets WCAG 2.5.5. The field row matches
 *   `kj-input` height for form-row alignment.
 *
 * @doc-a11y
 *   Composes a real `<input>` with the spinbutton role and locale-aware
 *   formatting. Always pair with a visible `<label>` or set `kjAriaLabel` —
 *   the directive does not synthesise an accessible name. The +/- buttons
 *   own their own `kjDecrementLabel` / `kjIncrementLabel` for SR clarity.
 *
 * @doc-related input,slider,form
 *
 * @doc-css-var
 *   --kj-number-input-bg            — Background fill. Inherits --kj-bg-field.
 *   --kj-number-input-fg            — Foreground (text) color.
 *   --kj-number-input-border-color  — Border color. Flips to danger when [data-invalid].
 *   --kj-number-input-border-width  — Border thickness. Inherits --kj-border.
 *   --kj-number-input-radius        — Corner radius. Inherits --kj-radius-field.
 *   --kj-number-input-padding-x     — Horizontal padding on the inner field.
 *   --kj-number-input-font          — Font family. Defaults to --kj-font-sans.
 *   --kj-number-input-font-size     — Font size. Size attributes override.
 *   --kj-number-input-height        — Row height. Matches input/select for form alignment.
 *   --kj-number-input-stepper-bg    — Stepper button background fill.
 *   --kj-number-input-stepper-fg    — Stepper button foreground color.
 *   --kj-number-input-stepper-size  — Stepper button min width/height. Drives touch target.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name number-input
 * @doc-description Themed numeric input with stepper buttons, locale formatting, and min/max/step constraints.
 * @doc-is-main
 */
@Component({
  selector: 'kj-number-input',
  standalone: true,
  imports: [KjNumberInput, KjNumberInputGroup, KjNumberStepper],
  template: `
    <div
      kjNumberInputGroup
      class="kj-number-input"
      [attr.data-stepper-layout]="kjStepperLayout()"
      [attr.data-size]="kjSize() === 'md' ? null : kjSize()"
      [attr.data-disabled]="kjDisabled() ? '' : null"
    >
      <button
        type="button"
        kjNumberStepper
        kjStep="down"
        class="kj-number-input__stepper kj-number-input__stepper--down"
        [kjAriaLabel]="kjDecrementLabel()"
        [kjDisabled]="kjDisabled()"
      >−</button>
      <input
        #nativeInput
        kjNumberInput
        class="kj-number-input__field"
        [(kjValue)]="kjValue"
        [kjMin]="kjMin()"
        [kjMax]="kjMax()"
        [kjStep]="kjStep()"
        [kjPageStep]="kjPageStep()"
        [kjAllowEmpty]="kjAllowEmpty()"
        [kjAllowDecimals]="kjAllowDecimals()"
        [kjAllowNegative]="kjAllowNegative()"
        [kjReadonly]="kjReadonly()"
        [kjDisabled]="kjDisabled()"
        [kjInvalid]="kjInvalid()"
        [kjUseNativeNumber]="kjUseNativeNumber()"
        [kjFormat]="kjFormat()"
        [kjLocale]="kjLocale()"
        [kjCurrency]="kjCurrency()"
        [kjCurrencyDisplay]="kjCurrencyDisplay()"
        [kjUnit]="kjUnit()"
        [kjUnitDisplay]="kjUnitDisplay()"
        [kjUseGrouping]="kjUseGrouping()"
        [kjMinimumFractionDigits]="kjMinimumFractionDigits()"
        [kjMaximumFractionDigits]="kjMaximumFractionDigits()"
        [kjAriaLabel]="kjAriaLabel()"
        [placeholder]="kjPlaceholder()"
      />
      <button
        type="button"
        kjNumberStepper
        kjStep="up"
        class="kj-number-input__stepper kj-number-input__stepper--up"
        [kjAriaLabel]="kjIncrementLabel()"
        [kjDisabled]="kjDisabled()"
      >+</button>
    </div>
  `,
  styleUrl: './number-input.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjNumberInputComponent {
  /** Two-way bindable numeric model. `null` for empty. */
  readonly kjValue: ModelSignal<number> = model<number>(0);

  /** Native `<input>` element queried via template-ref. Exposed so callers
   *  (cell editors, form managers) can move focus without reaching into
   *  the DOM. */
  readonly nativeInput = viewChild<ElementRef<HTMLInputElement>>('nativeInput');

  /** Focus the underlying `<input>`. No-op until the view renders. */
  focus(): void {
    this.nativeInput()?.nativeElement.focus();
  }

  readonly kjMin = input<number>(Number.NEGATIVE_INFINITY);
  readonly kjMax = input<number>(Number.POSITIVE_INFINITY);
  readonly kjStep = input<number>(1);
  readonly kjPageStep = input<number>(0);

  readonly kjAllowEmpty = input(true, { transform: booleanAttribute });
  readonly kjAllowDecimals = input(true, { transform: booleanAttribute });
  readonly kjAllowNegative = input(true, { transform: booleanAttribute });
  readonly kjReadonly = input(false, { transform: booleanAttribute });
  readonly kjDisabled = input(false, { transform: booleanAttribute });
  readonly kjInvalid = input(false, { transform: booleanAttribute });
  readonly kjUseNativeNumber = input(false, { transform: booleanAttribute });

  readonly kjFormat = input<'decimal' | 'currency' | 'percent' | 'unit'>('decimal');
  readonly kjLocale = input<string>('');
  readonly kjCurrency = input<string>('');
  readonly kjCurrencyDisplay = input<'symbol' | 'narrowSymbol' | 'code' | 'name'>('symbol');
  readonly kjUnit = input<string>('');
  readonly kjUnitDisplay = input<'short' | 'long' | 'narrow'>('short');
  readonly kjUseGrouping = input(true, { transform: booleanAttribute });
  readonly kjMinimumFractionDigits = input<number>(0);
  readonly kjMaximumFractionDigits = input<number>(0);

  readonly kjPlaceholder = input<string>('');
  readonly kjAriaLabel = input<string>('');

  /** Layout for the stepper buttons. */
  readonly kjStepperLayout = input<'flanking' | 'stacked'>('flanking');

  /** Size tier — matches `KjInput`. `xs` (28px) hides the steppers so the
   *  control collapses to a bare numeric field for filter rows / inline edits. */
  readonly kjSize = input<'xs' | 'sm' | 'md' | 'lg'>('md');

  /** Accessible label for the decrement button. */
  readonly kjDecrementLabel = input<string>('Decrease value');

  /** Accessible label for the increment button. */
  readonly kjIncrementLabel = input<string>('Increase value');
}
