import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { ThemeImportDialog } from './theme-import-dialog';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { BG_SLOTS, FG_SLOTS } from '../../lib/theme/types';

/**
 * The import payload was rewritten: `DraftThemeSchema` moved from the
 * daisyUI-era `colors` + `contentOverrides` shape to the 17-slot bg/fg model,
 * so the old fixture parsed as "invalid theme shape" and the dialog never
 * emitted.
 */
function validDraftJson(name = 'x') {
  return JSON.stringify({
    name,
    bg: Object.fromEntries(BG_SLOTS.map(s => [s, '#ffffff'])),
    fg: Object.fromEntries(FG_SLOTS.map(s => [s, '#000000'])),
    shape: { radiusBox: 8, radiusField: 6, radiusSelector: 4, border: 1, depth: 1 },
    type: { fontSans: 'sans-serif', fontMono: 'monospace', fontDisplay: 'serif' },
    typography: { bodyRem: 1, smallRem: 0.875 },
    motion: { transition: '200ms' },
  });
}

describe('ThemeImportDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [ThemeImportDialog] });
  });

  test('open=false hides the dialog', () => {
    const fixture = TestBed.createComponent(ThemeImportDialog);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  test('successful JSON import emits closed and applies draft', () => {
    const fixture = TestBed.createComponent(ThemeImportDialog);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    const ta = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = validDraftJson('imported-theme');
    ta.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-action="apply"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(closed).toHaveBeenCalledWith({ imported: true });
    expect(TestBed.inject(ThemeDraftService).draft().name).toBe('imported-theme');
  });

  test('cancel emits without importing', () => {
    const fixture = TestBed.createComponent(ThemeImportDialog);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    const buttons = fixture.nativeElement.querySelectorAll('.actions button');
    (buttons[0] as HTMLButtonElement).click();
    expect(closed).toHaveBeenCalledWith({ imported: false });
  });

  test('invalid input shows inline error with role=alert', () => {
    const fixture = TestBed.createComponent(ThemeImportDialog);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const ta = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = '{ broken';
    ta.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-action="apply"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    // The textarea must point at the message it just invalidated (WCAG 3.3.1).
    expect(ta.getAttribute('aria-invalid')).toBe('true');
    expect(ta.getAttribute('aria-describedby')).toBe(alert.id);
  });

  test('a pre-migration `colors` payload is rejected, not silently applied', () => {
    const fixture = TestBed.createComponent(ThemeImportDialog);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const ta = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = JSON.stringify({ name: 'old', colors: { primary: '#000' }, contentOverrides: {} });
    ta.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-action="apply"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Invalid theme shape',
    );
  });
});
