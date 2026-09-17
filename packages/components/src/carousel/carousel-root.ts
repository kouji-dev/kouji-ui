import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { KjCarousel, KjLiveRegion, KjVisuallyHidden } from '@kouji-ui/core';

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
 *   <kj-carousel-previous />
 *   <kj-carousel-viewport>
 *     <kj-carousel-slide value="a" label="Mountain meadow">
 *       <article>…</article>
 *     </kj-carousel-slide>
 *   </kj-carousel-viewport>
 *   <kj-carousel-next />
 *   <kj-carousel-indicators />
 * </kj-carousel>
 * ```
 *
 * @doc-example Default
 *   The default playground — four slides with manual prev / next controls.
 *   @doc-file carousel.example.ts
 * @doc-example Usage
 *   The common shape — bound active slide, prev / next, and indicator dots.
 *   Use this as the copy-paste starting point.
 *   @doc-file carousel.usage.example.ts
 * @doc-example With indicators
 *   Add `<kj-carousel-indicators>` to expose a dot list under the viewport.
 *   @doc-file carousel.indicators.example.ts
 * @doc-example Autoplay with pause control
 *   Pair `<kj-carousel-autoplay>` with `<kj-carousel-pause>` whenever delay > 5s (WCAG 2.2.2).
 *   @doc-file carousel.autoplay.example.ts
 * @doc-example Tabbed carousel
 *   `kjControlPattern="tabs"` switches indicators to a tablist for editorial decks.
 *   @doc-file carousel.tabs-pattern.example.ts
 * @doc-example Lazy-loaded images
 *   Render heavy media on-demand using the slide's visibility signal.
 *   @doc-file carousel.lazy-load.example.ts
 *
 * @doc-keyboard
 *   Tab           — Moves focus through prev / next / pause / indicators in DOM order
 *   Enter|Space   — Activates the focused control
 *   ArrowLeft|ArrowRight — On indicator tablist mode, moves between tabs (auto-activates the slide)
 *
 * @doc-aria
 *   role               — `region` on the host; `aria-roledescription="carousel"`
 *   aria-label         — Required; supply via `label` or `labelledby`
 *   aria-live          — Politely announces slide changes via the wrapper's hidden live region
 *   aria-current       — `"true"` on the active indicator
 *   aria-controls      — Prev / next reference the viewport id
 *
 * @doc-touch
 *   Prev / next / pause buttons default to a ≥ 44×44 control diameter
 *   (`--kj-carousel-control-size`). Indicators are smaller dots — if they're
 *   the primary nav on mobile, switch to `kjControlPattern="tabs"` for larger
 *   targets.
 *
 * @doc-a11y
 *   Follows the WAI-ARIA APG Carousel pattern. Autoplay > 5s requires a
 *   pause control (WCAG 2.2.2 Pause, Stop, Hide) — pair `kj-carousel-autoplay`
 *   with `kj-carousel-pause` whenever it's present. The wrapper's internal
 *   `kjLiveRegion` announces user-initiated slide changes politely. Every
 *   control's accessible name comes from the i18n catalog
 *   (`carousel.previous` / `carousel.next` / `carousel.pause` /
 *   `carousel.slide`), so translating the library translates the carousel.
 *
 * @doc-related tabs,accordion,list
 *
 * @doc-css-var
 *   --kj-carousel-gap                 — Gap between viewport and controls + between slides.
 *   --kj-carousel-radius              — Corner radius for viewport and slides. Inherits --kj-radius-box.
 *   --kj-carousel-control-size        — Diameter of prev/next/pause buttons. Defaults to 44px for WCAG touch.
 *   --kj-carousel-control-bg          — Background of prev/next/pause buttons.
 *   --kj-carousel-control-fg          — Foreground (icon) color of prev/next/pause buttons.
 *   --kj-carousel-indicator-size      — Diameter of the indicator dots.
 *   --kj-carousel-indicator-active    — Fill color of the active indicator dot.
 *   --kj-carousel-indicator-idle      — Fill color of idle indicator dots.
 *   --kj-carousel-slides-per-view     — Number of slides visible at once. Defaults to 1.
 *
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
export class KjCarouselComponent {
  protected readonly carousel = inject(KjCarousel);

  /** The visually-hidden polite region slide changes are announced through. */
  private readonly liveRegion = viewChild.required(KjLiveRegion);

  constructor() {
    afterNextRender(() => this.carousel.registerLiveRegion(this.liveRegion()));
  }
}
