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
import { KjFieldControl } from '../field/field-control';
import { KJ_TEXTAREA_CONFIG } from './config';
import { DOCUMENT } from '@angular/common';

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
 * `scrollHeight` as the value changes — coalesced to one measurement per
 * animation frame, against cached line-height / padding / border metrics —
 * clamps to `[kjMinRows, kjMaxRows]` rows, and pins `style.height`
 * accordingly. The user drag-handle is forced off (`resize: none`) while
 * auto-resize is on — mixing the two produces drift.
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
    // Inside a `[kjField]` this adopts the field's control id (so the
    // `[kjFieldLabel]` `for=` resolves), composes `aria-describedby` from the
    // help / error children and mirrors `aria-required`. It also OWNS
    // `aria-invalid` for this element — see `bindInvalid` in the constructor;
    // a second `[attr.aria-invalid]` binding here would race it, because two
    // host bindings on one attribute are last-writer-wins.
    { directive: KjFieldControl, inputs: ['kjDescribedBy'] },
  ],
  providers: [...bindPresets(KJ_TEXTAREA_CONFIG)],
  host: {
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
  private readonly fieldControl = inject(KjFieldControl, { self: true });
  private readonly el = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
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
    // One owner for `aria-invalid`: the composed `KjFieldControl` ORs this
    // touched-gated state with the enclosing `[kjField]`'s, so a textarea that
    // is valid itself still announces as invalid while its field is.
    this.fieldControl.bindInvalid(computed(() => this.formCtrl.touched() && this.kjInvalid()));

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

    // Auto-resize: the value signal is the SINGLE trigger. `onInput` calls
    // `formCtrl.notifyChange`, which writes that signal, so the old
    // belt-and-braces `measure()` in the host handler only bought a second
    // style recalc + forced layout on every keystroke.
    //
    // Mode / bounds: a binding change is also the moment the element's own CSS
    // may have moved (a size preset, a density switch), so drop the cached
    // metrics here — once per binding change, never per keystroke.
    effect(() => {
      this.kjAutoresize();
      this.kjMinRows();
      this.kjMaxRows();
      this.metrics = null;
      this.scheduleMeasure();
    });

    // Value: re-measure against the cached metrics.
    effect(() => {
      this.formCtrl.value();
      this.scheduleMeasure();
    });

    afterNextRender(() => {
      this.measure();
      const view = this.document.defaultView;
      const onResize = () => this.measure(true);
      view?.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => {
        view?.removeEventListener('resize', onResize);
        if (this.measureFrame) view?.cancelAnimationFrame(this.measureFrame);
        this.measureFrame = 0;
      });
      // A late-loading webfont changes the line height under us. `fonts.ready`
      // is a one-shot promise, so this costs no listener. (Absent in jsdom.)
      const fonts = (this.document as Document & { fonts?: FontFaceSet }).fonts;
      void fonts?.ready.then(() => this.measure(true));
    });
  }

  /** @internal — host (input) handler. */
  onInput(value: string): void {
    this.formCtrl.notifyChange(value);
  }

  /** Cached CSS metrics — only the element's own typography changes them. */
  private metrics: { lineHeight: number; paddingY: number; borderY: number } | null = null;
  /** Pending coalesced measure, if any. */
  private measureFrame = 0;

  /**
   * Coalesces a measure into the next animation frame, so a burst of value
   * changes in one turn forces layout once. Falls back to measuring
   * synchronously where `requestAnimationFrame` is unavailable (SSR guards
   * upstream, jsdom without a visual loop).
   */
  private scheduleMeasure(): void {
    if (this.kjAutoresize() !== 'auto') return;
    const view = this.document.defaultView;
    if (!view?.requestAnimationFrame) {
      this.measure();
      return;
    }
    if (this.measureFrame) return;
    this.measureFrame = view.requestAnimationFrame(() => {
      this.measureFrame = 0;
      this.measure();
    });
  }

  /**
   * Re-measures and pins the textarea height when `kjAutoresize === 'auto'`.
   * Safe to call any time; no-op when auto-resize is off.
   *
   * @param remeasureMetrics - re-read the cached line-height / padding /
   *   border metrics. They only change when the textarea's own typography
   *   does (a density or size switch, a webfont landing), which is why
   *   typing never pays for the `getComputedStyle` that reads them.
   */
  measure(remeasureMetrics = false): void {
    if (this.kjAutoresize() !== 'auto') return;
    const el = this.el.nativeElement;
    if (!el || typeof el.scrollHeight !== 'number') return;

    if (remeasureMetrics) this.metrics = null;
    const metrics = (this.metrics ??= this.readMetrics(el));
    if (!metrics) return;
    const { lineHeight, paddingY, borderY } = metrics;

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

  /** One `getComputedStyle` — the style recalculation the cache exists to avoid. */
  private readMetrics(
    el: HTMLTextAreaElement,
  ): { lineHeight: number; paddingY: number; borderY: number } | null {
    const view = this.document.defaultView;
    const cs = view?.getComputedStyle?.(el) ?? null;
    if (!cs) return null;
    return {
      lineHeight: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 20,
      paddingY: (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0),
      borderY: (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0),
    };
  }
}
