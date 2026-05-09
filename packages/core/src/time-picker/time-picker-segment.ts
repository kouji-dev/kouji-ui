import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KJ_TIME_PICKER, KjTimePickerContext } from './time-picker.context';
import {
  KjHourCycle,
  fromDisplayHour,
  hourBounds,
  is12Hour,
  pad2,
  toDisplayHour,
} from './time-picker.format';

type SegmentKind = 'hour' | 'minute' | 'second';

/**
 * Internal helper that wires a single time-segment `<input>` to the time-picker
 * context. Concrete segments (`hours`, `minutes`, `seconds`) each set their
 * `kind` and consume this base via composition through the directive class
 * hierarchy.
 *
 * Each segment exposes the WAI-ARIA `spinbutton` contract
 * (<https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/>) on its host:
 * `aria-valuemin` / `aria-valuemax` / `aria-valuenow` / `aria-valuetext`.
 * @doc
 * @doc-name time-picker
 */
@Directive({ standalone: true })
export abstract class KjTimePickerSegmentBase {
  protected abstract readonly kind: SegmentKind;
  protected readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);
  /** @internal */
  readonly ctx = inject<KjTimePickerContext>(KJ_TIME_PICKER);

  /** Forwarded to `[attr.aria-label]`. Defaults to a sensible English label. */
  readonly kjAriaLabel = input<string | null>(null);

  /** Disable typing. Stepping still works via Arrow keys when the directive is focused. */
  readonly kjReadonly = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Display value (zero-padded 2-digit string for the segment). */
  readonly displayValue = computed(() => {
    const parts = this.ctx.value();
    if (parts == null) return '';
    if (this.kind === 'minute') return pad2(parts.minute);
    if (this.kind === 'second') return pad2(parts.second);
    return pad2(toDisplayHour(parts.hour, this.ctx.hourCycle()));
  });

  /** `aria-valuemin` / `aria-valuemax` for the segment. */
  readonly minBound = computed(() => {
    if (this.kind === 'minute' || this.kind === 'second') return 0;
    return hourBounds(this.ctx.hourCycle()).min;
  });
  readonly maxBound = computed(() => {
    if (this.kind === 'minute' || this.kind === 'second') return 59;
    return hourBounds(this.ctx.hourCycle()).max;
  });

  /** Current numeric value (display, in the segment's coordinate space). */
  readonly numericValue = computed(() => {
    const parts = this.ctx.value();
    if (parts == null) return null;
    if (this.kind === 'minute') return parts.minute;
    if (this.kind === 'second') return parts.second;
    return toDisplayHour(parts.hour, this.ctx.hourCycle());
  });

  readonly ariaValueText = computed(() => {
    const v = this.numericValue();
    if (v == null) return null;
    return pad2(v);
  });

  readonly resolvedAriaLabel = computed(() => {
    if (this.kjAriaLabel() != null) return this.kjAriaLabel();
    if (this.kind === 'hour') return 'Hours';
    if (this.kind === 'minute') return 'Minutes';
    return 'Seconds';
  });

  readonly disabled = computed(() => this.ctx.disabled());
  readonly effectiveReadonly = computed(() => this.kjReadonly() || this.ctx.readonly());

  constructor() {
    // Reflect numeric model to the input's text content.
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const next = this.displayValue();
      const el = this.el.nativeElement;
      if (el && this.doc.activeElement !== el && el.value !== next) {
        el.value = next;
      }
    });
  }

  /** @internal */
  onFocus(): void {
    const el = this.el.nativeElement;
    if (el) el.select?.();
  }

  /** @internal */
  onBlur(): void {
    this.commitFromBuffer();
  }

  /** @internal */
  onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    // Strip non-digits.
    const filtered = el.value.replace(/\D+/g, '').slice(0, 2);
    if (filtered !== el.value) el.value = filtered;
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    if (this.ctx.disabled()) return;
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.ctx.stepSegment(this.kind, 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.ctx.stepSegment(this.kind, -1);
        break;
      case 'Home': {
        event.preventDefault();
        const min = this.minBound();
        const cycle = this.ctx.hourCycle();
        if (this.kind === 'hour') {
          const meridiem: 'am' | 'pm' = (this.ctx.value()?.hour ?? 0) >= 12 ? 'pm' : 'am';
          this.ctx.setSegment('hour', is12Hour(cycle) ? fromDisplayHour(min, cycle, meridiem) : min);
        } else {
          this.ctx.setSegment(this.kind, min);
        }
        break;
      }
      case 'End': {
        event.preventDefault();
        const max = this.maxBound();
        const cycle = this.ctx.hourCycle();
        if (this.kind === 'hour') {
          const meridiem: 'am' | 'pm' = (this.ctx.value()?.hour ?? 0) >= 12 ? 'pm' : 'am';
          this.ctx.setSegment('hour', is12Hour(cycle) ? fromDisplayHour(max, cycle, meridiem) : max);
        } else {
          this.ctx.setSegment(this.kind, max);
        }
        break;
      }
      case 'Enter':
        event.preventDefault();
        this.commitFromBuffer();
        break;
    }
  }

  protected commitFromBuffer(): void {
    if (this.effectiveReadonly() || this.ctx.disabled()) return;
    const el = this.el.nativeElement;
    if (!el) return;
    const raw = el.value.trim();
    if (raw === '') {
      // Restore display from current model.
      el.value = this.displayValue();
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      el.value = this.displayValue();
      return;
    }
    if (this.kind === 'minute' || this.kind === 'second') {
      this.ctx.setSegment(this.kind, n);
    } else {
      const cycle = this.ctx.hourCycle();
      if (is12Hour(cycle)) {
        const meridiem: 'am' | 'pm' = (this.ctx.value()?.hour ?? 0) >= 12 ? 'pm' : 'am';
        const hour24 = fromDisplayHour(n, cycle, meridiem);
        this.ctx.setSegment('hour', hour24);
      } else {
        this.ctx.setSegment('hour', cycle === 'h24' && n === 24 ? 0 : n);
      }
    }
  }
}

/**
 * Hours segment. `role="spinbutton"` over a 2-digit hour value. Min/max depend
 * on the resolved hour cycle (`h11`: 0–11, `h12`: 1–12, `h23`: 0–23,
 * `h24`: 1–24).
 *
 * @example
 * ```html
 * <input kjTimePickerHours />
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name time-picker
 */
@Directive({
  selector: '[kjTimePickerHours]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    '[attr.role]': '"spinbutton"',
    '[attr.inputmode]': '"numeric"',
    '[attr.aria-valuemin]': 'minBound()',
    '[attr.aria-valuemax]': 'maxBound()',
    '[attr.aria-valuenow]': 'numericValue() ?? null',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-readonly]': 'effectiveReadonly() ? "true" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.readonly]': 'effectiveReadonly() ? "" : null',
    '[attr.maxlength]': '2',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjTimePickerHours extends KjTimePickerSegmentBase {
  protected readonly kind = 'hour' as const;
}

/**
 * Minutes segment. `role="spinbutton"`, range 0–59. ArrowUp / ArrowDown step
 * by `kjStep` minutes (defaults to `1`).
 *
 * @example
 * ```html
 * <input kjTimePickerMinutes />
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name time-picker
 */
@Directive({
  selector: '[kjTimePickerMinutes]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    '[attr.role]': '"spinbutton"',
    '[attr.inputmode]': '"numeric"',
    '[attr.aria-valuemin]': 'minBound()',
    '[attr.aria-valuemax]': 'maxBound()',
    '[attr.aria-valuenow]': 'numericValue() ?? null',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-readonly]': 'effectiveReadonly() ? "true" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.readonly]': 'effectiveReadonly() ? "" : null',
    '[attr.maxlength]': '2',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjTimePickerMinutes extends KjTimePickerSegmentBase {
  protected readonly kind = 'minute' as const;
}

/**
 * Seconds segment (optional). `role="spinbutton"`, range 0–59.
 *
 * @example
 * ```html
 * <input kjTimePickerSeconds />
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name time-picker
 */
@Directive({
  selector: '[kjTimePickerSeconds]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    '[attr.role]': '"spinbutton"',
    '[attr.inputmode]': '"numeric"',
    '[attr.aria-valuemin]': 'minBound()',
    '[attr.aria-valuemax]': 'maxBound()',
    '[attr.aria-valuenow]': 'numericValue() ?? null',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-readonly]': 'effectiveReadonly() ? "true" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.readonly]': 'effectiveReadonly() ? "" : null',
    '[attr.maxlength]': '2',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjTimePickerSeconds extends KjTimePickerSegmentBase {
  protected readonly kind = 'second' as const;
}

/** Re-exported for the period directive's use. */
export type { KjHourCycle };
