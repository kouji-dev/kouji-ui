import {
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
} from '@angular/core';
import { KjDirectionality } from '../primitives/directionality/directionality';
import { KjDisabled } from '../primitives/interaction/disabled';
import { clamp, snapToStep } from '../number-input/number-input.format';
import {
  KJ_SLIDER,
  KjSliderContext,
  KjSliderSource,
  KjSliderThumbHandle,
} from './slider.context';
import { valueFromClientPosition } from './slider.geometry';

/**
 * Headless root of the `KjSlider` directive family. Owns bounds (`kjMin` /
 * `kjMax` / `kjStep` / `kjPageStep` / `kjStepBase`), orientation, RTL,
 * inverted axis, range-mode coordination (min-distance, swap policy), tick
 * definition, and a per-mode value sugar (`kjValue` for single-thumb,
 * `kjRange` for two-thumb). Publishes `KJ_SLIDER` to descendants.
 *
 * Composition shape (mirrors Radix):
 *
 * ```html
 * <div kjSlider [(kjValue)]="volume" [kjMin]="0" [kjMax]="100" [kjStep]="1">
 *   <div kjSliderTrack>
 *     <div kjSliderRange></div>
 *     <button kjSliderThumb kjAriaLabel="Volume" type="button"></button>
 *   </div>
 * </div>
 * ```
 *
 * In single mode, `[(kjValue)]` mirrors the lone `[kjSliderThumb]` value.
 * In range mode, bind `[(kjRange)]` (a `[number, number]` tuple) at the root,
 * or two independent `[(kjValue)]`s on the two thumbs (with `KjFormControl`
 * carrying each one through Angular Forms — natural validators).
 *
 * Per-thumb `KjFormControl` lives on the thumb directive, not here. The root
 * coordinates: it enforces `kjMinDistance` and `kjAllowThumbCross`, narrows
 * each thumb's `aria-valuemin/max` to the partner-thumb position, and
 * exposes the dragging / active-thumb state for the wrapper visuals.
 *
 * @doc-css-var
 *   --kj-slider-track-thickness  — Track width on vertical / height on horizontal.
 *   --kj-slider-track-bg         — Track (unfilled portion) background.
 *   --kj-slider-fill-bg          — Filled-range background between thumbs (or start → thumb).
 *   --kj-slider-thumb-size       — Visual diameter of the thumb circle.
 *   --kj-slider-thumb-hit        — Invisible hit area / touch target around the thumb. 2.75rem for WCAG 2.5.5.
 *   --kj-slider-thumb-bg         — Thumb background fill.
 *   --kj-slider-thumb-fg         — Thumb foreground (icon/text inside) color.
 *   --kj-slider-thumb-border     — Thumb border shorthand. Halos the thumb against the track.
 *   --kj-slider-tick-size        — Diameter of optional tick marks.
 *   --kj-slider-tick-bg          — Tick mark color.
 *   --kj-slider-radius           — Track and fill corner radius. Defaults to a pill.
 *   --kj-slider-vertical-length  — Default rail length when orientation is vertical.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name slider
 * @doc-description Unstyled slider root for single or range value selection with bounds, orientation, RTL, and ticks.
 * @doc-is-main
 */
@Directive({
  selector: '[kjSlider]',
  standalone: true,
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  providers: [{ provide: KJ_SLIDER, useExisting: KjSlider }],
  exportAs: 'kjSlider',
  host: {
    '[attr.role]': 'role()',
    '[attr.data-orientation]': 'kjOrientation()',
    '[attr.data-direction]': 'direction()',
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
    '[attr.data-readonly]': 'kjReadonly() ? "" : null',
    '[attr.data-dragging]': 'dragging() ? "" : null',
  },
})
export class KjSlider implements KjSliderContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly directionality = inject(KjDirectionality);

  // ── Bounds ────────────────────────────────────────────────────────────────

  /** Lower bound. Reflected as `aria-valuemin` on each thumb. */
  readonly kjMin = input<number, unknown>(0, { transform: numberAttribute });

  /** Upper bound. Reflected as `aria-valuemax` on each thumb. */
  readonly kjMax = input<number, unknown>(100, { transform: numberAttribute });

  /** Increment unit. `0` (or non-positive) means continuous (no snap). */
  readonly kjStep = input<number, unknown>(1, { transform: numberAttribute });

  /** PageUp / PageDown step. Defaults to `max(kjStep * 10, range / 10)`. */
  readonly kjPageStep = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** Lattice base for snap-to-step. Defaults to `kjMin`. */
  readonly kjStepBase = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  // ── Layout ────────────────────────────────────────────────────────────────

  /** Visual orientation. Reflected as `aria-orientation` on each thumb. */
  readonly kjOrientation = input<'horizontal' | 'vertical'>('horizontal');

  /** RTL handling. `'auto'` reads from the injected `KjDirectionality`. */
  readonly kjDirection = input<'ltr' | 'rtl' | 'auto'>('auto');

  /** Visually flips the axis without changing the keyboard contract. */
  readonly kjInverted = input<boolean, unknown>(false, { transform: booleanAttribute });

  // ── Range coordination ───────────────────────────────────────────────────

  /** Minimum delta in *value* units between low and high in range mode. */
  readonly kjMinDistance = input<number, unknown>(0, { transform: numberAttribute });

  /** When `true`, low/high silently swap when crossed. Off by default. */
  readonly kjAllowThumbCross = input<boolean, unknown>(false, { transform: booleanAttribute });

  // ── Tick + display ───────────────────────────────────────────────────────

  /** Tick definition. `false` (default) renders no ticks; `'auto'` per-step; explicit array for irregular ticks. */
  readonly kjTicks = input<readonly number[] | 'auto' | false>(false);

  /** Formatter for `aria-valuetext` / value bubble. Receives the thumb index. */
  readonly kjDisplayWith = input<((value: number, thumbIndex: number) => string) | undefined>(undefined);

  // ── State ────────────────────────────────────────────────────────────────

  /** Read-only state. Drag and key both ignored; thumbs remain focusable. */
  readonly kjReadonly = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Effective-disabled. Composed via `KjDisabled`. */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  // ── Sugar models ─────────────────────────────────────────────────────────

  /** Single-mode sugar. Mirrors the single child thumb's value. */
  readonly kjValue = model<number | undefined>(undefined);

  /** Range-mode sugar. Mirrors `[low, high]` in stable order. */
  readonly kjRange = model<readonly [number, number] | undefined>(undefined);

  // ── Outputs ──────────────────────────────────────────────────────────────

  /** Fires per-tick during drag and per-keypress; high frequency. */
  readonly kjInput = output<{
    value: number | readonly [number, number];
    thumbIndex: number;
    source: KjSliderSource;
  }>();

  /** Fires once per committed change (pointerup, keypress, programmatic). */
  readonly kjCommit = output<number | readonly [number, number]>();

  /** Pointerdown on a thumb (after threshold). */
  readonly kjDragStart = output<{ thumbIndex: number }>();

  /** Pointerup / Esc-during-drag. */
  readonly kjDragEnd = output<{ thumbIndex: number; cancelled: boolean }>();

  // ── Internal state ───────────────────────────────────────────────────────

  private readonly _thumbs = signal<readonly KjSliderThumbHandle[]>([]);
  private readonly _trackEl = signal<HTMLElement | null>(null);
  private readonly _dragging = signal(false);
  private readonly _activeThumbIndex = signal<number | null>(null);

  // ── Public computed signals (KjSliderContext) ────────────────────────────

  readonly min = computed(() => this.kjMin());
  readonly max = computed(() => this.kjMax());
  readonly step = computed(() => this.kjStep());
  readonly pageStep = computed(() => {
    const explicit = this.kjPageStep();
    if (explicit !== undefined && explicit > 0) return explicit;
    const range = this.max() - this.min();
    const stepTen = this.step() * 10;
    return Math.max(stepTen > 0 ? stepTen : 1, range / 10);
  });
  readonly stepBase = computed(() => this.kjStepBase() ?? this.min());

  readonly orientation = computed(() => this.kjOrientation());
  readonly direction = computed<'ltr' | 'rtl'>(() => {
    const d = this.kjDirection();
    if (d === 'rtl') return 'rtl';
    if (d === 'ltr') return 'ltr';
    return this.directionality.current();
  });
  readonly inverted = computed(() => this.kjInverted());

  readonly minDistance = computed(() => this.kjMinDistance());
  readonly allowThumbCross = computed(() => this.kjAllowThumbCross());

  readonly disabled = computed(() => this.kjDisabled());
  readonly readonly = computed(() => this.kjReadonly());
  readonly dragging = this._dragging.asReadonly();
  readonly activeThumbIndex = this._activeThumbIndex.asReadonly();

  readonly thumbs = this._thumbs.asReadonly();
  readonly trackElement = this._trackEl.asReadonly();

  readonly ticks = computed<readonly number[]>(() => {
    const t = this.kjTicks();
    if (t === false) return [];
    if (Array.isArray(t)) return t;
    // 'auto' — generate per-step ticks, capped at 100.
    const step = this.step();
    const min = this.min();
    const max = this.max();
    if (step <= 0 || max <= min) return [];
    const count = Math.floor((max - min) / step) + 1;
    if (count > 100) return [];
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(min + i * step);
    return out;
  });

  readonly displayWith = computed(() => this.kjDisplayWith());

  /** `'group'` for range, `'slider'` is on the thumb instead — root has no role in single mode. */
  protected readonly role = computed(() => (this._thumbs().length > 1 ? 'group' : null));

  constructor() {
    // After every render pass, if the thumb registry has new entries
    // since last sort, re-sort by DOM order. This handles the case where
    // child directives register before their host elements are connected
    // (e.g. inside an @if/@for block) and `compareDocumentPosition`
    // would return DISCONNECTED at registration time.
    afterNextRender(() => {
      if (this.pendingReindex) {
        this.pendingReindex = false;
        this.reindexThumbs();
      }
    });

    // Sugar `[(kjValue)]` ↔ single thumb sync. Read thumb values via
    // `untracked` so this effect runs only when the consumer mutates
    // `kjValue` or the thumb registry changes — not when the thumb's
    // own `kjValue` updates (which would create a feedback loop).
    effect(() => {
      const v = this.kjValue();
      const thumbs = this._thumbs();
      if (v == null) return;
      if (thumbs.length === 1) {
        const handle = thumbs[0];
        if (untracked(() => handle.value()) !== v) handle.setValue(v, 'programmatic');
      }
    });

    // Sugar `[(kjRange)]` ↔ two-thumb sync. Stable-ordered.
    effect(() => {
      const r = this.kjRange();
      const thumbs = this._thumbs();
      if (!r) return;
      if (thumbs.length !== 2) return;
      const [a, b] = r;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const cur0 = untracked(() => thumbs[0].value());
      const cur1 = untracked(() => thumbs[1].value());
      if (cur0 !== lo) thumbs[0].setValue(lo, 'programmatic');
      if (cur1 !== hi) thumbs[1].setValue(hi, 'programmatic');
    });
  }

  // ── KjSliderContext.registerThumb / unregisterThumb ──────────────────────

  registerThumb(handle: KjSliderThumbHandle): void {
    this._thumbs.update((existing) => {
      if (existing.includes(handle)) return existing;
      const next = [...existing, handle];
      next.forEach((h, i) => ((h as { index: number }).index = i));
      return next;
    });
    // DOM-order sort is deferred until the elements are in the document
    // (compareDocumentPosition on disconnected nodes is unreliable). The
    // root's afterNextRender pass re-sorts once everything is rendered.
    this.pendingReindex = true;
  }

  /** Re-sort the thumb registry by current DOM order and re-assign indices. */
  private reindexThumbs(): void {
    this._thumbs.update((existing) => {
      if (existing.length <= 1) return existing;
      const next = [...existing];
      next.sort((a, b) => orderIndex(a.element, b.element));
      const changed = next.some((h, i) => h !== existing[i]);
      next.forEach((h, i) => ((h as { index: number }).index = i));
      return changed ? next : existing;
    });
  }

  private pendingReindex = false;

  unregisterThumb(handle: KjSliderThumbHandle): void {
    this._thumbs.update((existing) => {
      const next = existing.filter((h) => h !== handle);
      next.forEach((h, i) => ((h as { index: number }).index = i));
      return next;
    });
  }

  setTrackElement(el: HTMLElement | null): void {
    this._trackEl.set(el);
  }

  // ── KjSliderContext.setThumbValue (the coordination policy) ──────────────

  setThumbValue(thumbIndex: number, value: number, source: KjSliderSource): void {
    if (this.disabled() || this.readonly()) return;
    const thumbs = this._thumbs();
    const handle = thumbs[thumbIndex];
    if (!handle) return;

    // Clamp + snap first.
    let next = clamp(value, this.min(), this.max());
    next = snapToStep(next, this.step(), this.stepBase());

    // Apply cross-thumb policy in range mode.
    if (thumbs.length === 2) {
      const minDist = this.minDistance();
      if (this.allowThumbCross()) {
        // Allowed: assign as-is, but re-sort if the user crossed.
        handle.setValue(next, source);
        const [low, high] = thumbs;
        if (low.value() > high.value()) {
          // Swap their values.
          const lo = high.value();
          const hi = low.value();
          low.setValue(lo, source);
          high.setValue(hi, source);
        }
      } else {
        // Block: cannot pass partner ± minDist.
        if (thumbIndex === 0) {
          const ceiling = thumbs[1].value() - minDist;
          if (next > ceiling) next = ceiling;
        } else {
          const floor = thumbs[0].value() + minDist;
          if (next < floor) next = floor;
        }
        handle.setValue(next, source);
      }
    } else {
      handle.setValue(next, source);
    }

    // Mirror to sugar models.
    if (thumbs.length === 1) {
      const v = thumbs[0].value();
      if (this.kjValue() !== v) this.kjValue.set(v);
      this.kjInput.emit({ value: v, thumbIndex, source });
      if (source !== 'pointer' || !this._dragging()) {
        this.kjCommit.emit(v);
      }
    } else if (thumbs.length === 2) {
      const tuple: [number, number] = [thumbs[0].value(), thumbs[1].value()];
      const cur = this.kjRange();
      if (!cur || cur[0] !== tuple[0] || cur[1] !== tuple[1]) this.kjRange.set(tuple);
      this.kjInput.emit({ value: tuple, thumbIndex, source });
      if (source !== 'pointer' || !this._dragging()) {
        this.kjCommit.emit(tuple);
      }
    }
  }

  beginDrag(thumbIndex: number): void {
    this._dragging.set(true);
    this._activeThumbIndex.set(thumbIndex);
    this.kjDragStart.emit({ thumbIndex });
  }

  endDrag(cancelled = false): void {
    if (!this._dragging()) return;
    const idx = this._activeThumbIndex() ?? 0;
    this._dragging.set(false);
    this.kjDragEnd.emit({ thumbIndex: idx, cancelled });
    // Fire commit at drag-end so consumers get a single event per drag.
    const thumbs = this._thumbs();
    if (thumbs.length === 1) {
      this.kjCommit.emit(thumbs[0].value());
    } else if (thumbs.length === 2) {
      this.kjCommit.emit([thumbs[0].value(), thumbs[1].value()]);
    }
  }

  /** Find the thumb closest to `value`. Ties resolved by previously-active. */
  nearestThumbIndex(value: number): number {
    const thumbs = this._thumbs();
    if (thumbs.length <= 1) return 0;
    const distLo = Math.abs(thumbs[0].value() - value);
    const distHi = Math.abs(thumbs[1].value() - value);
    if (distLo < distHi) return 0;
    if (distHi < distLo) return 1;
    // Tie: prefer the previously-active, else high (so click-to-jump tends to widen).
    const active = this._activeThumbIndex();
    return active ?? 1;
  }

  valueFromClientPosition(clientX: number, clientY: number): number {
    const track = this._trackEl();
    if (!track) return this.min();
    return valueFromClientPosition(clientX, clientY, {
      min: this.min(),
      max: this.max(),
      orientation: this.orientation(),
      direction: this.direction(),
      inverted: this.inverted(),
      trackRect: track.getBoundingClientRect(),
    });
  }

  /** @internal — host element for diagnostics. */
  get hostElement(): HTMLElement {
    return this.el.nativeElement;
  }
}

function optionalNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** DOM-order comparator: `< 0` if `a` precedes `b`. */
function orderIndex(a: HTMLElement, b: HTMLElement): number {
  if (a === b) return 0;
  const pos = a.compareDocumentPosition(b);
  if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}
