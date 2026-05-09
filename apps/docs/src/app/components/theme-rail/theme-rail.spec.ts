import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { provideRouter } from '@angular/router';
import { ThemeRail } from './theme-rail';
import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';

describe('ThemeRail', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  test('renders one row per built-in theme', () => {
    const fixture = TestBed.createComponent(ThemeRail);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('kj-list-item button[type="button"]');
    expect(rows.length).toBeGreaterThanOrEqual(BUILT_IN_NAMES.length);
  });

  test('exposes a “New theme” button', () => {
    const fixture = TestBed.createComponent(ThemeRail);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-button[aria-label="New theme — start from light preset"]');
    expect(btn?.textContent?.trim()).toMatch(/new theme/i);
  });
});
