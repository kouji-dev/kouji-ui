/**
 * Pointer-to-value math for `[kjSlider]`. Pure functions kept outside the
 * directive so they can be unit-tested without an Angular `TestBed`.
 *
 * Rules:
 * - Horizontal LTR: `value = min + (px - left) / width * range`.
 * - Horizontal RTL: invert the X axis before mapping.
 * - Vertical: top of the track = `max`, bottom = `min`.
 * - `inverted` flips the visual axis after the orientation/RTL transform.
 * - Output is clamped to `[min, max]` but **not** snapped — snapping is the
 *   directive's responsibility (it owns `kjStep` / `kjStepBase`).
 */

export interface KjSliderGeometryArgs {
  readonly min: number;
  readonly max: number;
  readonly orientation: 'horizontal' | 'vertical';
  readonly direction: 'ltr' | 'rtl';
  readonly inverted: boolean;
  readonly trackRect: DOMRect | DOMRectReadOnly;
}

/** Map client coordinates to a value in `[min, max]` (no snapping). */
export function valueFromClientPosition(
  clientX: number,
  clientY: number,
  args: KjSliderGeometryArgs,
): number {
  const { min, max, orientation, direction, inverted, trackRect } = args;
  const range = max - min;
  if (range <= 0) return min;

  let fraction: number;
  if (orientation === 'vertical') {
    // top = max, bottom = min
    const denom = trackRect.height || 1;
    fraction = (trackRect.bottom - clientY) / denom;
  } else {
    const denom = trackRect.width || 1;
    if (direction === 'rtl') {
      fraction = (trackRect.right - clientX) / denom;
    } else {
      fraction = (clientX - trackRect.left) / denom;
    }
  }

  if (inverted) fraction = 1 - fraction;

  // Clamp the fraction first, then map. Avoids tiny FP drift past bounds.
  if (fraction <= 0) return min;
  if (fraction >= 1) return max;
  const value = min + fraction * range;

  // Coerce values within EPSILON*range of the bounds to the exact bound.
  const eps = Number.EPSILON * range;
  if (Math.abs(value - min) <= eps) return min;
  if (Math.abs(value - max) <= eps) return max;
  return value;
}

/** Position fraction `[0..1]` for a value, post-orientation/RTL/inverted. */
export function fractionForValue(
  value: number,
  args: Pick<KjSliderGeometryArgs, 'min' | 'max' | 'inverted'>,
): number {
  const range = args.max - args.min;
  if (range <= 0) return 0;
  let f = (value - args.min) / range;
  if (f < 0) f = 0;
  else if (f > 1) f = 1;
  if (args.inverted) f = 1 - f;
  return f;
}
