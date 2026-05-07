import { InjectionToken, Signal } from '@angular/core';

/** Source of a value mutation, used by analytics / wrapper announcements. */
export type KjSliderSource = 'pointer' | 'keyboard' | 'programmatic';

/**
 * Public handle each `[kjSliderThumb]` registers with the root.
 * Used by the root for cross-thumb coordination (min-distance, swap),
 * and by the track for click-to-jump nearest-thumb resolution.
 */
export interface KjSliderThumbHandle {
  /** DOM-order index. `0` for single mode, `0` (low) and `1` (high) for range. */
  readonly index: number;
  /** Current per-thumb value. */
  readonly value: Signal<number>;
  /** Underlying focusable host element. */
  readonly element: HTMLElement;
  /** Per-thumb effective disabled (root-OR-thumb). */
  readonly disabled: Signal<boolean>;
  /** Set the thumb's value. Performs clamp + snap and invokes the per-thumb CVA. */
  setValue(value: number, source: KjSliderSource): void;
  /** Move keyboard focus to the thumb. */
  focus(): void;
}

/**
 * Shared context published by `[kjSlider]` and consumed by
 * `[kjSliderTrack]`, `[kjSliderRange]`, `[kjSliderThumb]`, and
 * `[kjSliderTick]`.
 */
export interface KjSliderContext {
  // Bounds
  readonly min: Signal<number>;
  readonly max: Signal<number>;
  readonly step: Signal<number>;
  readonly pageStep: Signal<number>;
  readonly stepBase: Signal<number>;

  // Layout
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly direction: Signal<'ltr' | 'rtl'>;
  readonly inverted: Signal<boolean>;

  // Range coordination
  readonly minDistance: Signal<number>;
  readonly allowThumbCross: Signal<boolean>;

  // State
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly dragging: Signal<boolean>;
  readonly activeThumbIndex: Signal<number | null>;

  // Registry
  readonly thumbs: Signal<readonly KjSliderThumbHandle[]>;

  // Geometry (set by KjSliderTrack)
  readonly trackElement: Signal<HTMLElement | null>;

  // Tick definition
  readonly ticks: Signal<readonly number[]>;

  // Display / formatting
  readonly displayWith: Signal<((value: number, thumbIndex: number) => string) | undefined>;

  // Mutations
  registerThumb(handle: KjSliderThumbHandle): void;
  unregisterThumb(handle: KjSliderThumbHandle): void;
  setTrackElement(el: HTMLElement | null): void;
  setThumbValue(thumbIndex: number, value: number, source: KjSliderSource): void;
  beginDrag(thumbIndex: number): void;
  endDrag(cancelled?: boolean): void;
  /** Returns the index of the thumb closest to `value`, ties resolved by side (`px` half). */
  nearestThumbIndex(value: number): number;
  /** Convert client coordinates (px) to a slider value, respecting orientation/RTL/inverted. */
  valueFromClientPosition(clientX: number, clientY: number): number;
}

export const KJ_SLIDER = new InjectionToken<KjSliderContext>('KjSlider');
