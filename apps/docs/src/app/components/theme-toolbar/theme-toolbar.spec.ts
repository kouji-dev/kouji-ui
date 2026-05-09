import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { provideRouter } from '@angular/router';
import { ThemeToolbar } from './theme-toolbar';

describe('ThemeToolbar', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  test('emits requestA11y when the a11y chip is activated', () => {
    const fixture = TestBed.createComponent(ThemeToolbar);
    let received = false;
    fixture.componentInstance.requestA11y.subscribe(() => {
      received = true;
    });
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('.a11y-chip');
    chip.click();
    expect(received).toBe(true);
  });

  test('renders Save / Copy CSS / Copy link / Import / Download / Export buttons', () => {
    const fixture = TestBed.createComponent(ThemeToolbar);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('kj-button');
    const labels = Array.from(buttons).map((b: Element) => b.textContent?.trim().toLowerCase() ?? '');
    for (const expected of ['save', 'copy css', 'copy link', 'import', 'download', 'export']) {
      expect(labels.some(l => l.includes(expected))).toBe(true);
    }
  });
});
