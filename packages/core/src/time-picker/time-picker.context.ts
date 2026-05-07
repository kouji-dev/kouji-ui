import { InjectionToken, Signal } from '@angular/core';
import type { KjHourCycle, TimeParts } from './time-picker.format';

/**
 * Shared state published by `[kjTimePicker]` (the wrapper) and consumed by
 * sibling segment / period directives.
 *
 * The wrapper owns the value, hour cycle, granularity and step config; each
 * segment is a thin spinbutton that reads and writes through this contract.
 */
export interface KjTimePickerContext {
  readonly value: Signal<TimeParts | null>;
  readonly hourCycle: Signal<KjHourCycle>;
  readonly showSeconds: Signal<boolean>;

  readonly hourStep: Signal<number>;
  readonly minuteStep: Signal<number>;
  readonly secondStep: Signal<number>;

  readonly min: Signal<TimeParts | null>;
  readonly max: Signal<TimeParts | null>;

  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly invalid: Signal<boolean>;

  /** Apply `n` step units to a segment. Carries on overflow. */
  stepSegment(segment: 'hour' | 'minute' | 'second', units: number): void;
  /** Set a segment's value directly. Clamps + carries / wraps per config. */
  setSegment(segment: 'hour' | 'minute' | 'second', value: number): void;
  /** Toggle AM / PM (hour ± 12, mod 24). No-op when not in 12h mode. */
  togglePeriod(): void;
  /** Set the meridiem explicitly. No-op when not in 12h mode. */
  setMeridiem(period: 'am' | 'pm'): void;
}

/** DI token used to share the time-picker context with descendant directives. */
export const KJ_TIME_PICKER = new InjectionToken<KjTimePickerContext>('KjTimePicker');
