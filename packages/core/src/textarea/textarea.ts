import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';
import { KjSize, KjVariant, bindPresets } from '../presets';
import { KJ_TEXTAREA_CONFIG } from './config';

/**
 * Number-attribute transform that preserves `undefined` instead of mapping it
 * to `NaN` like Angular's built-in `numberAttribute`. Required so that
 * `[kjMaxLength]="undefined"` keeps the host attribute removed rather than
 * setting `maxlength="NaN"`.
 *
 * @internal
 */
function optionalNumberAttribute(v: number | string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Resize behavior override for `<textarea kjTextarea>`. Maps to CSS `resize`. */
export type KjTextareaResize = 'none' | 'vertical' | 'both';

/** Auto-resize mode for `<textarea kjTextarea>`. */
export type KjTextareaAutoresize = 'off' | 'auto';

/**
 * Enhances a native `<textarea>` with Angular forms integration, theme presets
 * (`kjVariant` / `kjSize`), focus-ring + disabled/invalid reflection, optional
 * auto-resize geometry, an optional character counter announcement, and a
 * `kjResize` CSS override.
 *
 * Composes:
 * - `KjFormControl` — `formControl` / `formControlName` / `ngModel` via CVA.
 * - `KjVariant` / `KjSize` — `data-variant` / `data-size` for theme styling.
 * - `KjFocusRing` — keyboard-only `data-focus-visible`.
 * - `KjDisabled` — `aria-disabled` / `data-disabled` reflection.
 *
 * Auto-resize: when `kjAutoresize="auto"`, the directive measures
 * `scrollHeight` on every input, clamps to `[kjMinRows, kjMaxRows]` rows, and
 * pins `style.height` accordingly. The user drag-handle is forced off
 * (`resize: none`) while auto-resize is on — mixing the two produces drift.
 *
 * Character counter: when `kjMaxLength` is set, the native `maxlength`
 * attribute is bound. The directive exposes a `remaining()` signal and emits
 * threshold-based ARIA announcements (≤ 20, ≤ 10, 0 remaining) to a polite
 * live region declared by the wrapper or consumer — never per-keystroke.
 *
 * @example
 * ```html
 * <textarea kjTextarea rows="4" [formControl]="bio"></textarea>
 *
 * <textarea kjTextarea kjAutoresize="auto" [kjMinRows]="2" [kjMaxRows]="8"
 *           [formControl]="bio"></textarea>
 * ```
 *
 * @doc
 *  @doc-file textarea.example.ts
 * @doc-category Core/Inputs
 * @doc-name textarea
 * @doc-description Adds forms integration, focus ring, and optional auto-resize and character-count announcements to a textarea.
 * @doc-is-main
 */
@Directive({
  selector: '[kjTextarea]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize,    inputs: ['kjSize'] },
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  providers: [...bindPresets(KJ_TEXTAREA_CONFIG)],
  host: {
    '[attr.aria-invalid]': 'formCtrl.touched() && kjInvalid() ? "true" : null',
    '[attr.data-invalid]': 'formCtrl.touched() && kjInvalid() ? "" : null',
    '[attr.disabled]': 'formCtrl.disabled() ? "" : null',
    '[attr.maxlength]': 'kjMaxLength() ?? null',
    '[attr.data-autoresize]': 'kjAutoresize() === "auto" ? "" : null',
    '[style.resize]': 'effectiveResize()',
    '(input)': 'onInput($any($event.target).value)',
    '(blur)': 'formCtrl.notifyTouched()',
  },
})
export class KjTextarea {
  readonly formCtrl = inject(KjFormControl);
  private readonly el = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the textarea is in an invalid state. Combined with `touched` for ARIA. */
  readonly kjInvalid = input(false, { transform: booleanAttribute });

  /**
   * Auto-resize mode. `'auto'` measures `scrollHeight` on each input and pins
   * height between `kjMinRows` and `kjMaxRows`. `'off'` (default) leaves the
   * height to native `rows` / CSS.
   */
  readonly kjAutoresize = input<KjTextareaAutoresize>('off');

  /** Minimum rows when `kjAutoresize="auto"`. Falls back to native `rows`, then 1. */
  readonly kjMinRows = input<number | undefined, number | string | undefined>(undefined, {
    transform: optionalNumberAttribute,
  });

  /** Maximum rows when `kjAutoresize="auto"`. Beyond this, `overflow-y: auto`. */
  readonly kjMaxRows = input<number | undefined, number | string | undefined>(undefined, {
    transform: optionalNumberAttribute,
  });

  /** Native `maxlength`. Required for the character counter. */
  readonly kjMaxLength = input<number | undefined, number | string | undefined>(undefined, {
    transform: optionalNumberAttribute,
  });

  /**
   * CSS `resize` override. Defaults to `'vertical'`. Forced to `'none'` when
   * `kjAutoresize === 'auto'` regardless of the bound value.
   */
  readonly kjResize = input<KjTextareaResize>('vertical');

  /** @internal Effective resize value once the autoresize override is applied. */
  protected readonly effectiveResize = computed<KjTextareaResize>(() =>
    this.kjAutoresize() === 'auto' ? 'none' : this.kjResize(),
  );

  /**
   * Characters remaining before `kjMaxLength`. `null` when no max is set.
   * Useful for wrappers that render a visible counter.
   */
  readonly remaining = computed<number | null>(() => {
    const max = this.kjMaxLength();
    if (max == null) return null;
    const val = this.formCtrl.value();
    const len = typeof val === 'string' ? val.length : 0;
    return Math.max(0, max - len);
  });

  /**
   * Threshold-based announcement string for the character counter, mirrored
   * into a polite live region by the wrapper. Empty string when no
   * announcement should fire on the current value (avoids per-keystroke
   * chatter).
   *
   * Crosses at: `kjMaxLength - 20`, `kjMaxLength - 10`, `0` remaining.
   */
  readonly counterAnnouncement = computed<string>(() => {
    const r = this.remaining();
    if (r == null) return '';
    if (r === 0) return 'Character limit reached';
    if (r === 10) return '10 characters remaining';
    if (r === 20) return '20 characters remaining';
    return '';
  });

  constructor() {
    // Reflect the CVA value signal back to the native textarea element. Same
    // posture as KjInput: skip null/undefined so an external [value] attribute
    // is preserved when no ngModel/formControl is wired.
    effect(() => {
      const val = this.formCtrl.value();
      if (val == null) return;
      const el = this.el.nativeElement;
      if (el.value !== String(val)) {
        el.value = String(val);
      }
    });

    // Auto-resize: re-measure on every value change and on first paint. The
    // `(input)` host binding also calls `measure()` so users see live growth
    // even without a form binding.
    effect(() => {
      // Tracking dependencies — autoresize toggles, value, and rows bounds.
      this.kjAutoresize();
      this.kjMinRows();
      this.kjMaxRows();
      this.formCtrl.value();
      this.measure();
    });

    afterNextRender(() => {
      this.measure();
      const onResize = () => this.measure();
      window.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    });
  }

  /** @internal — host (input) handler. */
  onInput(value: string): void {
    this.formCtrl.notifyChange(value);
    if (this.kjAutoresize() === 'auto') {
      this.measure();
    }
  }

  /**
   * Re-measures and pins the textarea height when `kjAutoresize === 'auto'`.
   * Safe to call any time; no-op when auto-resize is off.
   */
  measure(): void {
    if (this.kjAutoresize() !== 'auto') return;
    const el = this.el.nativeElement;
    if (!el || typeof el.scrollHeight !== 'number') return;

    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
    if (!cs) return;

    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 20;
    const paddingY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const borderY = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);

    const minRows = this.kjMinRows() ?? el.rows ?? 1;
    const maxRows = this.kjMaxRows();

    const minHeight = minRows * lineHeight + paddingY + borderY;
    const maxHeight = maxRows != null ? maxRows * lineHeight + paddingY + borderY : Infinity;

    // Collapse → measure → clamp. The transient 'auto' is single-frame.
    el.style.height = 'auto';
    const measured = el.scrollHeight;
    const clamped = Math.max(minHeight, Math.min(measured, maxHeight));
    el.style.height = `${clamped}px`;
    el.style.overflowY = measured > maxHeight ? 'auto' : 'hidden';
  }
}
