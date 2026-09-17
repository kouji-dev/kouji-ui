import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { ThemeToolbar } from './theme-toolbar';
import { ThemeDraftService } from '../../services/theme-draft.service';

/**
 * Rewritten against the current toolbar. The old spec expected a
 * `requestA11y` output and an `.a11y-chip`, neither of which exists, and
 * counted `<kj-button>` labels for actions that have since moved into the
 * "More" dropdown menu as plain `[kjDropdownMenuItem]` buttons.
 */
describe('ThemeToolbar', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  test('renders the always-visible palette and save actions', () => {
    const fixture = TestBed.createComponent(ThemeToolbar);
    fixture.detectChanges();
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('kj-button') as NodeListOf<Element>,
    ).map(b => b.textContent?.trim().toLowerCase() ?? '');
    for (const expected of ['shuffle colors', 'shuffle theme', 'sync primary', 'reset', 'save']) {
      expect(labels.some(l => l.includes(expected)), `missing "${expected}"`).toBe(true);
    }
  });

  test('copy / import / download / export live in the More menu', () => {
    const fixture = TestBed.createComponent(ThemeToolbar);
    fixture.detectChanges();
    const items = Array.from(
      fixture.nativeElement.querySelectorAll('[kjDropdownMenuItem]') as NodeListOf<Element>,
    ).map(b => b.textContent?.trim().toLowerCase() ?? '');
    for (const expected of ['copy css', 'copy share link', 'import', 'download', 'export']) {
      expect(items.some(l => l.includes(expected)), `missing "${expected}"`).toBe(true);
    }
  });

  /** WCAG 4.1.2 — the disclosure state belongs on the focusable control. */
  test('the More trigger is a focusable button carrying the disclosure ARIA', () => {
    const fixture = TestBed.createComponent(ThemeToolbar);
    fixture.detectChanges();
    // The trigger attribute sits on the <kj-button> wrapper; the disclosure
    // ARIA is forwarded onto the real control it nominates through
    // KJ_TRIGGER_CONTROL. Query the element that CARRIES the state — asserting
    // below that it is a native, focusable <button> is the point of this test.
    const trigger = fixture.nativeElement.querySelector(
      'button[aria-haspopup="menu"]',
    ) as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  test('emits requestImport when the Import item is activated', () => {
    const fixture = TestBed.createComponent(ThemeToolbar);
    const seen = vi.fn();
    fixture.componentInstance.requestImport.subscribe(seen);
    fixture.detectChanges();
    const item = Array.from(
      fixture.nativeElement.querySelectorAll('[kjDropdownMenuItem]') as NodeListOf<HTMLElement>,
    ).find(b => b.textContent?.toLowerCase().includes('import'));
    expect(item).toBeTruthy();
    item!.click();
    expect(seen).toHaveBeenCalled();
  });

  test('the name field reports a reserved built-in name', () => {
    const fixture = TestBed.createComponent(ThemeToolbar);
    fixture.detectChanges();
    TestBed.inject(ThemeDraftService).setName('kouji');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input.name') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Reserved built-in name');
  });
});
