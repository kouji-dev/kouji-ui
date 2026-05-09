import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ShapeMotionPanel } from './shape-motion-panel';
import { ThemeDraftService } from '../../../services/theme-draft.service';

describe('ShapeMotionPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  test('writes radiusBox changes through to the draft service', () => {
    const fixture = TestBed.createComponent(ShapeMotionPanel);
    fixture.detectChanges();
    const range = fixture.nativeElement.querySelector('input[data-shape="radiusBox"]') as HTMLInputElement;
    range.value = '12';
    range.dispatchEvent(new Event('input'));
    expect(TestBed.inject(ThemeDraftService).draft().shape.radiusBox).toBe(12);
  });

  test('renders a transition selector', () => {
    const fixture = TestBed.createComponent(ShapeMotionPanel);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select[data-motion="transition"]')).not.toBeNull();
  });
});
