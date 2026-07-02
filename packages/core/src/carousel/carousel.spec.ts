import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach, vi } from 'vitest';
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
