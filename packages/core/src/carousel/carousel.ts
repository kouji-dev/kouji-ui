import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Signal,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KjRovingTabindex, KjRovingTabindexItemDirective } from '../a11y/roving-tabindex';
import {
  KJ_CAROUSEL,
  KJ_CAROUSEL_INDICATORS,
  KJ_CAROUSEL_SLIDE,
  KjCarouselAlign,
  KjCarouselContext,
  KjCarouselControlPattern,
  KjCarouselIndicatorsContext,
  KjCarouselOrientation,
  KjCarouselSlideContext,
} from './carousel.context';

let kjCarouselSeedCounter = 0;
function nextSeed(): string {
  const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoLike?.randomUUID) return cryptoLike.randomUUID().slice(0, 8);
  return `kj${(++kjCarouselSeedCounter).toString(36)}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

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
 * @category Core/Data display
 * @doc
 * @doc-name carousel
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
  private readonly idSeed = nextSeed();

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
  private readonly _slides = signal<readonly KjCarouselSlide[]>([]);
  /** Public read-only registration list, in DOM order. */
  readonly slides = this._slides.asReadonly();

  /** Total count of registered slides (excluding loop clones, which are DOM-only). */
  readonly slideCount = computed(() => this._slides().length);

  /** Current value, normalised to `null` when the registered set does not contain it. */
  readonly currentValue = computed<string | null>(() => {
    const v = this.kjValue();
    if (v == null) return null;
    return this._slides().some((s) => s.kjSlideValue() === v) ? v : null;
  });

  /** Index of the active slide in registration order; -1 when nothing is active. */
  readonly currentIndex = computed(() => {
    const v = this.currentValue();
    if (v == null) return -1;
    return this._slides().findIndex((s) => s.kjSlideValue() === v);
  });

  // ── Autoplay gating ───────────────────────────────────────────────────
  private readonly _userPaused = signal(false);
  private readonly _hovering = signal(false);
  private readonly _focusWithin = signal(false);
  private readonly _autoplay = signal<KjCarouselAutoplay | null>(null);
  private readonly _liveRegion = signal<{ announce: (msg: string) => void } | null>(null);

  /** True only when the user has explicitly paused (gate 3). */
  readonly paused: Signal<boolean> = this._userPaused.asReadonly();

  /** Whether an autoplay directive is registered. */
  readonly autoplayRegistered = computed(() => this._autoplay() != null);

  /** Whether autoplay should currently be ticking (all five gates open). */
  readonly autoplayActive = computed(() => {
    if (!this._autoplay()) return false;
    if (this._reducedMotion()) return false;
    if (this._userPaused()) return false;
    const ap = this._autoplay()!;
    if (ap.kjPauseOnHover() && this._hovering()) return false;
    if (ap.kjPauseOnFocus() && this._focusWithin()) return false;
    return true;
  });

  /** Whether `prefers-reduced-motion: reduce` matches in the current environment. */
  private readonly _reducedMotion = signal(false);

  // ── Viewport reference (set by KjCarouselViewport on mount) ───────────
  private _viewport: KjCarouselViewport | null = null;

  // ── Indicator-group registration (used by slides to flip role to tabpanel) ─
  private readonly _indicators = signal<KjCarouselIndicators | null>(null);
  /** Read-only mirror of the active control pattern (or `'buttons'` when no indicators are mounted). */
  readonly controlPattern = computed<KjCarouselControlPattern>(
    () => this._indicators()?.controlPattern() ?? 'buttons',
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => {
        // Refresh reduced-motion any time after first render; effects gate on it.
        this._reducedMotion.set(prefersReducedMotion());
        const mql = typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-reduced-motion: reduce)')
          : null;
        if (mql) {
          const onChange = () => this._reducedMotion.set(mql.matches);
          if (typeof mql.addEventListener === 'function') {
            mql.addEventListener('change', onChange);
          }
        }
      });
    }

    // Default-value reconciliation: when kjValue is null and slides have registered,
    // adopt the first slide.
    effect(() => {
      const list = this._slides();
      const current = this.kjValue();
      if (current == null && list.length > 0) {
        const first = untracked(() => list[0]);
        if (first) {
          queueMicrotask(() => {
            if (this.kjValue() == null) this.kjValue.set(first.kjSlideValue());
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
  registerSlide(slide: KjCarouselSlide): void {
    this._slides.update((list) => (list.includes(slide) ? list : [...list, slide]));
  }

  /** @internal Slide un-registration. */
  unregisterSlide(slide: KjCarouselSlide): void {
    this._slides.update((list) => list.filter((s) => s !== slide));
  }

  /** @internal Viewport association. */
  registerViewport(vp: KjCarouselViewport): void {
    this._viewport = vp;
  }

  /** @internal Viewport teardown. */
  unregisterViewport(vp: KjCarouselViewport): void {
    if (this._viewport === vp) this._viewport = null;
  }

  /** @internal Autoplay registration. */
  registerAutoplay(ap: KjCarouselAutoplay): void {
    this._autoplay.set(ap);
  }

  /** @internal Autoplay teardown. */
  unregisterAutoplay(ap: KjCarouselAutoplay): void {
    if (this._autoplay() === ap) this._autoplay.set(null);
  }

  /** @internal Indicator-group registration (used by slide role flip). */
  registerIndicators(ind: KjCarouselIndicators): void {
    this._indicators.set(ind);
  }

  /** @internal Indicator-group teardown. */
  unregisterIndicators(ind: KjCarouselIndicators): void {
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
    return this._reducedMotion();
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
    const reduced = this._reducedMotion();
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

/**
 * Carousel viewport — the scroll container that hosts the slides. Owns
 * `overflow: hidden` (or `auto` when draggable), the scroll-snap axis, and
 * the `IntersectionObserver` that detects which slide has settled into view.
 *
 * Place inside `KjCarousel`. The viewport is *not* a tab stop — the previous
 * / next buttons and indicator dots cover the keyboard advance paths, and a
 * focusable scroll container conflicts with screen-reader virtual-cursor
 * navigation through the projected slide content.
 *
 * @category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselViewport]',
  standalone: true,
  exportAs: 'kjCarouselViewport',
  host: {
    '[attr.id]': 'carousel.viewportId()',
    '[attr.data-orientation]': 'carousel.orientation()',
    '[style.--kj-carousel-slides-per-view]': 'slidesPerViewVar()',
    '(mouseenter)': 'carousel.setHovering(true)',
    '(mouseleave)': 'carousel.setHovering(false)',
    '(focusin)': 'carousel.setFocusWithin(true)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class KjCarouselViewport implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  /** @internal */
  readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;
  /** @internal Native host element. */
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  private observer: IntersectionObserver | null = null;

  /** @internal Computed style variable feed for the slide flex-basis. */
  protected slidesPerViewVar(): string {
    const v = this.carousel.kjSlidesPerView();
    return v === 'auto' ? 'auto' : String(v);
  }

  ngOnInit(): void {
    this.carousel.registerViewport(this);
    if (isPlatformBrowser(this.platformId) && typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => this.onIntersect(entries),
        { root: this.el.nativeElement, threshold: [0.6] },
      );
      // Defer slide observation to the next microtask so registered slides have host elements.
      queueMicrotask(() => this.observeSlides());
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.carousel.unregisterViewport(this);
  }

  /** @internal */
  observeSlides(): void {
    if (!this.observer) return;
    for (const slide of this.carousel.slides()) {
      this.observer.observe(slide.el.nativeElement);
    }
  }

  /** @internal */
  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.el.nativeElement.contains(next)) {
      // Inspect the carousel root via the viewport's parentage — the host is
      // somewhere up the tree. If focus left the viewport but stayed within
      // the broader carousel root, leave focusWithin true; otherwise clear.
      // Conservative behaviour: clear on viewport blur — gate 5 only matters
      // for autoplay, and any subsequent focusin will re-set it.
      this.carousel.setFocusWithin(false);
    }
  }

  private lastBest: { ratio: number; value: string } | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    // Pick the entry with the highest ratio that crossed the threshold.
    let best: { ratio: number; el: Element } | null = null;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (!best || entry.intersectionRatio > best.ratio) {
        best = { ratio: entry.intersectionRatio, el: entry.target };
      }
    }
    if (!best) return;
    const slide = this.carousel.slides().find((s) => s.el.nativeElement === best!.el);
    if (!slide) return;
    const value = slide.kjSlideValue();
    if (this.carousel.currentValue() === value) return;

    // Debounce settle to avoid flicker when two slides cross 0.6 in the same frame.
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      // Only commit if this is still the best; in vertical-scroll cases the
      // browser may emit several entries before settling.
      const list = this.carousel.slides();
      if (!list.some((s) => s.kjSlideValue() === value)) return;
      const previous = this.carousel.currentValue();
      this.carousel.kjValue.set(value);
      // Announce only when the carousel is not currently auto-playing;
      // autoplay-driven advances are silent per APG to avoid AT flooding.
      if (previous !== null && previous !== value && !this.carousel.autoplayActive()) {
        const msg = this.carousel.buildSlideAnnouncement(value);
        if (msg) this.carousel.announce(msg);
      }
    }, 50);
  }
}

/**
 * Single slide. Hosts `role="group"` + `aria-roledescription="slide"` and
 * `aria-label="N of M[: <label>]"` (or `aria-labelledby` when a projected
 * heading id is supplied via the slide context). Switches to
 * `role="tabpanel"` when the parent indicator group is in
 * `controlPattern="tabs"` mode.
 *
 * @category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselSlide]',
  standalone: true,
  exportAs: 'kjCarouselSlide',
  providers: [{ provide: KJ_CAROUSEL_SLIDE, useExisting: KjCarouselSlide }],
  host: {
    '[attr.id]': 'slideLabelId()',
    '[attr.role]': 'role()',
    '[attr.aria-roledescription]': 'role() === "group" ? "slide" : null',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-active]': 'isActive() ? "" : null',
    '[attr.data-index]': 'index()',
  },
})
export class KjCarouselSlide implements KjCarouselSlideContext, OnInit, OnDestroy {
  /** @internal */
  readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;
  /** @internal Native host element. */
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Required string identifier for this slide. */
  readonly kjSlideValue = input.required<string>();

  /** Optional accessible name appended to `"N of M"` to form the slide's `aria-label`. */
  readonly kjSlideLabel = input<string | undefined>(undefined);

  /** Per-slide alignment override; defaults to the carousel's `kjAlign`. */
  readonly kjSlideAlign = input<KjCarouselAlign | undefined>(undefined);

  /** Read-only mirror of the slide value. */
  readonly value: Signal<string> = this.kjSlideValue;

  /** Index of this slide in registration order. */
  readonly index = computed(() =>
    this.carousel.slides().findIndex((s) => s === this),
  );

  /** Whether this slide is the currently active one. */
  readonly isActive = computed(() => this.carousel.isActive(this.kjSlideValue()));

  /** Stable id for the slide host element — sourced from the parent carousel so indicator `aria-controls` stays in sync. */
  readonly slideLabelId = computed(() => this.carousel.slideId(this.kjSlideValue()));

  /** Effective alignment — per-slide override beats carousel-level default. */
  readonly effectiveAlign = computed<KjCarouselAlign>(
    () => this.kjSlideAlign() ?? this.carousel.kjAlign(),
  );

  /** @internal Computed role — `'tabpanel'` when an indicators group in `controlPattern="tabs"` is registered, `'group'` otherwise. */
  protected role(): string {
    return this.carousel.controlPattern() === 'tabs' ? 'tabpanel' : 'group';
  }

  /** @internal Computed aria-label — `"N of M[: <label>]"` when in group mode. */
  protected ariaLabel(): string | null {
    if (this.role() !== 'group') return null;
    const total = this.carousel.slideCount();
    const idx = this.index();
    if (idx < 0) return null;
    const base = `${idx + 1} of ${total}`;
    const label = this.kjSlideLabel();
    return label ? `${base}: ${label}` : base;
  }

  ngOnInit(): void {
    this.carousel.registerSlide(this);
  }

  ngOnDestroy(): void {
    this.carousel.unregisterSlide(this);
  }
}

/**
 * Previous-slide control. Composes `KjFocusRing` and `KjDisabled`; when the
 * carousel is not looping and the current slide is the first, the host
 * receives `aria-disabled="true"` and click is a no-op.
 *
 * Apply to a real `<button>` so Enter / Space, focus, and disabled semantics
 * work without extra wiring.
 *
 * @category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselPrevious]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    '[attr.aria-controls]': 'carousel.viewportId()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class KjCarouselPrevious {
  /** @internal */
  readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;

  /** Whether the button is currently at the boundary (and not looping). */
  readonly disabled = computed(() => this.carousel.atStart());

  /** @internal */
  onClick(): void {
    if (this.disabled()) return;
    const previousValue = this.carousel.currentValue();
    this.carousel.prev();
    const next = this.carousel.currentValue();
    if (next != null && next !== previousValue) {
      const msg = this.carousel.buildSlideAnnouncement(next);
      if (msg) this.carousel.announce(msg);
    }
  }
}

/**
 * Next-slide control. Symmetric counterpart of `KjCarouselPrevious`.
 *
 * @category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselNext]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    '[attr.aria-controls]': 'carousel.viewportId()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class KjCarouselNext {
  /** @internal */
  readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;

  /** Whether the button is currently at the boundary (and not looping). */
  readonly disabled = computed(() => this.carousel.atEnd());

  /** @internal */
  onClick(): void {
    if (this.disabled()) return;
    const previousValue = this.carousel.currentValue();
    this.carousel.next();
    const next = this.carousel.currentValue();
    if (next != null && next !== previousValue) {
      const msg = this.carousel.buildSlideAnnouncement(next);
      if (msg) this.carousel.announce(msg);
    }
  }
}

/**
 * Indicator-group container. Hosts `role="group"` (default) or
 * `role="tablist"` (`controlPattern="tabs"`), composes `KjRovingTabindex`
 * for arrow-key navigation across the dots, and exposes
 * `KJ_CAROUSEL_INDICATORS` to descendants so individual indicator items can
 * read the active control pattern.
 *
 * @category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselIndicators]',
  standalone: true,
  hostDirectives: [KjRovingTabindex],
  providers: [{ provide: KJ_CAROUSEL_INDICATORS, useExisting: KjCarouselIndicators }],
  host: {
    '[attr.role]': 'kjControlPattern() === "tabs" ? "tablist" : "group"',
    '[attr.aria-label]': 'kjAriaLabel()',
    '[attr.aria-orientation]': 'carousel.orientation()',
    '[attr.data-control-pattern]': 'kjControlPattern()',
  },
})
export class KjCarouselIndicators implements KjCarouselIndicatorsContext, OnInit, OnDestroy {
  /** @internal */
  readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;

  /** Active control pattern. `'buttons'` is the APG-recommended default; `'tabs'` opts into the tablist variant. */
  readonly kjControlPattern = input<KjCarouselControlPattern>('buttons');

  /** Accessible name for the indicator group. */
  readonly kjAriaLabel = input<string>('Slide controls');

  /** Read-only mirror of the control pattern for the per-indicator host bindings. */
  readonly controlPattern: Signal<KjCarouselControlPattern> = this.kjControlPattern;

  ngOnInit(): void {
    this.carousel.registerIndicators(this);
  }

  ngOnDestroy(): void {
    this.carousel.unregisterIndicators(this);
  }

  /** Activate the slide for `value`. */
  activate(value: string): void {
    this.carousel.goTo(value);
  }
}

/**
 * Single indicator dot. Composes `KjRovingTabindexItem` and `KjFocusRing`,
 * targets the slide whose value matches `kjForValue` on click, and reflects
 * the active state via `aria-current` (buttons mode) or `aria-selected`
 * (tabs mode).
 *
 * @category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselIndicator]',
  standalone: true,
  hostDirectives: [KjRovingTabindexItemDirective, KjFocusRing],
  host: {
    '[attr.role]': 'indicators.controlPattern() === "tabs" ? "tab" : null',
    '[attr.aria-current]': 'indicators.controlPattern() === "buttons" && isActive() ? "true" : null',
    '[attr.aria-selected]': 'indicators.controlPattern() === "tabs" ? (isActive() ? "true" : "false") : null',
    '[attr.aria-controls]': 'indicators.controlPattern() === "tabs" ? carousel.slideId(kjForValue()) : null',
    '[attr.data-active]': 'isActive() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjCarouselIndicator {
  /** @internal */
  readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;
  /** @internal */
  readonly indicators = inject(KJ_CAROUSEL_INDICATORS) as KjCarouselIndicators;

  /** Slide value this indicator targets. */
  readonly kjForValue = input.required<string>();

  /** Whether this indicator's slide is the active one. */
  readonly isActive = computed(() => this.carousel.isActive(this.kjForValue()));

  /** @internal */
  onClick(): void {
    const previousValue = this.carousel.currentValue();
    this.indicators.activate(this.kjForValue());
    const next = this.carousel.currentValue();
    if (next != null && next !== previousValue) {
      const msg = this.carousel.buildSlideAnnouncement(next);
      if (msg) this.carousel.announce(msg);
    }
  }

  /**
   * @internal Tabs-mode keyboard contract: ArrowLeft/Right (or Up/Down in
   * vertical orientation) advance focus *and* activate, per APG tabs. In
   * buttons mode, the composed `KjRovingTabindex` already handles arrow
   * focus; activation requires Enter / Space, which the native `<button>`
   * resolves on its own.
   */
  onKeydown(event: KeyboardEvent): void {
    if (this.indicators.controlPattern() !== 'tabs') return;
    // Roving tabindex moves focus on next tick; piggy-back on the
    // focus event by activating the matching slide via the new active item.
    // We don't preventDefault — KjRovingTabindex needs to consume the arrow.
    if (
      event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' || event.key === 'ArrowDown'
    ) {
      // Defer so the new active item has been focused.
      queueMicrotask(() => {
        const focused = (typeof document !== 'undefined' ? document.activeElement : null) as
          | HTMLElement
          | null;
        if (!focused) return;
        const value = focused.getAttribute('data-kj-indicator-value');
        if (value) this.carousel.goTo(value);
      });
    }
  }
}

/**
 * Autoplay directive — lifecycle-only, no DOM. Manages a `setInterval` that
 * advances the carousel when all five gates are open:
 *
 * 1. The directive is mounted (composition is the on switch).
 * 2. `prefers-reduced-motion: reduce` does not match.
 * 3. The user has not pressed pause (`carousel.paused()` is false).
 * 4. Pointer is not hovering the carousel root, or `kjPauseOnHover` is false.
 * 5. Focus is not within the carousel root, or `kjPauseOnFocus` is false.
 *
 * Per WCAG 2.2.2 a delay greater than 5000 ms requires a pause control to be
 * present in the same composition.
 *
 * @category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselAutoplay]',
  standalone: true,
  exportAs: 'kjCarouselAutoplay',
})
export class KjCarouselAutoplay implements OnInit, OnDestroy {
  private readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;

  /** Interval between automatic advances. WCAG 2.2.2 requires a pause control when > 5000 ms. */
  readonly kjAutoplayDelay = input<number>(5000);

  /** Auto-pause while pointer is over the carousel root. */
  readonly kjPauseOnHover = input(true, { transform: booleanAttribute });

  /** Auto-pause while focus is within the carousel root. APG-required affordance for keyboard users. */
  readonly kjPauseOnFocus = input(true, { transform: booleanAttribute });

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const active = this.carousel.autoplayActive();
      const delay = this.kjAutoplayDelay();
      this.clearTimer();
      if (active && delay > 0) {
        this.timer = setInterval(() => {
          // Re-check gates inside the timer (may have flipped between fires).
          if (!this.carousel.autoplayActive()) return;
          // Auto-advance is silent — buildSlideAnnouncement is *not* called.
          this.carousel.next();
        }, delay);
      }
    });
  }

  ngOnInit(): void {
    this.carousel.registerAutoplay(this);
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.carousel.unregisterAutoplay(this);
  }

  private clearTimer(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Pause / play toggle. Wraps a real `<button>` and reflects the carousel's
 * `paused` signal as `aria-pressed`. When `prefers-reduced-motion: reduce`
 * matches the host is auto-disabled (autoplay never starts, so the toggle is
 * meaningless).
 *
 * @category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselPauseToggle]',
  standalone: true,
  hostDirectives: [KjFocusRing, KjDisabled],
  host: {
    '[attr.aria-pressed]': 'carousel.paused() ? "true" : "false"',
    '[attr.data-paused]': 'carousel.paused() ? "" : null',
    '[attr.disabled]': 'carousel.prefersReducedMotion() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class KjCarouselPauseToggle {
  /** @internal */
  readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;

  /** @internal */
  onClick(): void {
    if (this.carousel.prefersReducedMotion()) return;
    if (this.carousel.paused()) this.carousel.play();
    else this.carousel.pause();
  }
}
