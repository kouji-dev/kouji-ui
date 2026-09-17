import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { TypePanel } from './type-panel';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { CURATED_FONTS } from '../../../lib/theme/font-catalog';

/**
 * Rewritten against the current panel: the three native `<select data-font>`
 * elements were replaced by `<kj-select>` + `<kj-option>`, so the old
 * `querySelectorAll('select[data-font]')` assertions matched nothing.
 */
describe('TypePanel', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  test('renders a select for each font key', () => {
    const fixture = TestBed.createComponent(TypePanel);
    fixture.detectChanges();
    const selects = fixture.nativeElement.querySelectorAll('kj-select');
    expect(selects.length).toBe(3);
  });

  /** WCAG 1.3.1 — each control is named by its visible row label. */
  test('each font row is labelled', () => {
    const fixture = TestBed.createComponent(TypePanel);
    fixture.detectChanges();
    for (const id of ['type-font-sans-label', 'type-font-mono-label', 'type-font-display-label']) {
      const label = fixture.nativeElement.querySelector(`#${id}`);
      expect(label, `missing ${id}`).not.toBeNull();
      const group = fixture.nativeElement.querySelector(`[aria-labelledby="${id}"]`);
      expect(group, `nothing is labelled by ${id}`).not.toBeNull();
    }
  });

  test('writes font selection through to the draft service', () => {
    const fixture = TestBed.createComponent(TypePanel);
    fixture.detectChanges();
    const draft = TestBed.inject(ThemeDraftService);

    const font = CURATED_FONTS.find(f => f.category === 'sans' && f.id !== 'system-ui');
    expect(font, 'no curated sans font other than system-ui').toBeTruthy();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('kj-option') as NodeListOf<HTMLElement>,
    ).filter(o => o.textContent?.trim() === font!.family);
    expect(options.length).toBeGreaterThan(0);

    // The first select in DOM order is font-sans.
    options[0].click();
    expect(draft.draft().type.fontSans).toContain(font!.family);
  });

  test('the select pre-selects the font already in the draft', () => {
    const draft = TestBed.inject(ThemeDraftService);
    const font = CURATED_FONTS.find(f => f.category === 'mono' && f.id !== 'system-ui');
    expect(font).toBeTruthy();
    draft.setFont('fontMono', `'${font!.family}', monospace`);

    const fixture = TestBed.createComponent(TypePanel);
    fixture.detectChanges();
    const selected = fixture.nativeElement.querySelectorAll('kj-option[aria-selected="true"]');
    const labels = Array.from(selected as NodeListOf<HTMLElement>).map(o => o.textContent?.trim());
    expect(labels).toContain(font!.family);
  });
});
