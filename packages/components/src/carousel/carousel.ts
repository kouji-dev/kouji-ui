import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  contentChildren,
  inject,
  input,
  ViewChild,
} from '@angular/core';
import {
  KJ_CAROUSEL,
  KjCarousel,
  KjCarouselAutoplay,
  KjCarouselIndicator,
  KjCarouselIndicators,
  KjCarouselNext,
  KjCarouselPauseToggle,
  KjCarouselPrevious,
  KjCarouselSlide,
  KjCarouselViewport,
  KjIconDirective,
  KjLiveRegion,
  KjVisuallyHidden,
} from '@kouji-ui/core';
import type {
  KjCarouselAlign,
  KjCarouselControlPattern,
  KjCarouselOrientation,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjCarousel` directive — the rotating
 * region with previous / next controls, optional dot indicators, and an
 * opt-in autoplay attached behaviour.
 *
 * Compose the wrappers — `<kj-carousel>`, `<kj-carousel-viewport>`,
 * `<kj-carousel-slide>`, `<kj-carousel-previous>`, `<kj-carousel-next>`,
 * `<kj-carousel-indicators>`, `<kj-carousel-pause>`, `<kj-carousel-autoplay>` —
 * to mirror the directive family. The active slide is keyed by `value`,
 * not by structural position, so consumers can two-way bind to a router
 * param or analytics key.
 *
 * The wrapper also renders a visually hidden `kjLiveRegion` inside its
 * template so user-initiated slide changes are announced politely without
 * the consumer having to wire a live region of their own.
 *
 * @example
 * ```html
 * <kj-carousel [(value)]="active" label="Featured products">
 *   <kj-carousel-previous aria-label="Previous slide">‹</kj-carousel-previous>
 *   <kj-carousel-viewport>
 *     <kj-carousel-slide value="a" label="Mountain meadow">
 *       <article>…</article>
 *     </kj-carousel-slide>
 *   </kj-carousel-viewport>
 *   <kj-carousel-next aria-label="Next slide">›</kj-carousel-next>
 *   <kj-carousel-indicators />
 * </kj-carousel>
 * ```
 *
 * @doc-example Default
 *   @doc-file carousel.example.ts
 * @doc-example With indicators
 *   @doc-file carousel.indicators.example.ts
 * @doc-example Autoplay with pause control
 *   @doc-file carousel.autoplay.example.ts
 * @doc-example Tabbed carousel
 *   @doc-file carousel.tabs-pattern.example.ts
 * @doc-example Lazy-loaded images
 *   @doc-file carousel.lazy-load.example.ts
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 * @doc-description Themed rotating content region with prev/next controls, indicators, autoplay, and accessible announcements.
 * @doc-is-main
 */
@Component({
  selector: 'kj-carousel',
  standalone: true,
  imports: [KjLiveRegion, KjVisuallyHidden],
  hostDirectives: [
    {
      directive: KjCarousel,
      inputs: [
        'kjValue: value',
        'kjLoop: loop',
        'kjOrientation: orientation',
        'kjSlidesPerView: slidesPerView',
        'kjSlidesPerAdvance: slidesPerAdvance',
        'kjAlign: align',
        'kjLabel: label',
        'kjLabelledby: labelledby',
        'kjDraggable: draggable',
      ],
      outputs: ['kjValueChange: valueChange'],
    },
  ],
  template: `
    <ng-content />
    <div kjVisuallyHidden kjLiveRegion #liveRegion="kjLiveRegion"></div>
  `,
  styleUrl: './carousel.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-carousel',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselComponent implements AfterViewInit {
  protected readonly carousel = inject(KjCarousel);

  @ViewChild('liveRegion', { static: true }) protected liveRegion!: KjLiveRegion;

  ngAfterViewInit(): void {
    this.carousel.registerLiveRegion(this.liveRegion);
  }
}

/**
 * Styled wrapper around `KjCarouselViewport`. Hosts the scroll container that
 * the slides scroll-snap into, and forwards through to the underlying
 * directive (no public inputs).
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-viewport',
  standalone: true,
  hostDirectives: [KjCarouselViewport],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-carousel-viewport' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselViewportComponent {}

/**
 * Styled wrapper around `KjCarouselSlide`. Project a single slide; the
 * directive's `aria-label="N of M[: label]"` is computed from its index in
 * registration order plus the optional `[label]` shorthand.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-slide',
  standalone: true,
  hostDirectives: [
    {
      directive: KjCarouselSlide,
      inputs: ['kjSlideValue: value', 'kjSlideLabel: label', 'kjSlideAlign: align'],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-carousel-slide',
    '[attr.data-align]': 'effectiveAlign()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselSlideComponent {
  protected readonly slide = inject(KjCarouselSlide);
  protected readonly effectiveAlign = computed(() => this.slide.effectiveAlign());
}

/**
 * Styled wrapper around `KjCarouselPrevious`. Renders a real `<button>` so
 * Enter / Space activation, focus, and disabled semantics work for free; the
 * `aria-label` input is required at runtime (dev-mode warn if omitted).
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-previous',
  standalone: true,
  imports: [KjCarouselPrevious],
  template: `
    <button
      type="button"
      kjCarouselPrevious
      class="kj-carousel-control kj-carousel-previous"
      [attr.aria-label]="ariaLabel()"
    >
      <ng-content>‹</ng-content>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselPreviousComponent {
  /** Accessible name for the control. Required by WCAG 4.1.2 — defaults to `"Previous slide"`. */
  readonly ariaLabel = input<string>('Previous slide', { alias: 'aria-label' });
}

/**
 * Styled wrapper around `KjCarouselNext`. Symmetric counterpart of
 * `KjCarouselPreviousComponent`.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-next',
  standalone: true,
  imports: [KjCarouselNext, KjIconDirective],
  template: `
    <button
      type="button"
      kjCarouselNext
      class="kj-carousel-control kj-carousel-next"
      [attr.aria-label]="ariaLabel()"
    >
      <ng-content><i kjIcon="chevron-right"></i></ng-content>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselNextComponent {
  /** Accessible name for the control. Required by WCAG 4.1.2 — defaults to `"Next slide"`. */
  readonly ariaLabel = input<string>('Next slide', { alias: 'aria-label' });
}

/**
 * Styled wrapper around `KjCarouselIndicators`. Auto-projects one
 * `<button kjCarouselIndicator>` per registered slide (dot list) when no
 * `<kj-carousel-indicator>` children are projected, otherwise leaves the
 * projected children alone — letting consumers swap dots for thumbnails or
 * numbered chips.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-indicators',
  standalone: true,
  imports: [KjCarouselIndicator],
  hostDirectives: [
    {
      directive: KjCarouselIndicators,
      inputs: ['kjControlPattern: controlPattern', 'kjAriaLabel: ariaLabel'],
    },
  ],
  template: `
    <ng-content />
    @if (autoProject()) {
      @for (slide of carousel.slides(); track slide.kjSlideValue()) {
        <button
          type="button"
          kjCarouselIndicator
          class="kj-carousel-indicator"
          [kjForValue]="slide.kjSlideValue()"
          [attr.aria-label]="'Slide ' + ($index + 1)"
          [attr.data-kj-indicator-value]="slide.kjSlideValue()"
        ></button>
      }
    }
  `,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-carousel-indicators' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselIndicatorsComponent {
  protected readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;
  private readonly projectedIndicators = contentChildren(KjCarouselIndicator);

  /** Whether to render the auto-projected dot list (true when no indicator is projected). */
  protected readonly autoProject = computed(() => this.projectedIndicators().length === 0);
}

/**
 * Styled wrapper around `KjCarouselAutoplay`. Lifecycle-only directive — has
 * no visible DOM. Drop next to the carousel content to attach the autoplay
 * behaviour; pair with `<kj-carousel-pause>` whenever the delay exceeds
 * 5000 ms (WCAG 2.2.2).
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-autoplay',
  standalone: true,
  hostDirectives: [
    {
      directive: KjCarouselAutoplay,
      inputs: [
        'kjAutoplayDelay: delay',
        'kjPauseOnHover: pauseOnHover',
        'kjPauseOnFocus: pauseOnFocus',
      ],
    },
  ],
  template: ``,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: none;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselAutoplayComponent {}

/**
 * Styled wrapper around `KjCarouselPauseToggle`. Renders a real `<button>`
 * with `aria-pressed` reflecting the carousel's `paused` signal. Required
 * whenever an autoplay directive is present and its delay > 5000 ms.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-pause',
  standalone: true,
  imports: [KjCarouselPauseToggle],
  template: `
    <button
      type="button"
      kjCarouselPauseToggle
      class="kj-carousel-pause"
      [attr.aria-label]="ariaLabel()"
    >
      <ng-content>{{ paused() ? '▶' : '❚❚' }}</ng-content>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselPauseComponent {
  protected readonly carousel = inject(KJ_CAROUSEL) as KjCarousel;
  /** Accessible name for the toggle. Required by WCAG 4.1.2 — defaults to `"Pause carousel"`. */
  readonly ariaLabel = input<string>('Pause carousel', { alias: 'aria-label' });
  protected readonly paused = computed(() => this.carousel.paused());
}

// Re-export the input types for consumer convenience.
export type {
  KjCarouselOrientation,
  KjCarouselAlign,
  KjCarouselControlPattern,
};
