import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ThemeConfigPanel } from './theme-config-panel';

describe('ThemeConfigPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  test('renders embedded accessibility panel (single scroll column)', () => {
    const fixture = TestBed.createComponent(ThemeConfigPanel);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-a11y-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('kj-tab-list')).toBeFalsy();
  });

  test('activate() does not throw when contrast anchor is absent or scrollIntoView unavailable', () => {
    const fixture = TestBed.createComponent(ThemeConfigPanel);
    fixture.detectChanges();
    expect(() => fixture.componentInstance.activate('a11y')).not.toThrow();
  });
});
