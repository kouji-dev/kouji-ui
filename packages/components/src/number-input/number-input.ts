import {
  ChangeDetectionStrategy,
  Component,
  ModelSignal,
  ViewEncapsulation,
  booleanAttribute,
  input,
  model,
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
 *   @doc-file number-input.example.ts
 * @doc-example With explicit stepper buttons
 *   @doc-file number-input.with-stepper.example.ts
 * @doc-example Min / max / step
 *   @doc-file number-input.min-max.example.ts
 * @doc-example Decimal precision
 *   @doc-file number-input.decimal.example.ts
 * @doc-example Currency formatting
 *   @doc-file number-input.currency.example.ts
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

  /** Accessible label for the decrement button. */
  readonly kjDecrementLabel = input<string>('Decrease value');

  /** Accessible label for the increment button. */
  readonly kjIncrementLabel = input<string>('Increase value');
}
