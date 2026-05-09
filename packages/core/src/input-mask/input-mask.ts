import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import {
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
} from '@angular/core';

import { KjInput } from '../input/input';
import { compileMask } from './input-mask.compile';
import { MaskEngine } from './input-mask.engine';
import { KJ_INPUT_MASK_TOKENS } from './input-mask.tokens';

/**
 * Applies a fixed-format mask to a native `<input>` element. Composes
 * `KjInput` via `hostDirectives` so all Angular forms integration (CVA,
 * `aria-invalid`, focus-ring, ARIA-disabled) applies unchanged.
 *
 * Supports `[(ngModel)]`, `[formControl]`, and `[formControlName]` bindings.
 * By default the model value is the **raw** (unmasked) alphanumerics
 * (`kjMaskMode="unmasked"`). Switch to `kjMaskMode="masked"` to commit the
 * full display string.
 *
 * Provides itself as an `NG_VALIDATORS` multi-validator. When the field has
 * been partially filled, `validate()` returns `{ mask: { expected, filled,
 * required } }`. An empty field does **not** trigger the mask error —
 * `Validators.required` handles that.
 *
 * @example
 * ```html
 * <input kjInputMask kjMask="(999) 999-9999" [(ngModel)]="phone" />
 * ```
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name input-mask
 * @doc-description Applies a fixed-format mask to a native input with caret handling and partial-fill validation.
 * @doc-is-main
 */
@Directive({
  selector: 'input[kjInputMask]',
  standalone: true,
  exportAs: 'kjInputMask',
  hostDirectives: [
    // KjInput already composes KjDisabled internally — do NOT add KjDisabled
    // here or it will match twice on the same element (NG0309).
    // kjDisabled is forwarded via our own input below and bound via the
    // KjDisabled instance injected from the host directive chain.
    { directive: KjInput, inputs: ['kjInvalid'] },
  ],
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => KjInputMask),
      multi: true,
    },
  ],
  host: {
    // Force type="text" — partially-masked values fail browser validation
    // for tel/email/number types, and autofill behaves better with text.
    '[attr.type]': '"text"',
    '[attr.inputmode]': 'autoInputMode()',
    '[attr.placeholder]': 'displayPlaceholder()',
    '(keydown)': 'engine.onKeydown($event)',
    '(paste)': 'engine.onPaste($event)',
    '(beforeinput)': 'engine.onBeforeInput($event)',
    '(compositionstart)': 'engine.onCompositionStart()',
    '(compositionend)': 'engine.onCompositionEnd($event)',
  },
})
export class KjInputMask implements Validator {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly kjInput = inject(KjInput);
  private readonly defaultTokens = inject(KJ_INPUT_MASK_TOKENS);

  // ── Inputs ────────────────────────────────────────────────────────────

  /** Mask template, e.g. `'(999) 999-9999'`, `'99/99/9999'`. Required. */
  readonly kjMask = input.required<string>();

  /**
   * Per-instance token overrides. Merged on top of `KJ_INPUT_MASK_TOKENS`
   * — entries here win. Use `provideKjInputMaskTokens` to set app-wide tokens.
   */
  readonly kjMaskTokens = input<Record<string, RegExp>>({});

  /**
   * What value is committed to the FormControl.
   * - `'unmasked'` (default) — raw alphanumerics only: `"4155551234"`.
   * - `'masked'` — full display string: `"(415) 555-1234"`.
   */
  readonly kjMaskMode = input<'unmasked' | 'masked'>('unmasked');

  /** Placeholder character shown in unfilled variable slots. @default '_' */
  readonly kjSlotChar = input<string>('_');

  /**
   * Forwarded to the inherited `KjDisabled` directive. Setting this disables
   * the input via `aria-disabled` / `data-disabled`.
   * @default false
   */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /**
   * When `true`, the field value is cleared on blur if the mask is incomplete.
   * Defaults to `false` — see analysis doc for rationale.
   */
  readonly kjAutoClear = input(false, { transform: booleanAttribute });

  /**
   * Override the auto-generated screen-reader format hint. Set to `''` to
   * suppress it entirely (when `KjField`'s hint slot already covers the format).
   */
  readonly kjFormatHint = input<string | undefined>(undefined);

  // ── Outputs ──────────────────────────────────────────────────────────

  /**
   * Emits once when every variable slot is filled.
   * Re-emits if the user clears and re-fills.
   * Useful for auto-advancing focus in card-entry UX.
   */
  readonly kjComplete = output<void>();

  // ── Computed state ───────────────────────────────────────────────────

  /** Compiled mask — recomputed when `kjMask` or `kjMaskTokens` change. */
  readonly compiled = computed(() =>
    compileMask(this.kjMask(), {
      ...this.defaultTokens,
      ...this.kjMaskTokens(),
    }),
  );

  /**
   * `inputmode` attribute — `'numeric'` when all variable slots are digit-only,
   * `'text'` otherwise. Mobile browsers show the right keyboard.
   */
  readonly autoInputMode = computed<string>(() => {
    const { slots, variableIndices } = this.compiled();
    if (variableIndices.length === 0) return 'text';
    const allDigit = variableIndices.every(i => {
      const slot = slots[i];
      return slot.kind === 'variable' && slot.tokenId === '9';
    });
    return allDigit ? 'numeric' : 'text';
  });

  /**
   * Placeholder string shown when no value is entered — literals keep their
   * characters, variable slots show `kjSlotChar`.
   */
  readonly displayPlaceholder = computed<string>(() => {
    const { slots } = this.compiled();
    const slotChar = this.kjSlotChar();
    return slots
      .map(slot => (slot.kind === 'literal' ? slot.char : slotChar))
      .join('');
  });

  /** The MaskEngine instance — stateful per-directive. */
  readonly engine: MaskEngine;

  // Track whether completion was already emitted for the current fill cycle.
  private _wasComplete = false;

  constructor() {
    const el = this.el;
    const formCtrl = this.kjInput.formCtrl;

    this.engine = new MaskEngine({
      getCompiled: () => this.compiled(),
      getSlotChar: () => this.kjSlotChar(),
      getMaskMode: () => this.kjMaskMode(),
      callbacks: {
        getValue: () => el.nativeElement.value,
        setValue: (val) => { el.nativeElement.value = val; },
        getCaret: () => el.nativeElement.selectionStart ?? 0,
        setCaret: (pos) => {
          // requestAnimationFrame defers the caret move so it runs after the
          // browser's own value-update microtask; without this, some browsers
          // reset selectionStart back to 0 after we set the value.
          requestAnimationFrame(() => {
            el.nativeElement.setSelectionRange(pos, pos);
          });
        },
        notifyChange: (val) => {
          formCtrl.notifyChange(val);
          // Check completion
          const { variableIndices } = this.compiled();
          const display = el.nativeElement.value;
          const slotChar = this.kjSlotChar();
          const filled = variableIndices.filter(i => {
            const ch = display[i];
            return ch && ch !== slotChar;
          }).length;
          const isComplete = filled === variableIndices.length;
          if (isComplete && !this._wasComplete) {
            this._wasComplete = true;
            this.kjComplete.emit();
          } else if (!isComplete) {
            this._wasComplete = false;
          }
        },
      },
    });

    // Reflect the form control value → display string (e.g. from setValue() calls).
    effect(() => {
      const val = formCtrl.value();
      if (val == null || val === undefined) return;
      const raw = String(val);
      this.engine.applyRawValue(raw);
    });

    // Auto-clear on blur if incomplete and kjAutoClear is enabled.
    el.nativeElement.addEventListener('blur', () => {
      if (!this.kjAutoClear()) return;
      const errors = this._computeErrors();
      if (errors) {
        el.nativeElement.value = this.displayPlaceholder();
        formCtrl.notifyChange('');
        this._wasComplete = false;
      }
    });
  }

  // ── Validator ────────────────────────────────────────────────────────

  /** @internal — called by Angular forms. */
  validate(_control: AbstractControl): ValidationErrors | null {
    return this._computeErrors();
  }

  private _computeErrors(): ValidationErrors | null {
    const { variableIndices } = this.compiled();
    const display = this.el.nativeElement.value;
    const slotChar = this.kjSlotChar();
    const mode = this.kjMaskMode();

    // Determine how many variable slots are filled in the current display.
    const filledCount = variableIndices.filter(i => {
      const ch = display[i];
      return ch && ch !== slotChar;
    }).length;

    // Empty (no filled slots) — let Validators.required handle it.
    if (filledCount === 0) return null;

    // If using unmasked mode, the control value is the raw string. Recalculate
    // filled from the control value length vs. variableCount.
    let effectiveFilled = filledCount;
    if (mode === 'unmasked') {
      const raw = String(this.kjInput.formCtrl.value() ?? '');
      effectiveFilled = Math.min(raw.length, variableIndices.length);
    }

    if (effectiveFilled < variableIndices.length) {
      return {
        mask: {
          expected: this.kjMask(),
          filled: effectiveFilled,
          required: variableIndices.length,
        },
      };
    }

    return null;
  }
}
