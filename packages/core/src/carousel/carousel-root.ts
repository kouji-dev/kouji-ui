import {
  Signal,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  booleanAttribute,
  Directive,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  KJ_CAROUSEL,
  KjCarouselAlign,
  KjCarouselAutoplayRef,
  KjCarouselContext,
  KjCarouselControlPattern,
  KjCarouselIndicatorsContext,
  KjCarouselOrientation,
  KjCarouselSlideRef,
  KjCarouselViewportRef,
} from './carousel.context';
import { KjId } from '../primitives/overlay/id';
import { KjReducedMotion } from '../motion/reduced-motion';

/**
 * Root carousel directive — region landmark, source of truth for the active
 * slide, and orchestrator for orientation, loop semantics, autoplay gating,
 * and the live-region announcement cadence.
 *
 * The directive itself owns no DOM beyond the host element; it sits at the
 * outermost element of the carousel composition (the one wearing
 * `role="region"` + `aria-roledescription="carousel"`) and exposes
 * `KJ_CAROUSEL` to descendants for the per-slide ARIA wiring, the
 * previous / next / indicator controls, and the autoplay / pause directives.
 *
 * @example
 * ```html
 * <div kjCarousel kjLabel="Featured products" [(kjValue)]="active">
 *   <button kjCarouselPrevious aria-label="Previous slide">‹</button>
 *   <div kjCarouselViewport>
 *     <div kjCarouselSlide kjSlideValue="a">…</div>
 *     <div kjCarouselSlide kjSlideValue="b">…</div>
 *   </div>
 *   <button kjCarouselNext aria-label="Next slide">›</button>
 *   <div kjCarouselIndicators></div>
 * </div>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name carousel
 * @doc-description Unstyled carousel root that owns slide state, autoplay, loop semantics, and ARIA announcements.
 * @doc-is-main
 */
@Directive({
  selector: '[kjCarousel]',
  standalone: true,
  exportAs: 'kjCarousel',
  providers: [{ provide: KJ_CAROUSEL, useExisting: KjCarousel }],
  host: {
    '[attr.role]': '"region"',
    '[attr.aria-roledescription]': '"carousel"',
    '[attr.aria-label]': 'kjLabel() ?? null',
    '[attr.aria-labelledby]': 'kjLabelledby() ?? null',
    '[attr.aria-orientation]': 'kjOrientation()',
    '[attr.data-paused]': 'paused() ? "" : null',
    '[attr.data-autoplay]': 'autoplayActive() ? "" : null',
    '[attr.data-orientation]': 'kjOrientation()',
  },
})
export class KjCarousel implements KjCarouselContext {
  private readonly platformId = inject(PLATFORM_ID);
  /** Deterministic id root for this carousel — see the note on `KjId`. */
  private readonly idSeed = inject(KjId).mint('carousel');

  /** Two-way bound active slide value. `null` defers to the first registered slide on mount. */
  readonly kjValue = model<string | null>(null);

  /** When true, prev / next wrap around. Boundary buttons go disabled when false. */
  readonly kjLoop = input(false, { transform: booleanAttribute });

  /** Carousel orientation. Drives the scroll-snap axis and the keyboard mapping. */
  readonly kjOrientation = input<KjCarouselOrientation>('horizontal');

  /** Number of slides visible in the viewport at once. `'auto'` defers to slide content widths. */
  readonly kjSlidesPerView = input<number | 'auto'>(1);

  /** Number of slides moved per `next()` / `prev()` call. Independent of slides-per-view. */
  readonly kjSlidesPerAdvance = input<number>(1);

  /** Default slide alignment within the viewport. Per-slide override via `KjCarouselSlide.kjSlideAlign`. */
  readonly kjAlign = input<KjCarouselAlign>('start');

  /** Accessible name for the region. Either this or `kjLabelledby` is required for WCAG 4.1.2. */
  readonly kjLabel = input<string | undefined>(undefined);

  /** Id of an external label element. Either this or `kjLabel` is required. */
  readonly kjLabelledby = input<string | undefined>(undefined);

  /** When false, native scroll drag is blocked on the viewport (programmatic advance still works). */
  readonly kjDraggable = input(true, { transform: booleanAttribute });

  /** Read-only mirror of the orientation for context consumers. */
  readonly orientation: Signal<KjCarouselOrientation> = this.kjOrientation;

  /** Read-only mirror of the loop flag for context consumers. */
  readonly loop: Signal<boolean> = this.kjLoop;

  // ── Slide registration ────────────────────────────────────────────────
  private readonly _slides = signal<readonly KjCarouselSlideRef[]>([]);
  /** Public read-only registration list, in DOM order. */
  readonly slides = this._slides.asReadonly();

  /** Total count of registered slides (excluding loop clones, which are DOM-only). */
  readonly slideCount = computed(() => this._slides().length);

  /** Current value, normalised to `null` when the registered set does not contain it. */
  readonly currentValue = computed<string | null>(() => {
    const v = this.kjValue();
    if (v == null) return null;
    return this._slides().some((s) => slideValueOf(s) === v) ? v : null;
  });

  /** Index of the active slide in registration order; -1 when nothing is active. */
  readonly currentIndex = computed(() => {
    const v = this.currentValue();
    if (v == null) return -1;
    return this._slides().findIndex((s) => slideValueOf(s) === v);
  });

  // ── Autoplay gating ───────────────────────────────────────────────────
  private readonly _userPaused = signal(false);
  private readonly _hovering = signal(false);
  private readonly _focusWithin = signal(false);
  private readonly _autoplay = signal<KjCarouselAutoplayRef | null>(null);
  private readonly _liveRegion = signal<{ announce: (msg: string) => void } | null>(null);

  /** True only when the user has explicitly paused (gate 3). */
  readonly paused: Signal<boolean> = this._userPaused.asReadonly();

  /** Whether an autoplay directive is registered. */
  readonly autoplayRegistered = computed(() => this._autoplay() != null);

  /** Whether autoplay should currently be ticking (all five gates open). */
  readonly autoplayActive = computed(() => {
    if (!this._autoplay()) return false;
    if (this._motion.prefersReducedMotion()) return false;
    if (this._userPaused()) return false;
    const ap = this._autoplay()!;
    if (ap.kjPauseOnHover() && this._hovering()) return false;
    if (ap.kjPauseOnFocus() && this._focusWithin()) return false;
    return true;
  });

  /**
   * Shared, app-wide `prefers-reduced-motion` reader. One `matchMedia`
   * subscription for the whole application rather than one per carousel.
   */
  private readonly _motion = inject(KjReducedMotion);

  // ── Viewport reference (set by KjCarouselViewport on mount) ───────────
  private _viewport: KjCarouselViewportRef | null = null;

  // ── Indicator-group registration (used by slides to flip role to tabpanel) ─
  private readonly _indicators = signal<KjCarouselIndicatorsContext | null>(null);
  /** Read-only mirror of the active control pattern (or `'buttons'` when no indicators are mounted). */
  readonly controlPattern = computed<KjCarouselControlPattern>(
    () => this._indicators()?.controlPattern() ?? 'buttons',
  );

  constructor() {
    // Default-value reconciliation: when kjValue is null and slides have registered,
    // adopt the first slide.
    effect(() => {
      const list = this._slides();
      const current = this.kjValue();
      if (current == null && list.length > 0) {
        const first = untracked(() => list[0]);
        if (first) {
          queueMicrotask(() => {
            const value = slideValueOf(first);
            if (value != null && this.kjValue() == null) this.kjValue.set(value);
          });
        }
      }
    });

    // Programmatic-advance bridge: when kjValue changes (via next/prev/goTo or
    // an external two-way bind), scroll the viewport to the new slide.
    effect(() => {
      const value = this.currentValue();
      if (value == null) return;
      // Run outside the effect's tracking by deferring to a microtask.
      queueMicrotask(() => this.scrollToValue(value));
    });
  }

  /** @internal Slide registration. */
  registerSlide(slide: KjCarouselSlideRef): void {
    this._slides.update((list) => (list.includes(slide) ? list : [...list, slide]));
  }

  /** @internal Slide un-registration. */
  unregisterSlide(slide: KjCarouselSlideRef): void {
    this._slides.update((list) => list.filter((s) => s !== slide));
  }

  /** @internal Viewport association. */
  registerViewport(vp: KjCarouselViewportRef): void {
    this._viewport = vp;
  }

  /** @internal Viewport teardown. */
  unregisterViewport(vp: KjCarouselViewportRef): void {
    if (this._viewport === vp) this._viewport = null;
  }

  /** @internal Autoplay registration. */
  registerAutoplay(ap: KjCarouselAutoplayRef): void {
    this._autoplay.set(ap);
  }

  /** @internal Autoplay teardown. */
  unregisterAutoplay(ap: KjCarouselAutoplayRef): void {
    if (this._autoplay() === ap) this._autoplay.set(null);
  }

  /** @internal Indicator-group registration (used by slide role flip). */
  registerIndicators(ind: KjCarouselIndicatorsContext): void {
    this._indicators.set(ind);
  }

  /** @internal Indicator-group teardown. */
  unregisterIndicators(ind: KjCarouselIndicatorsContext): void {
    if (this._indicators() === ind) this._indicators.set(null);
  }

  /** @internal Live-region announcer registration (set by the wrapper). */
  registerLiveRegion(lr: { announce: (msg: string) => void } | null): void {
    this._liveRegion.set(lr);
  }

  /** @internal Hover/focus state setters used by the host listeners. */
  setHovering(v: boolean): void { this._hovering.set(v); }
  setFocusWithin(v: boolean): void { this._focusWithin.set(v); }

  /** Whether the slide for `value` is the active one. */
  isActive(value: string): boolean {
    return this.currentValue() === value;
  }

  /** Stable id for the viewport element (consumed by Previous/Next as `aria-controls`). */
  viewportId(): string {
    return `kj-carousel-viewport-${this.idSeed}`;
  }

  /** Stable id for the slide identified by `value`. */
  slideId(value: string): string {
    return `kj-carousel-slide-${value}-${this.idSeed}`;
  }

  /** Imperative: advance to the next slide. No-op at the last slide when `kjLoop` is false. */
  next(): void {
    const list = this._slides();
    if (!list.length) return;
    const advance = Math.max(1, this.kjSlidesPerAdvance());
    const idx = this.currentIndex();
    let nextIdx = idx + advance;
    if (nextIdx >= list.length) {
      if (this.kjLoop()) nextIdx = nextIdx % list.length;
      else nextIdx = list.length - 1;
    }
    if (nextIdx === idx) return;
    this.kjValue.set(list[nextIdx].kjSlideValue());
  }

  /** Imperative: advance to the previous slide. No-op at the first slide when `kjLoop` is false. */
  prev(): void {
    const list = this._slides();
    if (!list.length) return;
    const advance = Math.max(1, this.kjSlidesPerAdvance());
    const idx = this.currentIndex();
    let nextIdx = idx - advance;
    if (nextIdx < 0) {
      if (this.kjLoop()) nextIdx = ((nextIdx % list.length) + list.length) % list.length;
      else nextIdx = 0;
    }
    if (nextIdx === idx) return;
    this.kjValue.set(list[nextIdx].kjSlideValue());
  }

  /** Imperative: jump to a slide by value. Silently ignores unknown values. */
  goTo(value: string): void {
    const list = this._slides();
    if (!list.some((s) => s.kjSlideValue() === value)) return;
    if (this.kjValue() !== value) this.kjValue.set(value);
  }

  /** Imperative: explicitly pause autoplay. Persists across slide changes (gate 3). */
  pause(): void {
    if (!this._userPaused()) {
      this._userPaused.set(true);
      this.announce('Autoplay paused');
    }
  }

  /** Imperative: explicitly resume autoplay (clears gate 3). */
  play(): void {
    if (this._userPaused()) {
      this._userPaused.set(false);
      this.announce('Autoplay resumed');
    }
  }

  /** @internal Whether the boundary is reached (used by Previous/Next disabled binding). */
  atStart(): boolean {
    return !this.kjLoop() && this.currentIndex() <= 0;
  }

  atEnd(): boolean {
    return !this.kjLoop() && this.currentIndex() >= this._slides().length - 1;
  }

  /** Push a polite announcement (user-initiated changes only — autoplay path skips this). */
  announce(message: string): void {
    const lr = this._liveRegion();
    if (lr) lr.announce(message);
  }

  /**
   * Build the announcement string for a settled user-initiated advance:
   * `"Slide 3 of 7: <label>"`. Returns `null` if the value is not registered.
   */
  buildSlideAnnouncement(value: string): string | null {
    const list = this._slides();
    const idx = list.findIndex((s) => s.kjSlideValue() === value);
    if (idx === -1) return null;
    const slide = list[idx];
    const label = slide.kjSlideLabel();
    const base = `Slide ${idx + 1} of ${list.length}`;
    return label ? `${base}: ${label}` : base;
  }

  /** @internal Whether reduced motion is currently in force. */
  prefersReducedMotion(): boolean {
    return this._motion.prefersReducedMotion();
  }

  /** @internal Programmatic scrolling — invoked from the kjValue effect and from goTo/next/prev callers. */
  private scrollToValue(value: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const vp = this._viewport;
    if (!vp) return;
    const slide = this._slides().find((s) => s.kjSlideValue() === value);
    if (!slide) return;
    const slideEl = slide.el.nativeElement;
    const vpEl = vp.el.nativeElement;
    const orientation = this.kjOrientation();
    const reduced = this._motion.prefersReducedMotion();
    const opts: ScrollToOptions = {
      behavior: reduced ? 'auto' : 'smooth',
    };
    if (orientation === 'horizontal') {
      opts.left = slideEl.offsetLeft - vpEl.offsetLeft;
    } else {
      opts.top = slideEl.offsetTop - vpEl.offsetTop;
    }
    if (typeof vpEl.scrollTo === 'function') {
      vpEl.scrollTo(opts);
    }
  }
}

/** Angular's NG0950 — a required input read before its first binding. */
function isUnsetRequiredInput(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === -950;
}

/**
 * A slide's `kjSlideValue`, or `null` while it is still unbound.
 *
 * `KjCarouselSlide` registers itself in its constructor (so registration order
 * is DOM order), but Angular binds inputs on the first change detection that
 * follows. A slide created through `ViewContainerRef.createComponent` — a
 * route, a dialog, or a server render — is therefore in `slides()` for one
 * turn before `kjSlideValue` has a value, and reading it directly throws
 * NG0950. The read still registers the dependency, so every computed here
 * recomputes as soon as the value arrives.
 */
function slideValueOf(slide: { kjSlideValue: () => string }): string | null {
  try {
    return slide.kjSlideValue();
  } catch (error) {
    if (isUnsetRequiredInput(error)) return null;
    throw error;
  }
}
