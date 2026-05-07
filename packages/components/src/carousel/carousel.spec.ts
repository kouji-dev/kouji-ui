import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjCarouselComponent,
  KjCarouselViewportComponent,
  KjCarouselSlideComponent,
  KjCarouselPreviousComponent,
  KjCarouselNextComponent,
  KjCarouselIndicatorsComponent,
  KjCarouselAutoplayComponent,
  KjCarouselPauseComponent,
} from './carousel';

const imports = [
  KjCarouselComponent,
  KjCarouselViewportComponent,
  KjCarouselSlideComponent,
  KjCarouselPreviousComponent,
  KjCarouselNextComponent,
  KjCarouselIndicatorsComponent,
  KjCarouselAutoplayComponent,
  KjCarouselPauseComponent,
];

@Component({
  standalone: true,
  imports,
  template: `
    <kj-carousel [(value)]="active" [label]="label" [loop]="loop" [orientation]="orientation">
      <kj-carousel-previous aria-label="Previous slide" />
      <kj-carousel-viewport>
        <kj-carousel-slide value="one"   label="One"><div data-testid="content-one">One body</div></kj-carousel-slide>
        <kj-carousel-slide value="two"   label="Two"><div data-testid="content-two">Two body</div></kj-carousel-slide>
        <kj-carousel-slide value="three" label="Three"><div data-testid="content-three">Three body</div></kj-carousel-slide>
      </kj-carousel-viewport>
      <kj-carousel-next aria-label="Next slide" />
      <kj-carousel-indicators ariaLabel="Slide controls" [controlPattern]="controlPattern" />
    </kj-carousel>
  `,
})
class HostComponent {
  active = signal<string | null>(null);
  label = 'Test wrapper';
  loop = false;
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  controlPattern: 'buttons' | 'tabs' = 'buttons';
}

@Component({
  standalone: true,
  imports,
  template: `
    <kj-carousel label="Auto">
      <kj-carousel-autoplay [delay]="5000" />
      <kj-carousel-viewport>
        <kj-carousel-slide value="x">X</kj-carousel-slide>
        <kj-carousel-slide value="y">Y</kj-carousel-slide>
      </kj-carousel-viewport>
      <kj-carousel-pause aria-label="Pause" />
    </kj-carousel>
  `,
})
class AutoplayHost {}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((r) => setTimeout(r, 0));
}

describe('KjCarouselComponent (wrapper)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent, AutoplayHost] });
  });

  test('renders the wrapper composition with correct ARIA shape', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const carousel = root.querySelector('kj-carousel')!;
    expect(carousel.getAttribute('role')).toBe('region');
    expect(carousel.getAttribute('aria-roledescription')).toBe('carousel');
    expect(carousel.getAttribute('aria-label')).toBe('Test wrapper');

    const slides = root.querySelectorAll('kj-carousel-slide');
    expect(slides.length).toBe(3);
    slides.forEach((slide) => {
      expect(slide.getAttribute('role')).toBe('group');
      expect(slide.getAttribute('aria-roledescription')).toBe('slide');
    });

    const prev = root.querySelector('button.kj-carousel-previous')!;
    const next = root.querySelector('button.kj-carousel-next')!;
    expect(prev.getAttribute('aria-label')).toBe('Previous slide');
    expect(next.getAttribute('aria-label')).toBe('Next slide');
  });

  test('aliased value model is two-way bound from the host signal', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    // Default reconciliation lands the first slide.
    expect(fixture.componentInstance.active()).toBe('one');

    fixture.componentInstance.active.set('two');
    fixture.detectChanges();

    const slides = fixture.nativeElement.querySelectorAll<HTMLElement>('kj-carousel-slide');
    expect(slides[1].getAttribute('data-active')).toBe('');
    expect(slides[0].getAttribute('data-active')).toBeNull();
  });

  test('auto-projects a dot indicator per slide with aria-current on the active', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const dots = fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button.kj-carousel-indicator');
    expect(dots.length).toBe(3);
    expect(dots[0].getAttribute('aria-current')).toBe('true');
    expect(dots[1].getAttribute('aria-current')).toBeNull();

    dots[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('three');
    expect(dots[2].getAttribute('aria-current')).toBe('true');
    expect(dots[0].getAttribute('aria-current')).toBeNull();
  });

  test('controlPattern="tabs" flips the indicator group to a tablist with role="tab"', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.controlPattern = 'tabs';
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const indicators = fixture.nativeElement.querySelector('kj-carousel-indicators')!;
    expect(indicators.getAttribute('role')).toBe('tablist');
    const dots = fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button.kj-carousel-indicator');
    dots.forEach((d) => expect(d.getAttribute('role')).toBe('tab'));
    expect(dots[0].getAttribute('aria-selected')).toBe('true');
    expect(dots[1].getAttribute('aria-selected')).toBe('false');
  });

  test('next button advances the model and is disabled at the boundary when not looping', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const next: HTMLButtonElement = fixture.nativeElement.querySelector('button.kj-carousel-next');
    next.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('two');
    next.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('three');
    expect(next.getAttribute('aria-disabled')).toBe('true');
  });

  test('vertical orientation propagates to the wrapper host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.orientation = 'vertical';
    fixture.detectChanges();
    const carousel = fixture.nativeElement.querySelector('kj-carousel')!;
    expect(carousel.getAttribute('aria-orientation')).toBe('vertical');
    expect(carousel.getAttribute('data-orientation')).toBe('vertical');
  });

  test('autoplay pause toggle reflects paused state via aria-pressed', async () => {
    const fixture = TestBed.createComponent(AutoplayHost);
    fixture.detectChanges();
    await flush();

    const pause: HTMLButtonElement = fixture.nativeElement.querySelector('button.kj-carousel-pause');
    expect(pause.getAttribute('aria-pressed')).toBe('false');
    pause.click();
    fixture.detectChanges();
    expect(pause.getAttribute('aria-pressed')).toBe('true');
  });

  test('live region is rendered as a visually-hidden element with aria-live="polite"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const region = fixture.nativeElement.querySelector('[aria-live]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    // Visually hidden styles are inline (browsers / jsdom may add spaces; match liberally).
    expect(region.getAttribute('style')).toMatch(/width:\s*1px/);
  });
});
