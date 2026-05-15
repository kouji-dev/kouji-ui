import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjCarouselComponent,
  KjCarouselIndicatorsComponent,
  KjCarouselNextComponent,
  KjCarouselPreviousComponent,
  KjCarouselSlideComponent,
  KjCarouselViewportComponent,
} from './carousel';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Tunes the active slide, slide
 * count, loop behaviour, orientation, and the indicator track so the
 * navigation surface area is fully covered.
 */
const active = signal<'alps' | 'andes' | 'atlas' | 'rockies'>('alps');
const slideCount = signal<3 | 4>(3);
const loop = signal(false);
const orientation = signal<'horizontal' | 'vertical'>('horizontal');
const showIndicators = signal(true);

const SLIDES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'alps', label: 'The Alps' },
  { value: 'andes', label: 'The Andes' },
  { value: 'atlas', label: 'The Atlas' },
  { value: 'rockies', label: 'The Rockies' },
];

@Component({
  selector: 'kj-carousel-playground',
  standalone: true,
  imports: [
    KjCarouselComponent,
    KjCarouselViewportComponent,
    KjCarouselSlideComponent,
    KjCarouselPreviousComponent,
    KjCarouselNextComponent,
    KjCarouselIndicatorsComponent,
  ],
  styles: [`
    :host { display: block; }
    .slide { display: grid; place-items: center; min-height: 10rem; font-weight: 600; font-size: 1.125rem; }
    /* Vertical orientation: the host carousel CSS uses
       grid-template-rows: auto 1fr auto auto with the viewport in the
       1fr row, so the parent needs an explicit height — otherwise 1fr
       collapses to 0 and the viewport disappears. */
    kj-carousel[data-orientation="vertical"] { height: 22rem; }
    kj-carousel[data-orientation="vertical"] .slide { min-height: 8rem; }
  `],
  template: `
    <kj-carousel
      label="Featured destinations"
      [(value)]="active"
      [loop]="loop()"
      [orientation]="orientation()"
    >
      <kj-carousel-previous aria-label="Previous slide" />
      <kj-carousel-viewport>
        @for (slide of visibleSlides(); track slide.value) {
          <kj-carousel-slide [value]="slide.value" [label]="slide.label">
            <div class="slide">{{ slide.label }}</div>
          </kj-carousel-slide>
        }
      </kj-carousel-viewport>
      <kj-carousel-next aria-label="Next slide" />
      @if (showIndicators()) {
        <kj-carousel-indicators />
      }
    </kj-carousel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselPlaygroundDemo {
  protected readonly active = active;
  protected readonly slideCount = slideCount;
  protected readonly loop = loop;
  protected readonly orientation = orientation;
  protected readonly showIndicators = showIndicators;

  protected visibleSlides(): typeof SLIDES {
    return SLIDES.slice(0, slideCount());
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjCarouselPlaygroundDemo,
  state: {
    active: active as unknown as ReturnType<typeof signal>,
    slideCount: slideCount as unknown as ReturnType<typeof signal>,
    loop: loop as unknown as ReturnType<typeof signal>,
    orientation: orientation as unknown as ReturnType<typeof signal>,
    showIndicators: showIndicators as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'active',
      label: 'active',
      options: ['alps', 'andes', 'atlas', 'rockies'],
    },
    { kind: 'chips', name: 'slideCount', label: 'slides', options: [3, 4] },
    {
      kind: 'chips',
      name: 'orientation',
      label: 'orientation',
      options: ['horizontal', 'vertical'],
    },
    { kind: 'toggle', name: 'loop', label: 'loop' },
    { kind: 'toggle', name: 'showIndicators', label: 'indicators' },
  ],
  snippet: (values) => {
    const s = values as {
      active: string;
      slideCount: number;
      loop: boolean;
      orientation: string;
      showIndicators: boolean;
    };
    const attrs: string[] = [
      'label="Featured destinations"',
      `value="${s.active}"`,
      `orientation="${s.orientation}"`,
    ];
    if (s.loop) attrs.push('[loop]="true"');
    const slides = SLIDES.slice(0, s.slideCount)
      .map(
        (slide) =>
          `    <kj-carousel-slide value="${slide.value}" label="${slide.label}">\n      <div class="slide">${slide.label}</div>\n    </kj-carousel-slide>`,
      )
      .join('\n');
    const indicators = s.showIndicators ? '\n  <kj-carousel-indicators />' : '';
    return `<kj-carousel\n  ${attrs.join('\n  ')}\n>\n  <kj-carousel-previous aria-label="Previous slide" />\n  <kj-carousel-viewport>\n${slides}\n  </kj-carousel-viewport>\n  <kj-carousel-next aria-label="Next slide" />${indicators}\n</kj-carousel>`;
  },
};
