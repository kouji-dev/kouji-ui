import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ContrastScorecard } from './contrast-scorecard';
import { ThemeDraftService } from '../../services/theme-draft.service';

/**
 * Rewritten against the current report: the scorecard groups edges as
 * Contrast (AA 4.5:1) / Non-text (3:1) / Typography, and the summary badge
 * reads `AA <n>%`. The old assertions named `AAA` and the removed
 * `colors` / `setColor` draft API.
 */
describe('ContrastScorecard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [ContrastScorecard] });
  });

  test('renders one row per pair', () => {
    const fixture = TestBed.createComponent(ContrastScorecard);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('[role="listitem"]');
    // 10 AA-normal edges + 6 non-text edges + 2 typography checks.
    expect(rows.length).toBeGreaterThanOrEqual(16);
  });

  test('row aria-label describes the pair and ratio', () => {
    const fixture = TestBed.createComponent(ContrastScorecard);
    fixture.detectChanges();
    const first = fixture.nativeElement.querySelector('[role="listitem"]');
    expect(first.getAttribute('aria-label')).toMatch(/contrast/);
  });

  test('failing pair shows visible FAIL label', () => {
    const draft = TestBed.inject(ThemeDraftService);
    draft.loadFork('kouji');
    draft.setFg('fg-on-primary', draft.draft().bg['bg-primary']);
    const fixture = TestBed.createComponent(ContrastScorecard);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toMatch(/FAIL|✗/);
  });

  test('shows the AA contrast heading and summary badges', () => {
    const fixture = TestBed.createComponent(ContrastScorecard);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toMatch(/Contrast \(AA 4\.5:1\)/);
    expect(text).toMatch(/AA\s+\d+%/);
    expect(text).toMatch(/Non-text \d+\/\d+/);
  });

  test('the badge percentage follows the draft', () => {
    const draft = TestBed.inject(ThemeDraftService);
    draft.loadFork('kouji');
    const fixture = TestBed.createComponent(ContrastScorecard);
    fixture.detectChanges();
    const before = /AA\s+(\d+)%/.exec(fixture.nativeElement.textContent ?? '')?.[1];

    // Break every intent pair at once: same ink as fill.
    for (const intent of ['primary', 'accent', 'info', 'success', 'warning', 'danger'] as const) {
      draft.setFg(`fg-on-${intent}`, draft.draft().bg[`bg-${intent}`]);
    }
    fixture.detectChanges();
    const after = /AA\s+(\d+)%/.exec(fixture.nativeElement.textContent ?? '')?.[1];
    expect(Number(after)).toBeLessThan(Number(before));
  });
});
