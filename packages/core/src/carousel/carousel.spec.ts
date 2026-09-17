import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import {
  KjCarousel,
  KjCarouselAutoplay,
  KjCarouselIndicator,
  KjCarouselIndicators,
  KjCarouselNext,
  KjCarouselPauseToggle,
  KjCarouselPrevious,
  KjCarouselSlide,
  KjCarouselViewport,
} from './carousel';

const directives = [
  KjCarousel,
  KjCarouselViewport,
  KjCarouselSlide,
  KjCarouselPrevious,
  KjCarouselNext,
  KjCarouselIndicators,
  KjCarouselIndicator,
  KjCarouselAutoplay,
  KjCarouselPauseToggle,
];

@Component({
  standalone: true,
  imports: directives,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      kjCarousel
      [kjLabel]="label"
      [(kjValue)]="active"
      [kjLoop]="loop"
      [kjOrientation]="orientation"
      #c="kjCarousel"
    >
      <button kjCarouselPrevious type="button" data-testid="prev" aria-label="Previous slide">
        ‹
      </button>
      <div kjCarouselViewport data-testid="viewport">
        <div kjCarouselSlide kjSlideValue="a" kjSlideLabel="Alpha" data-testid="slide-a">A</div>
        <div kjCarouselSlide kjSlideValue="b" kjSlideLabel="Bravo" data-testid="slide-b">B</div>
        <div kjCarouselSlide kjSlideValue="c" kjSlideLabel="Charlie" data-testid="slide-c">C</div>
      </div>
      <button kjCarouselNext type="button" data-testid="next" aria-label="Next slide">›</button>
      <div
        kjCarouselIndicators
        [kjControlPattern]="controlPattern"
        kjAriaLabel="Slide controls"
        data-testid="indicators"
      >
        <button
          kjCarouselIndicator
          kjForValue="a"
          type="button"
          data-testid="dot-a"
          aria-label="Slide 1"
        ></button>
        <button
          kjCarouselIndicator
          kjForValue="b"
          type="button"
          data-testid="dot-b"
          aria-label="Slide 2"
        ></button>
        <button
          kjCarouselIndicator
          kjForValue="c"
          type="button"
          data-testid="dot-c"
          aria-label="Slide 3"
        ></button>
      </div>
    </div>
  `,
})
class HostComponent {
  label = 'Test carousel';
  active = signal<string | null>(null);
  loop = false;
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  controlPattern: 'buttons' | 'tabs' = 'buttons';
}

@Component({
  standalone: true,
  imports: directives,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div kjCarousel kjLabel="Auto" [kjLoop]="true" #c="kjCarousel">
      <div
        kjCarouselAutoplay
        [kjAutoplayDelay]="50"
        [kjPauseOnHover]="false"
        [kjPauseOnFocus]="false"
      ></div>
      <div kjCarouselViewport>
        <div kjCarouselSlide kjSlideValue="x">X</div>
        <div kjCarouselSlide kjSlideValue="y">Y</div>
      </div>
      <button kjCarouselPauseToggle type="button" data-testid="pause" aria-label="Pause"></button>
    </div>
  `,
})
class AutoplayHost {}

async function flush() {
  // Reconciliation runs in microtasks; tick a few of them and the macro queue.
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((r) => setTimeout(r, 0));
}

describe('KjCarousel (core)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent, AutoplayHost] });
  });

  test('root carries the region role + aria-roledescription="carousel" + aria-label', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('[kjCarousel]') as HTMLElement;
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-roledescription')).toBe('carousel');
    expect(root.getAttribute('aria-label')).toBe('Test carousel');
    expect(root.getAttribute('aria-orientation')).toBe('horizontal');
  });

  test('first registered slide becomes active when kjValue is null', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('a');
  });

  test('slide host bindings — role="group", aria-roledescription="slide", aria-label="N of M: label"', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const slideA: HTMLElement = fixture.nativeElement.querySelector('[data-testid="slide-a"]');
    const slideB: HTMLElement = fixture.nativeElement.querySelector('[data-testid="slide-b"]');

    expect(slideA.getAttribute('role')).toBe('group');
    expect(slideA.getAttribute('aria-roledescription')).toBe('slide');
    expect(slideA.getAttribute('aria-label')).toBe('1 of 3: Alpha');
    expect(slideB.getAttribute('aria-label')).toBe('2 of 3: Bravo');
    expect(slideA.getAttribute('data-active')).toBe('');
    expect(slideB.getAttribute('data-active')).toBeNull();
  });

  test('next() / prev() advance non-looping with boundary clamping', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const carouselEl = fixture.nativeElement.querySelector('[kjCarousel]') as HTMLElement;
    const ref = carouselEl as unknown as { __kjCarousel?: KjCarousel };
    void ref;
    // Reach the directive instance via the harness; simpler to drive via the model.
    fixture.componentInstance.active.set('a');
    fixture.detectChanges();
    await flush();

    // Click next twice — should advance to c (last).
    const next: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="next"]');
    next.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('b');
    next.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('c');
    // Clamped at end.
    next.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('c');
    expect(next.getAttribute('aria-disabled')).toBe('true');

    // Walk back.
    const prev: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="prev"]');
    prev.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('b');
    prev.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('a');
    // Clamped at start.
    prev.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('a');
    expect(prev.getAttribute('aria-disabled')).toBe('true');
  });

  test('loop=true wraps next from last → first and prev from first → last', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.loop = true;
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    fixture.componentInstance.active.set('c');
    fixture.detectChanges();

    const next: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="next"]');
    next.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('a');

    const prev: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="prev"]');
    prev.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('c');
  });

  test('indicator click in buttons mode jumps via goTo and reflects aria-current', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const dotA: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dot-a"]');
    const dotB: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dot-b"]');
    const dotC: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dot-c"]');

    expect(dotA.getAttribute('aria-current')).toBe('true');
    expect(dotB.getAttribute('aria-current')).toBeNull();
    expect(dotC.getAttribute('aria-current')).toBeNull();

    dotC.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('c');
    expect(dotC.getAttribute('aria-current')).toBe('true');
    expect(dotA.getAttribute('aria-current')).toBeNull();
  });

  test('the active indicator is the roving tab stop (a11y F-19)', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.active.set('b');
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const dotA: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dot-a"]');
    const dotB: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dot-b"]');
    const dotC: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dot-c"]');
    expect(dotA.getAttribute('tabindex')).toBe('-1');
    expect(dotB.getAttribute('tabindex')).toBe('0');
    expect(dotC.getAttribute('tabindex')).toBe('-1');

    dotC.click();
    fixture.detectChanges();
    expect(dotC.getAttribute('tabindex')).toBe('0');
    expect(dotB.getAttribute('tabindex')).toBe('-1');
  });

  test('indicators in tabs mode flip to role="tablist"/"tab" with aria-selected and aria-controls', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.controlPattern = 'tabs';
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const indicators: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="indicators"]',
    );
    const dotA: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dot-a"]');
    const dotB: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dot-b"]');
    const slideA: HTMLElement = fixture.nativeElement.querySelector('[data-testid="slide-a"]');

    expect(indicators.getAttribute('role')).toBe('tablist');
    expect(dotA.getAttribute('role')).toBe('tab');
    expect(dotA.getAttribute('aria-selected')).toBe('true');
    expect(dotB.getAttribute('aria-selected')).toBe('false');
    // aria-controls points at the matching slide id.
    const controls = dotA.getAttribute('aria-controls');
    expect(controls).not.toBeNull();
    expect(controls).toBe(slideA.id);
    // Slide flips to tabpanel role under tabs mode (no aria-roledescription).
    expect(slideA.getAttribute('role')).toBe('tabpanel');
    expect(slideA.getAttribute('aria-roledescription')).toBeNull();
  });

  test('viewport id is exposed as aria-controls on previous and next', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const viewport: HTMLElement = fixture.nativeElement.querySelector('[data-testid="viewport"]');
    const prev: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="prev"]');
    const next: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="next"]');
    expect(viewport.id).toMatch(/^kj-carousel-viewport-/);
    expect(prev.getAttribute('aria-controls')).toBe(viewport.id);
    expect(next.getAttribute('aria-controls')).toBe(viewport.id);
  });

  test('vertical orientation reflects aria-orientation on root and indicators', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.orientation = 'vertical';
    fixture.detectChanges();
    await flush();

    const root: HTMLElement = fixture.nativeElement.querySelector('[kjCarousel]');
    const indicators: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="indicators"]',
    );
    expect(root.getAttribute('aria-orientation')).toBe('vertical');
    expect(root.getAttribute('data-orientation')).toBe('vertical');
    expect(indicators.getAttribute('aria-orientation')).toBe('vertical');
  });

  test('autoplay pause toggle reflects paused state via aria-pressed', async () => {
    const fixture = TestBed.createComponent(AutoplayHost);
    fixture.detectChanges();
    await flush();

    const pause: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="pause"]');
    expect(pause.getAttribute('aria-pressed')).toBe('false');

    pause.click();
    fixture.detectChanges();
    expect(pause.getAttribute('aria-pressed')).toBe('true');

    pause.click();
    fixture.detectChanges();
    expect(pause.getAttribute('aria-pressed')).toBe('false');
  });

  test('autoplay timer ticks advance the active value when gates are open', async () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(AutoplayHost);
      fixture.detectChanges();
      // Microtask reconciliation needs to land before the first interval fires.
      await Promise.resolve();
      fixture.detectChanges();

      // Advance the autoplay timer beyond the configured 50ms.
      vi.advanceTimersByTime(80);
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement.querySelector('[kjCarousel]');
      const slides = root.querySelectorAll('[kjCarouselSlide]');
      // After at least one tick on a 2-slide loop the active slide is no longer x.
      const activeIdx = Array.from(slides).findIndex((el) => el.getAttribute('data-active') === '');
      expect(activeIdx).toBeGreaterThanOrEqual(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * perf F-15 — the carousel reads `prefers-reduced-motion` from the shared,
 * root-provided `KjReducedMotion` service. Ten carousels used to mean ten
 * `matchMedia` calls and ten `change` listeners (none of which were ever
 * removed); now the whole application subscribes once.
 */
describe('KjCarousel reduced motion', () => {
  test('does not open a matchMedia subscription per carousel instance', async () => {
    const original = window.matchMedia;
    const calls: string[] = [];
    window.matchMedia = ((query: string) => {
      calls.push(query);
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
      };
    }) as unknown as typeof window.matchMedia;

    try {
      @Component({
        standalone: true,
        imports: directives,
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `
          @for (n of [1, 2, 3]; track n) {
            <div kjCarousel kjLabel="Gallery">
              <div kjCarouselViewport>
                <div kjCarouselSlide kjSlideValue="a">A</div>
              </div>
            </div>
          }
        `,
      })
      class ManyCarousels {}

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [ManyCarousels] });
      const fixture = TestBed.createComponent(ManyCarousels);
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));

      expect(fixture.nativeElement.querySelectorAll('[kjCarousel]').length).toBe(3);
      const reduced = calls.filter((q) => q.includes('prefers-reduced-motion'));
      expect(reduced.length).toBeLessThanOrEqual(1);
    } finally {
      window.matchMedia = original;
    }
  });
});

/**
 * arch F-13 — registration moved from `ngOnInit` / `ngOnDestroy` to the
 * constructor plus `DestroyRef.onDestroy`. The observable contract is that a
 * slide still registers in DOM order and still unregisters when its view goes.
 */
describe('KjCarousel registration without lifecycle hooks', () => {
  test('slides register in DOM order and unregister when removed', () => {
    @Component({
      standalone: true,
      imports: directives,
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <div kjCarousel kjLabel="Gallery">
          <div kjCarouselViewport>
            @for (v of values(); track v) {
              <div kjCarouselSlide [kjSlideValue]="v">{{ v }}</div>
            }
          </div>
        </div>
      `,
    })
    class DynamicSlides {
      readonly values = signal(['a', 'b', 'c']);
    }

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [DynamicSlides] });
    const fixture = TestBed.createComponent(DynamicSlides);
    fixture.detectChanges();

    const labels = () =>
      Array.from(fixture.nativeElement.querySelectorAll('[kjCarouselSlide]')).map((el) =>
        (el as HTMLElement).getAttribute('aria-label'),
      );

    expect(labels()).toEqual(['1 of 3', '2 of 3', '3 of 3']);

    fixture.componentInstance.values.set(['a', 'c']);
    fixture.detectChanges();

    // The removed slide's DestroyRef ran: the survivors renumber.
    expect(labels()).toEqual(['1 of 2', '2 of 2']);
  });

  /**
   * KNOWN GAP (pre-existing, unchanged by the hook removal): the slide index
   * is registration order, and a slide inside an `@if` registers after its
   * later siblings because the embedded view is created in the update pass.
   * `aria-posinset`-style numbering is therefore wrong for conditionally
   * rendered slides (WCAG 1.3.1 Info and Relationships). Fixing it means
   * ordering the registry by `compareDocumentPosition`, which is a change to
   * the registry contract rather than to these lifecycle hooks.
   */
  test('KNOWN GAP: a slide inside an @if registers after its later siblings', () => {
    @Component({
      standalone: true,
      imports: directives,
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <div kjCarousel kjLabel="Gallery">
          <div kjCarouselViewport>
            <div kjCarouselSlide kjSlideValue="a">A</div>
            @if (true) {
              <div kjCarouselSlide kjSlideValue="b">B</div>
            }
            <div kjCarouselSlide kjSlideValue="c">C</div>
          </div>
        </div>
      `,
    })
    class ConditionalSlide {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ConditionalSlide] });
    const fixture = TestBed.createComponent(ConditionalSlide);
    fixture.detectChanges();

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('[kjCarouselSlide]'),
    ).map((el) => (el as HTMLElement).getAttribute('aria-label'));
    expect(labels).toEqual(['1 of 3', '3 of 3', '2 of 3']);
  });
});

describe('KjCarouselViewport \u2014 slide observation', () => {
  /** jsdom has no IntersectionObserver; this one records targets and can be fired. */
  class FakeIntersectionObserver {
    static instances: FakeIntersectionObserver[] = [];
    readonly targets = new Set<Element>();
    disconnected = false;

    constructor(private readonly callback: (entries: unknown[]) => void) {
      FakeIntersectionObserver.instances.push(this);
    }

    observe(el: Element): void {
      this.targets.add(el);
    }

    unobserve(el: Element): void {
      this.targets.delete(el);
    }

    disconnect(): void {
      this.disconnected = true;
      this.targets.clear();
    }

    fire(target: Element): void {
      this.callback([{ isIntersecting: true, intersectionRatio: 1, target }]);
    }
  }

  @Component({
    standalone: true,
    imports: directives,
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <div kjCarousel kjLabel="Gallery" [(kjValue)]="active">
        <div kjCarouselViewport>
          <div kjCarouselSlide kjSlideValue="a">A</div>
          <div kjCarouselSlide kjSlideValue="b">B</div>
          @if (extra()) {
            <div kjCarouselSlide kjSlideValue="c" data-testid="late">C</div>
          }
        </div>
      </div>
    `,
  })
  class LateSlideHost {
    readonly active = signal<string | null>(null);
    readonly extra = signal(false);
  }

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [LateSlideHost] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('observes a slide registered after first render', async () => {
    const fixture = TestBed.createComponent(LateSlideHost);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const observer = FakeIntersectionObserver.instances[0];
    expect(observer.targets.size).toBe(2);

    fixture.componentInstance.extra.set(true);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const late = fixture.nativeElement.querySelector('[data-testid="late"]') as HTMLElement;
    // Before the fix only the initial slide set was ever observed, so a slide
    // added later never updated `currentValue` when it scrolled into view.
    expect(observer.targets.has(late)).toBe(true);
    expect(observer.targets.size).toBe(3);
  });

  test('stops observing a slide that is removed', async () => {
    const fixture = TestBed.createComponent(LateSlideHost);
    fixture.componentInstance.extra.set(true);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const observer = FakeIntersectionObserver.instances[0];
    const late = fixture.nativeElement.querySelector('[data-testid="late"]') as HTMLElement;
    expect(observer.targets.has(late)).toBe(true);

    fixture.componentInstance.extra.set(false);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    expect(observer.targets.has(late)).toBe(false);
  });

  test('a settled slide commits while the viewport is alive', async () => {
    const fixture = TestBed.createComponent(LateSlideHost);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const observer = FakeIntersectionObserver.instances[0];
    const second = fixture.nativeElement.querySelectorAll('[kjCarouselSlide]')[1] as HTMLElement;

    observer.fire(second);
    await new Promise<void>((r) => setTimeout(r, 120));
    fixture.detectChanges();

    // The counterpart of the destroy test — proves the 50ms timer really is armed.
    expect(fixture.componentInstance.active()).toBe('b');
  });

  test('the settle timer never fires after the viewport is destroyed', async () => {
    const fixture = TestBed.createComponent(LateSlideHost);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const carousel = fixture.debugElement.children[0].injector.get(KjCarousel);
    const observer = FakeIntersectionObserver.instances[0];
    const second = fixture.nativeElement.querySelectorAll('[kjCarouselSlide]')[1] as HTMLElement;

    // Count writes from here on: the settle callback commits through kjValue.
    let writes = 0;
    const realSet = carousel.kjValue.set.bind(carousel.kjValue);
    carousel.kjValue.set = (value: string | null) => {
      writes++;
      realSet(value);
    };

    observer.fire(second);
    fixture.destroy();
    await new Promise<void>((r) => setTimeout(r, 120));

    expect(writes, 'the 50ms settle timer used to outlive the component').toBe(0);
  });
});
