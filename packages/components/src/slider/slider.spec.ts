import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjSliderComponent } from './slider';

@Component({
  standalone: true,
  imports: [KjSliderComponent],
  template: `
    <kj-slider
      [(kjValue)]="value"
      [kjMin]="min"
      [kjMax]="max"
      [kjStep]="step"
      [kjDisabled]="disabled"
      [kjOrientation]="orientation"
      kjAriaLabel="Test slider"
    />
  `,
})
class SingleHost {
  value = signal<number | undefined>(40);
  min = 0;
  max = 100;
  step = 1;
  disabled = false;
  orientation: 'horizontal' | 'vertical' = 'horizontal';
}

@Component({
  standalone: true,
  imports: [KjSliderComponent],
  template: `
    <kj-slider
      [(kjRange)]="range"
      [kjMin]="0"
      [kjMax]="100"
      [kjStep]="1"
      [kjMinDistance]="10"
      kjStartAriaLabel="Lo"
      kjEndAriaLabel="Hi"
    />
  `,
})
class RangeHost {
  range = signal<[number, number]>([20, 80]);
}

describe('KjSliderComponent (single)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SingleHost] });
  });

  test('renders one thumb with role="slider"', () => {
    const fixture = TestBed.createComponent(SingleHost);
    fixture.detectChanges();
    const thumbs = fixture.nativeElement.querySelectorAll('button.kj-slider__thumb');
    expect(thumbs.length).toBe(1);
    expect(thumbs[0].getAttribute('role')).toBe('slider');
  });

  test('renders the track and the range fill element', () => {
    const fixture = TestBed.createComponent(SingleHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-slider__track')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.kj-slider__range')).not.toBeNull();
  });

  test('forwards initial value to the thumb aria-valuenow', () => {
    const fixture = TestBed.createComponent(SingleHost);
    fixture.detectChanges();
    const thumb = fixture.nativeElement.querySelector('button.kj-slider__thumb');
    expect(thumb.getAttribute('aria-valuenow')).toBe('40');
  });

  test('reflects aria-valuemin / valuemax from kjMin / kjMax', () => {
    const fixture = TestBed.createComponent(SingleHost);
    fixture.detectChanges();
    const thumb = fixture.nativeElement.querySelector('button.kj-slider__thumb');
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('100');
  });

  test('reflects orientation onto the wrapper', () => {
    const fixture = TestBed.createComponent(SingleHost);
    fixture.componentInstance.orientation = 'vertical';
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.kj-slider');
    expect(root.getAttribute('data-orientation')).toBe('vertical');
  });

  test('forwards kjDisabled to the wrapper data attribute', () => {
    const fixture = TestBed.createComponent(SingleHost);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.kj-slider');
    expect(root.getAttribute('data-disabled')).toBe('');
  });
});

describe('KjSliderComponent (range)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RangeHost] });
  });

  test('renders two thumbs with role="slider" each', () => {
    const fixture = TestBed.createComponent(RangeHost);
    fixture.detectChanges();
    const thumbs = fixture.nativeElement.querySelectorAll('button.kj-slider__thumb');
    expect(thumbs.length).toBe(2);
    expect(thumbs[0].getAttribute('role')).toBe('slider');
    expect(thumbs[1].getAttribute('role')).toBe('slider');
  });

  test('per-thumb aria-label uses the start / end labels', () => {
    const fixture = TestBed.createComponent(RangeHost);
    fixture.detectChanges();
    const [low, high] = fixture.nativeElement.querySelectorAll('button.kj-slider__thumb');
    expect(low.getAttribute('aria-label')).toBe('Lo');
    expect(high.getAttribute('aria-label')).toBe('Hi');
  });

  test('forwards both range values onto the thumbs', () => {
    const fixture = TestBed.createComponent(RangeHost);
    fixture.detectChanges();
    const [low, high] = fixture.nativeElement.querySelectorAll('button.kj-slider__thumb');
    expect(low.getAttribute('aria-valuenow')).toBe('20');
    expect(high.getAttribute('aria-valuenow')).toBe('80');
  });

  test('high thumb effective valuemin reflects low + minDistance', () => {
    const fixture = TestBed.createComponent(RangeHost);
    fixture.detectChanges();
    const [, high] = fixture.nativeElement.querySelectorAll('button.kj-slider__thumb');
    expect(high.getAttribute('aria-valuemin')).toBe('30');
  });
});
