import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { TypePanel } from './type-panel';
import { ThemeDraftService } from '../../../services/theme-draft.service';

describe('TypePanel', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  test('renders a select for each font key', () => {
    const fixture = TestBed.createComponent(TypePanel);
    fixture.detectChanges();
    const selects = fixture.nativeElement.querySelectorAll('select[data-font]');
    expect(selects.length).toBe(3);
  });

  test('writes font selection through to the draft service', () => {
    const fixture = TestBed.createComponent(TypePanel);
    fixture.detectChanges();
    const draft = TestBed.inject(ThemeDraftService);
    const select = fixture.nativeElement.querySelector('select[data-font="fontSans"]') as HTMLSelectElement;
    const option = Array.from(select.options).find(o => o.value !== 'system-ui');
    expect(option).toBeTruthy();
    select.value = option!.value;
    select.dispatchEvent(new Event('change'));
    expect(draft.draft().type.fontSans).toContain(option!.textContent?.trim() ?? '');
  });
});
