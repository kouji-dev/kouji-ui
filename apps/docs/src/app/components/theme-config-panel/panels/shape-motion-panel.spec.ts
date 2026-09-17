import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ShapeMotionPanel } from './shape-motion-panel';
import { ThemeDraftService } from '../../../services/theme-draft.service';

/**
 * Rewritten against the current panel. The 0–32px range inputs
 * (`input[data-shape]`) were replaced by a `role="radiogroup"` of corner
 * presets, and the transition picker by `<kj-select>` — so the old
 * `querySelector('input[data-shape=…]')` / `select[data-motion]` assertions
 * matched nothing at all.
 */
describe('ShapeMotionPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  test('writes radiusBox changes through to the draft service', () => {
    const fixture = TestBed.createComponent(ShapeMotionPanel);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector(
      '[aria-labelledby="shape-radius-box-label"]',
    ) as HTMLElement;
    const presets = Array.from(group.querySelectorAll('[role="radio"]')) as HTMLElement[];
    expect(presets.length).toBe(5);
    // 3rd preset is 8px (Sharp / Subtle / Soft / Rounded / Pill).
    presets[2].click();
    expect(TestBed.inject(ThemeDraftService).draft().shape.radiusBox).toBe(8);
  });

  test('radiusField mirrors onto radiusSelector', () => {
    const fixture = TestBed.createComponent(ShapeMotionPanel);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector(
      '[aria-labelledby="shape-radius-field-label"]',
    ) as HTMLElement;
    const presets = Array.from(group.querySelectorAll('[role="radio"]')) as HTMLElement[];
    presets[4].click();
    const shape = TestBed.inject(ThemeDraftService).draft().shape;
    expect(shape.radiusField).toBe(24);
    expect(shape.radiusSelector).toBe(24);
  });

  /** WCAG 4.1.2 — a radiogroup has to report which option is chosen. */
  test('the selected preset is the only one with aria-checked=true', () => {
    const fixture = TestBed.createComponent(ShapeMotionPanel);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector(
      '[aria-labelledby="shape-radius-box-label"]',
    ) as HTMLElement;
    const presets = Array.from(group.querySelectorAll('[role="radio"]')) as HTMLElement[];
    presets[1].click();
    fixture.detectChanges();
    const checked = presets.filter(p => p.getAttribute('aria-checked') === 'true');
    expect(checked.length).toBe(1);
    expect(checked[0]).toBe(presets[1]);
  });

  test('arrow keys move between corner presets', () => {
    const fixture = TestBed.createComponent(ShapeMotionPanel);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector(
      '[aria-labelledby="shape-radius-box-label"]',
    ) as HTMLElement;
    const presets = Array.from(group.querySelectorAll('[role="radio"]')) as HTMLElement[];
    presets[0].focus();
    expect(document.activeElement).toBe(presets[0]);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    fixture.detectChanges();
    expect(TestBed.inject(ThemeDraftService).draft().shape.radiusBox).toBe(4);
  });

  test('renders a transition selector and a depth selector', () => {
    const fixture = TestBed.createComponent(ShapeMotionPanel);
    fixture.detectChanges();
    const selects = fixture.nativeElement.querySelectorAll('kj-select');
    // depth + transition.
    expect(selects.length).toBe(2);
    expect(
      fixture.nativeElement.querySelector('#shape-motion-transition-label')?.textContent,
    ).toContain('transition');
  });
});
