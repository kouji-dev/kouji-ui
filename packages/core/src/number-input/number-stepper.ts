import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  numberAttribute,
  output,
} from '@angular/core';
import { KJ_NUMBER_INPUT, KjNumberInputContext } from './number-input.context';

/**
 * Sibling stepper button for `[kjNumberInput]`. Owns increment / decrement
 * activations on click / Enter / Space and a long-press auto-repeat cycle on
 * pointer-hold (500 ms initial → 100 ms → 50 ms after 10 ticks).
 *
 * Reflects bounds-aware `aria-disabled` (`value >= max` for `up`,
 * `value <= min` for `down`) and intercepts capture-phase activation when
 * effective-disabled, mirroring `KjButton`. The host is forced to
 * `type="button"` so a press inside a `<form>` does not submit it.
 *
 * Expects to find a `KjNumberInput` either via an enclosing
 * `[kjNumberInputGroup]` (canonical) or via the `[kjNumberStepperFor]`
 * template-ref escape hatch.
 *
 * @example
 * ```html
 * <div kjNumberInputGroup>
 *   <button kjButton kjNumberStepper kjStep="down" aria-label="Decrease">−</button>
 *   <input kjNumberInput [(kjValue)]="qty" [kjMin]="0" [kjMax]="100" />
 *   <button kjButton kjNumberStepper kjStep="up" aria-label="Increase">+</button>
 * </div>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name number-input
 */
@Directive({
  selector: '[kjNumberStepper]',
  standalone: true,
  host: {
    '[attr.type]': '"button"',
    '[attr.aria-label]': 'kjAriaLabel()',
    '[attr.aria-controls]': 'controlledId()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.tabindex]': '"-1"',
    '(click)': 'onClick($event)',
    '(keydown.enter)': 'onActivate($event)',
    '(keydown.space)': 'onActivate($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'cancelRepeat()',
    '(pointerleave)': 'cancelRepeat()',
    '(pointercancel)': 'cancelRepeat()',
  },
})
export class KjNumberStepper {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly groupCtx = inject<KjNumberInputContext>(KJ_NUMBER_INPUT, { optional: true });

  /** Direction. Required — no default. */
  readonly kjStep = input.required<'up' | 'down'>();

  /** Per-button override of the input's `kjStep`. */
  readonly kjStepAmount = input<number | undefined, unknown>(undefined, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v)),
  });

  /** Optional escape-hatch reference to a `[kjNumberInput]`. */
  readonly kjNumberStepperFor = input<KjNumberInputContext | null>(null);

  /** Required for icon-only stepper buttons. */
  readonly kjAriaLabel = input<string | null>(null);

  /** Forwarded to the host's effective-disabled. ORed with bounds-disabled. */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Emits the new value after each step. */
  readonly kjStepped = output<number>();

  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private repeatTicks = 0;

  protected readonly target = computed<KjNumberInputContext | null>(
    () => this.kjNumberStepperFor() ?? this.groupCtx ?? null,
  );

  protected readonly controlledId = computed(() => {
    const t = this.target();
    if (!t) return null;
    // The input's host id is set via `[attr.id]` from KjNumberInput. Reach for the element.
    // `t` is the directive instance — we don't expose a public `inputId()` on the context, so
    // we fall back to scanning the DOM in afterNextRender. For now, return null and rely on the
    // wrapper to wire `aria-controls` via DOM-id when needed.
    return null;
  });

  /** Bounds-aware effective disabled. */
  protected readonly effectiveDisabled = computed(() => {
    if (this.kjDisabled()) return true;
    const t = this.target();
    if (!t) return false;
    if (t.disabled() || t.readonly()) return true;
    const v = t.value();
    if (v == null) return false;
    return this.kjStep() === 'up' ? v >= t.max() : v <= t.min();
  });

  constructor() {
    // Capture-phase click suppression mirrors KjButton: stops consumer (click)
    // listeners from firing when the stepper is effective-disabled.
    afterNextRender(() => {
      const handler = (event: Event) => {
        if (this.effectiveDisabled()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };
      this.el.nativeElement.addEventListener('click', handler, { capture: true });
      this.destroyRef.onDestroy(() => {
        this.el.nativeElement.removeEventListener('click', handler, { capture: true });
        this.cancelRepeat();
      });
    });
  }

  /** @internal */
  onClick(event: Event): void {
    if (this.effectiveDisabled()) {
      event.preventDefault();
      return;
    }
    this.tick();
  }

  /** @internal */
  onActivate(event: Event): void {
    if (this.effectiveDisabled()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.tick();
  }

  /** @internal */
  onPointerDown(event: PointerEvent): void {
    if (this.effectiveDisabled()) {
      event.preventDefault();
      return;
    }
    // Preserve focus on the input — clicking the stepper must not move focus.
    event.preventDefault();
    this.cancelRepeat();
    this.timeoutId = setTimeout(() => {
      this.intervalId = setInterval(() => {
        this.repeatTicks++;
        this.tick();
        if (this.repeatTicks === 10 && this.intervalId !== null) {
          clearInterval(this.intervalId);
          this.intervalId = setInterval(() => this.tick(), 50);
        }
      }, 100);
    }, 500);
  }

  /** @internal */
  cancelRepeat(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.repeatTicks = 0;
  }

  private tick(): void {
    const t = this.target();
    if (!t) return;
    const units = this.kjStep() === 'up' ? 1 : -1;
    t.stepBy(units, this.kjStepAmount());
    const v = t.value();
    if (v != null) this.kjStepped.emit(v);
  }
}
