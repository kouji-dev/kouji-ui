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
  model,
  signal,
} from '@angular/core';
import { KjDisabled } from '../primitives/forms/interaction/disabled';
import { KjFocusRing } from '../primitives/forms/interaction/focus-ring';
import { KjFormControl } from '../primitives/forms/form-control';
import { KJ_SLIDER, KjSliderSource, KjSliderThumbHandle } from './slider.context';
import { fractionForValue } from './slider.geometry';

let nextId = 0;

/**
 * Per-thumb directive. Owns `role="slider"`, `aria-valuemin/max/now/text`,
 * `aria-orientation`, the keyboard contract (Arrow / Page / Home / End),
 * pointer-drag with capture, and one `KjFormControl` per thumb so each
 * thumb is independently bindable through Angular Forms.
 *
 * Range mode is just two `[kjSliderThumb]`s as siblings inside one
 * `[kjSliderTrack]`. The root resolves DOM order to `index` (0 = low,
 * 1 = high) and narrows each thumb's `aria-valuemin/max` to the partner
 * thumb's position when `kjMinDistance` would otherwise place a value
 * out of reach.
 *
 * Composes `KjDisabled`, `KjFocusRing`, and `KjFormControl` via
 * `hostDirectives`. Effective disabled is the OR of root + per-thumb.
 *
 * @category Library/Data input
 */
@Directive({
  selector: '[kjSliderThumb]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  exportAs: 'kjSliderThumb',
  host: {
    '[attr.role]': '"slider"',
    '[attr.id]': 'thumbId()',
    '[attr.tabindex]': 'effectiveDisabled() ? -1 : 0',
    '[attr.aria-orientation]': 'ctx.orientation()',
    '[attr.aria-valuemin]': 'effectiveValueMin()',
    '[attr.aria-valuemax]': 'effectiveValueMax()',
    '[attr.aria-valuenow]': 'kjValue()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.aria-label]': 'kjAriaLabel()',
    '[attr.aria-labelledby]': 'kjAriaLabelledBy()',
    '[attr.data-orientation]': 'ctx.orientation()',
    '[attr.data-dragging]': 'dragging() ? "" : null',
    '[style.--kj-slider-thumb-fraction]': 'fraction()',
    '[style.touch-action]': '"none"',
    '(keydown)': 'onKeydown($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class KjSliderThumb implements KjSliderThumbHandle {
  /** @internal */
  readonly ctx = inject(KJ_SLIDER);
  /** @internal */
  readonly formCtrl = inject(KjFormControl);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  // ── Inputs ───────────────────────────────────────────────────────────────

  /** Per-thumb value. Two-way bindable. CVA-bridged via `KjFormControl`. */
  readonly kjValue = model<number>(0);

  /** Required when there is no `aria-labelledby` ancestor. */
  readonly kjAriaLabel = input<string | null>(null);

  /** Alternative to `kjAriaLabel`. */
  readonly kjAriaLabelledBy = input<string | null>(null);

  /** Per-thumb override of the root's `kjDisplayWith`. */
  readonly kjAriaValueText = input<string | null>(null);

  /** Per-thumb disable. ORed with the root's `kjDisabled`. */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  // ── Internal state ───────────────────────────────────────────────────────

  /** @internal — DOM-order index assigned by the root on register. Mutable for re-indexing. */
  index = 0;

  private readonly _dragging = signal(false);
  private readonly _id = `kj-slider-thumb-${++nextId}`;
  private dragStartValue: number | null = null;

  // ── KjSliderThumbHandle interface ────────────────────────────────────────

  /** @internal */
  readonly value = this.kjValue.asReadonly();

  /** @internal */
  get element(): HTMLElement {
    return this.el.nativeElement;
  }

  /** @internal */
  setValue(value: number, _source: KjSliderSource): void {
    if (this.kjValue() !== value) {
      this.kjValue.set(value);
      this.formCtrl.notifyChange(value);
    }
  }

  /** @internal */
  focus(): void {
    this.el.nativeElement.focus();
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  protected readonly thumbId = computed(() => this.el.nativeElement.id || this._id);

  /** OR of root + per-thumb disabled. */
  readonly effectiveDisabled = computed(
    () => this.ctx.disabled() || this.kjDisabled() || this.formCtrl.disabled(),
  );

  /** @internal */
  readonly disabled = this.effectiveDisabled;

  /** Effective `aria-valuemin` — narrowed to partner-thumb position in range mode. */
  protected readonly effectiveValueMin = computed(() => {
    const thumbs = this.ctx.thumbs();
    if (thumbs.length === 2 && this.index === 1) {
      return thumbs[0].value() + this.ctx.minDistance();
    }
    return this.ctx.min();
  });

  /** Effective `aria-valuemax` — narrowed to partner-thumb position in range mode. */
  protected readonly effectiveValueMax = computed(() => {
    const thumbs = this.ctx.thumbs();
    if (thumbs.length === 2 && this.index === 0) {
      return thumbs[1].value() - this.ctx.minDistance();
    }
    return this.ctx.max();
  });

  protected readonly ariaValueText = computed<string | null>(() => {
    const override = this.kjAriaValueText();
    if (override) return override;
    const formatter = this.ctx.displayWith();
    if (formatter) return formatter(this.kjValue(), this.index);
    // Continuous mode (step <= 0): truncate FP noise.
    if (this.ctx.step() <= 0) {
      try {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(this.kjValue());
      } catch {
        return String(this.kjValue());
      }
    }
    return null;
  });

  /** @internal — used by the wrapper layer to position the thumb visually. */
  readonly fraction = computed(() =>
    fractionForValue(this.kjValue(), {
      min: this.ctx.min(),
      max: this.ctx.max(),
      inverted: this.ctx.inverted(),
    }),
  );

  /** @internal */
  readonly dragging = this._dragging.asReadonly();

  constructor() {
    // Register with the root after construction so the host element exists.
    this.ctx.registerThumb(this);
    this.destroyRef.onDestroy(() => this.ctx.unregisterThumb(this));

    // Default the value to `min` if uninitialised. afterNextRender so the
    // host element is in DOM and the root has registered us first.
    afterNextRender(() => {
      const v = this.kjValue();
      if (!Number.isFinite(v)) {
        this.kjValue.set(this.ctx.min());
      }
    });

    // Bridge KjFormControl ↔ kjValue.
    effect(() => {
      const cvaValue = this.formCtrl.value();
      if (cvaValue == null || cvaValue === undefined) return;
      const num = typeof cvaValue === 'number' ? cvaValue : Number(cvaValue);
      if (Number.isFinite(num) && num !== this.kjValue()) {
        this.kjValue.set(num);
      }
    });
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.ctx.readonly()) return;
    const step = this.ctx.step() > 0 ? this.ctx.step() : 1;
    const pageStep = this.ctx.pageStep();
    const orientation = this.ctx.orientation();
    const rtl = this.ctx.direction() === 'rtl';

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.stepBy(step);
        return;
      case 'ArrowDown':
        event.preventDefault();
        this.stepBy(-step);
        return;
      case 'ArrowRight': {
        event.preventDefault();
        // Visual semantics: LTR right = increase; RTL right = decrease.
        // Vertical: right = increase too (APG: visual axis collapses to value axis).
        const sign = orientation === 'horizontal' && rtl ? -1 : 1;
        this.stepBy(sign * step);
        return;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const sign = orientation === 'horizontal' && rtl ? 1 : -1;
        this.stepBy(sign * step);
        return;
      }
      case 'PageUp':
        event.preventDefault();
        this.stepBy(pageStep);
        return;
      case 'PageDown':
        event.preventDefault();
        this.stepBy(-pageStep);
        return;
      case 'Home':
        event.preventDefault();
        this.ctx.setThumbValue(this.index, this.effectiveValueMin(), 'keyboard');
        return;
      case 'End':
        event.preventDefault();
        this.ctx.setThumbValue(this.index, this.effectiveValueMax(), 'keyboard');
        return;
      case 'Escape':
        if (this._dragging() && this.dragStartValue != null) {
          event.preventDefault();
          this.ctx.setThumbValue(this.index, this.dragStartValue, 'keyboard');
          this.endDrag(true);
        }
        return;
      default:
        return;
    }
  }

  /** @internal */
  onPointerDown(event: PointerEvent): void {
    if (this.effectiveDisabled() || this.ctx.readonly()) return;
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    this.dragStartValue = this.kjValue();
    this._dragging.set(true);
    this.ctx.beginDrag(this.index);

    const target = this.el.nativeElement;
    target.setPointerCapture?.(event.pointerId);
    target.focus();

    const onMove = (e: PointerEvent) => {
      if (!this._dragging()) return;
      const value = this.ctx.valueFromClientPosition(e.clientX, e.clientY);
      this.ctx.setThumbValue(this.index, value, 'pointer');
    };
    const onUp = () => {
      cleanup();
      this.endDrag(false);
    };
    const onCancel = () => {
      cleanup();
      this.endDrag(true);
    };
    const cleanup = () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
      target.removeEventListener('lostpointercapture', onCancel);
    };

    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);
    target.addEventListener('lostpointercapture', onCancel);
  }

  /** @internal */
  onFocus(): void {
    /* hook for KjFocusRing */
  }

  /** @internal */
  onBlur(): void {
    this.formCtrl.notifyTouched();
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private stepBy(delta: number): void {
    const next = this.kjValue() + delta;
    this.ctx.setThumbValue(this.index, next, 'keyboard');
  }

  private endDrag(cancelled: boolean): void {
    this._dragging.set(false);
    this.dragStartValue = null;
    this.ctx.endDrag(cancelled);
  }
}
