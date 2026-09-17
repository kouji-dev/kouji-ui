import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
  model,
} from '@angular/core';
import {
  KjSlider,
  KjSliderRange,
  KjSliderThumb,
  KjSliderTrack,
  coerceTicks,
  type KjSliderTicksInput,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjSlider` directive family.
 *
 * The host is `display: contents` — the directive's `[kjSlider]` lives on
 * an inner `<div>` that renders the track, fill, ticks, and one or two
 * focusable thumbs. Switch between single-thumb and range mode via the
 * model bindings: bind `[(kjValue)]` for single (number), or
 * `[(kjRange)]` for range (`[number, number]`).
 *
 * Inputs forward 1:1 to the directives below — bounds (`kjMin`, `kjMax`,
 * `kjStep`, `kjPageStep`), orientation, RTL/inversion, range coordination
 * (`kjMinDistance`, `kjAllowThumbCross`), tick definition, and the
 * `aria-valuetext` formatter (`kjDisplayWith`). Per-thumb accessible
 * names use `kjAriaLabel` (single) or `kjStartAriaLabel` /
 * `kjEndAriaLabel` (range).
 *
 * @doc-example Default
 *   A single-thumb 0–100 volume slider — the bare-minimum recipe.
 *   @doc-file slider.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — volume, price range, and a
 *   stepped rating selector. Use this as the copy-paste starting point.
 *   @doc-file slider.usage.example.ts
 * @doc-example Range (two thumbs)
 *   `[(kjRange)]` switches to two-thumb mode with min-distance coordination.
 *   @doc-file slider.range.example.ts
 * @doc-example With tick marks
 *   `kjTicks="auto"` or a numeric array renders tick glyphs along the track.
 *   @doc-file slider.with-marks.example.ts
 * @doc-example Vertical
 *   `kjOrientation="vertical"` flips the track and arrow-key mapping.
 *   @doc-file slider.vertical.example.ts
 * @doc-example Formatted value (Intl.NumberFormat)
 *   `kjDisplayWith` shapes `aria-valuetext` for currency / unit / percent.
 *   @doc-file slider.formatted.example.ts
 *
 * @doc-keyboard
 *   ArrowRight|ArrowUp   — Increment focused thumb by `kjStep`
 *   ArrowLeft|ArrowDown  — Decrement focused thumb by `kjStep`
 *   PageUp               — Increment by `kjPageStep` (when > 0)
 *   PageDown             — Decrement by `kjPageStep` (when > 0)
 *   Home                 — Jump to `kjMin`
 *   End                  — Jump to `kjMax`
 *   Tab                  — Moves focus between thumbs (range mode) and out
 *
 * @doc-aria
 *   role="slider"        — On each thumb `<button>`
 *   aria-valuemin        — Reflects `kjMin`
 *   aria-valuemax        — Reflects `kjMax`
 *   aria-valuenow        — Reflects the thumb's current value
 *   aria-valuetext       — Reflects `kjDisplayWith(value, thumbIndex)`
 *   aria-orientation     — Reflects `horizontal` / `vertical`
 *   aria-label           — Wired from `kjAriaLabel` (single) or `kjStartAriaLabel` / `kjEndAriaLabel` (range)
 *   aria-disabled        — Reflected on thumbs when `kjDisabled` is true
 *
 * @doc-touch
 *   Thumbs render at 1.25rem with a 44×44 hit-target halo via padding —
 *   meets WCAG 2.5.5 on touch devices. The track itself accepts click-to-jump.
 *
 * @doc-a11y
 *   Thumbs are real `<button>` elements so native focus, click, and form
 *   semantics work. Each thumb owns its own accessible name — in range
 *   mode use distinct `kjStartAriaLabel` / `kjEndAriaLabel` so SR users can
 *   tell them apart. Pair with a visible `aria-valuetext` formatter when
 *   the raw number is ambiguous (currency, dates, percentages).
 *
 * @doc-related number-input,progress-bar,form
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name slider
 * @doc-description Themed single or range slider with ticks, vertical orientation, and Intl-formatted values.
 * @doc-is-main
 */
@Component({
  selector: 'kj-slider',
  standalone: true,
  imports: [KjSlider, KjSliderTrack, KjSliderRange, KjSliderThumb],
  template: `
    <div
      kjSlider
      class="kj-slider"
      [(kjValue)]="kjValue"
      [kjRange]="kjRange() ?? null!"
      (kjRangeChange)="kjRange.set($event)"
      [kjMin]="kjMin()"
      [kjMax]="kjMax()"
      [kjStep]="kjStep()"
      [kjPageStep]="kjPageStep()"
      [kjStepBase]="kjStepBase()"
      [kjOrientation]="kjOrientation()"
      [kjDirection]="kjDirection()"
      [kjInverted]="kjInverted()"
      [kjMinDistance]="kjMinDistance()"
      [kjAllowThumbCross]="kjAllowThumbCross()"
      [kjTicks]="kjTicks()"
      [kjDisplayWith]="kjDisplayWith()"
      [kjReadonly]="kjReadonly()"
      [kjDisabled]="kjDisabled()"
    >
      <div kjSliderTrack class="kj-slider__track">
        <div kjSliderRange class="kj-slider__range"></div>

        @if (resolvedTicks().length > 0) {
          <div class="kj-slider__ticks" aria-hidden="true">
            @for (t of resolvedTicks(); track t.value) {
              <span
                class="kj-slider__tick"
                [style.--kj-slider-tick-fraction]="t.fraction"
              ></span>
            }
          </div>
        }

        @if (isRange()) {
          <!--
            In range mode, the root's [(kjRange)] fans out to both
            thumbs via the KjSlider directive's range effect after
            DOM-order sort. We do not pass [kjValue] here because the
            DOM-order resolution runs in afterNextRender (the elements
            are not yet connected at directive-construction time), so
            the root is the canonical writer.
          -->
          <button
            type="button"
            kjSliderThumb
            class="kj-slider__thumb"
            [attr.aria-label]="kjStartAriaLabel()"
            [kjAriaLabel]="kjStartAriaLabel()"
            [kjDisabled]="kjDisabled()"
          ></button>
          <button
            type="button"
            kjSliderThumb
            class="kj-slider__thumb"
            [attr.aria-label]="kjEndAriaLabel()"
            [kjAriaLabel]="kjEndAriaLabel()"
            [kjDisabled]="kjDisabled()"
          ></button>
        } @else {
          <button
            type="button"
            kjSliderThumb
            class="kj-slider__thumb"
            [kjValue]="singleValue()"
            [attr.aria-label]="kjAriaLabel()"
            [kjAriaLabel]="kjAriaLabel()"
            [kjDisabled]="kjDisabled()"
          ></button>
        }
      </div>
    </div>
  `,
  styleUrl: './slider.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSliderComponent {
  /** Single-thumb value. Mutually exclusive with `kjRange`. */
  readonly kjValue = model<number>(0);

  /** Range-mode value tuple. Setting this switches to two-thumb mode. */
  readonly kjRange = model<readonly [number, number] | undefined>(undefined);

  /** Lower bound of the value range. Defaults to `0`. */
  readonly kjMin = input<number>(0);

  /** Upper bound of the value range. Defaults to `100`. */
  readonly kjMax = input<number>(100);

  /** Arrow-key / drag increment in value units. Defaults to `1`. */
  readonly kjStep = input<number>(1);

  /** PageUp / PageDown increment. `0` (the default) falls back to ten steps. */
  readonly kjPageStep = input<number>(0);

  /** Value the step ladder is anchored to. Defaults to `0`. */
  readonly kjStepBase = input<number>(0);

  /** Visual axis, reflected as `aria-orientation` on each thumb. Defaults to `'horizontal'`. */
  readonly kjOrientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Reading direction. `'auto'` (the default) follows the ambient `KjDirectionality`. */
  readonly kjDirection = input<'ltr' | 'rtl' | 'auto'>('auto');

  /** Flips the axis visually without changing the keyboard contract. Defaults to `false`. */
  readonly kjInverted = input(false, { transform: booleanAttribute });

  /** Minimum gap, in value units, between the two thumbs in range mode. Defaults to `0`. */
  readonly kjMinDistance = input<number>(0);

  /** Lets the range thumbs swap places when dragged past each other. Defaults to `false`. */
  readonly kjAllowThumbCross = input(false, { transform: booleanAttribute });

  /**
   * Tick marks: `false` (the default) renders none, `'auto'` renders one per
   * step, or pass explicit values for irregular ticks.
   *
   * Not a plain boolean, so it cannot take `booleanAttribute` outright — but
   * the shared `coerceTicks` keeps the array and `'auto'` and folds the rest
   * through it, so a bare `kjTicks` means `'auto'` and `kjTicks="false"`
   * really means off.
   * @default false
   */
  readonly kjTicks = input<readonly number[] | 'auto' | false, KjSliderTicksInput>(false, {
    transform: coerceTicks,
  });

  /** Formats `aria-valuetext` and the value bubble. Defaults to `String(value)`. */
  readonly kjDisplayWith = input<(value: number, thumbIndex: number) => string>(
    (value: number) => String(value),
  );

  /** Ignores drag and keys while keeping the thumbs focusable. Defaults to `false`. */
  readonly kjReadonly = input(false, { transform: booleanAttribute });

  /** Disables the slider entirely and removes the thumbs from the tab order. Defaults to `false`. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Single-mode accessible label. */
  readonly kjAriaLabel = input<string>('');

  /** Range-mode accessible label for the lower thumb. */
  readonly kjStartAriaLabel = input<string>('Minimum');

  /** Range-mode accessible label for the upper thumb. */
  readonly kjEndAriaLabel = input<string>('Maximum');

  /** True when the consumer has bound `[(kjRange)]` or set both bounds. */
  protected readonly isRange = computed(() => this.kjRange() !== undefined);

  protected readonly singleValue = computed(() => this.kjValue() ?? this.kjMin());
  protected readonly rangeLow = computed(() => this.kjRange()?.[0] ?? this.kjMin());
  protected readonly rangeHigh = computed(() => this.kjRange()?.[1] ?? this.kjMax());

  /** Tick array resolved into `{ value, fraction }` for the wrapper to render. */
  protected readonly resolvedTicks = computed(() => {
    const t = this.kjTicks();
    const min = this.kjMin();
    const max = this.kjMax();
    const step = this.kjStep();
    const inverted = this.kjInverted();
    const range = max - min;
    if (range <= 0) return [];

    let values: number[] = [];
    if (Array.isArray(t)) values = [...t];
    else if (t === 'auto' && step > 0) {
      const count = Math.floor(range / step) + 1;
      if (count > 100) return [];
      for (let i = 0; i < count; i++) values.push(min + i * step);
    }
    return values.map((v) => {
      let f = (v - min) / range;
      if (f < 0) f = 0;
      else if (f > 1) f = 1;
      if (inverted) f = 1 - f;
      return { value: v, fraction: f };
    });
  });
}
