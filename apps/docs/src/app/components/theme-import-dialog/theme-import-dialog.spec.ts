import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { ThemeImportDialog } from './theme-import-dialog';

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
    ta.value = JSON.stringify({
      name: 'x',
      colors: { 'base-100':'#fff', primary:'#000', secondary:'#000', accent:'#000', neutral:'#000',
        info:'#000', success:'#000', warning:'#000', destructive:'#000' },
      contentOverrides: {},
      shape: { radiusBox:8, radiusField:6, radiusSelector:4, border:1, depth:1 },
      type: { fontSans:'sans-serif', fontMono:'monospace', fontDisplay:'serif' },
      motion: { transition:'200ms' },
    });
    ta.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-action="apply"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(closed).toHaveBeenCalledWith({ imported: true });
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
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
