import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  forwardRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { KjInputOtp, KjInputOtpCell } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjInputOtp` + `KjInputOtpCell`
 * directive family.
 *
 * Renders N square cells in a flex row. Supports `[(ngModel)]` and
 * `[formControl]` / `[formControlName]` out of the box — the full
 * concatenated code string is the form value. Use `[kjSeparatorAfter]="[2]"`
 * to render a visual dash between cell groups (e.g. `123–456`); the
 * separator is purely decorative and never included in the form value.
 *
 * @doc-example Default
 *   @doc-file input-otp.example.ts
 * @doc-example Reactive form
 *   @doc-file input-otp.reactive.example.ts
 * @doc-example Lengths
 *   @doc-file input-otp.lengths.example.ts
 * @doc-example Masked
 *   @doc-file input-otp.masked.example.ts
 * @doc-example With separator
 *   @doc-file input-otp.separator.example.ts
 * @doc-example Auto-submit
 *   @doc-file input-otp.autosubmit.example.ts
 * @category Library/Data input
 * @doc
 * @doc-name input-otp
 * @doc-description Pre-styled one-time-password input that renders N individual cells with paste distribution, auto-submit, masking, and visual separators — fully `[(ngModel)]` / `[formControl]` compatible, emitting the concatenated code string.
 * @doc-is-main
 */
@Component({
  selector: 'kj-input-otp',
  standalone: true,
  imports: [KjInputOtp, KjInputOtpCell],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KjInputOtpComponent),
      multi: true,
    },
  ],
  template: `
    <div
      kjInputOtp
      class="kj-input-otp__group"
      [kjLength]="kjLength()"
      [kjCharSet]="kjCharSet()"
      [kjMask]="kjMask()"
      [kjAutoSubmit]="kjAutoSubmit()"
      [kjInvalid]="kjInvalid()"
      [kjDisabled]="kjDisabled()"
      [kjReadonly]="kjReadonly()"
      [kjAriaLabel]="kjAriaLabel()"
      (kjComplete)="kjComplete.emit($event)"
      (kjPasted)="kjPasted.emit($event)"
    >
      @for (i of _indices(); track i) {
        <input
          kjInputOtpCell
          class="kj-input-otp__cell"
          [kjIndex]="i"
        />
        @if (kjSeparatorAfter().includes(i)) {
          <span class="kj-input-otp__separator" aria-hidden="true">–</span>
        }
      }
    </div>
  `,
  styleUrl: './input-otp.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-input-otp' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputOtpComponent implements ControlValueAccessor, AfterViewInit {
  // ── Forwarded inputs ─────────────────────────────────────────────────────────

  /** Number of OTP cells. Common values: 4, 6, 8. */
  readonly kjLength = input<number>(6);

  /** Character-set restriction. */
  readonly kjCharSet = input<'digits' | 'alphanumeric' | RegExp>('digits');

  /** When `true`, cells render as `type="password"`. */
  readonly kjMask = input(false, { transform: booleanAttribute });

  /** When `true`, emits `kjComplete` once the code is fully entered. */
  readonly kjAutoSubmit = input(false, { transform: booleanAttribute });

  /** Reflects invalid state via `aria-invalid` (touched-gated). */
  readonly kjInvalid = input(false, { transform: booleanAttribute });

  /** Disables all cells and the root. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Sets all cells to `readonly`. */
  readonly kjReadonly = input(false, { transform: booleanAttribute });

  /**
   * Accessible label for the widget (used when there is no parent `KjFormField`).
   */
  readonly kjAriaLabel = input<string>('');

  /**
   * Indices after which to render a visual separator dash.
   * E.g. `[2]` renders `123–456` for a 6-digit code.
   * Purely decorative — the separator never appears in the form value.
   */
  readonly kjSeparatorAfter = input<readonly number[]>([]);

  // ── Outputs ─────────────────────────────────────────────────────────────────

  /** Emitted when the full code is entered. */
  readonly kjComplete = output<string>();

  /** Emitted after a paste distributes characters across cells. */
  readonly kjPasted = output<string>();

  // ── Internal ─────────────────────────────────────────────────────────────────

  /** The inner `KjInputOtp` directive that owns the CVA logic. */
  private readonly _otp = viewChild.required(KjInputOtp);

  /** The array of cell indices `[0, 1, ..., kjLength-1]`. */
  readonly _indices = computed(() =>
    Array.from({ length: this.kjLength() }, (_, i) => i),
  );

  /** Buffered CVA calls made before the view is initialised. */
  private _pendingValue: string | null = null;
  private _pendingOnChange: ((val: string) => void) | null = null;
  private _pendingOnTouched: (() => void) | null = null;
  private _pendingDisabled: boolean | null = null;
  private _viewReady = false;

  ngAfterViewInit(): void {
    this._viewReady = true;
    const ctrl = this._otp().formCtrl;
    if (this._pendingValue !== null) ctrl.writeValue(this._pendingValue);
    if (this._pendingOnChange !== null) ctrl.registerOnChange(this._pendingOnChange as (val: unknown) => void);
    if (this._pendingOnTouched !== null) ctrl.registerOnTouched(this._pendingOnTouched);
    if (this._pendingDisabled !== null) ctrl.setDisabledState(this._pendingDisabled);
  }

  // ── ControlValueAccessor ─────────────────────────────────────────────────────

  writeValue(value: string | null): void {
    const v = value ?? '';
    if (this._viewReady) {
      this._otp().formCtrl.writeValue(v);
    } else {
      this._pendingValue = v;
    }
  }

  registerOnChange(fn: (val: string) => void): void {
    if (this._viewReady) {
      this._otp().formCtrl.registerOnChange(fn as (val: unknown) => void);
    } else {
      this._pendingOnChange = fn;
    }
  }

  registerOnTouched(fn: () => void): void {
    if (this._viewReady) {
      this._otp().formCtrl.registerOnTouched(fn);
    } else {
      this._pendingOnTouched = fn;
    }
  }

  setDisabledState(isDisabled: boolean): void {
    if (this._viewReady) {
      this._otp().formCtrl.setDisabledState(isDisabled);
    } else {
      this._pendingDisabled = isDisabled;
    }
  }
}
