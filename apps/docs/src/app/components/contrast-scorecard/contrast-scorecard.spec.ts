import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ContrastScorecard } from './contrast-scorecard';
import { ThemeDraftService } from '../../services/theme-draft.service';

describe('ContrastScorecard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [ContrastScorecard] });
  });

  test('renders one row per pair', () => {
    const fixture = TestBed.createComponent(ContrastScorecard);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('[role="listitem"]');
    expect(rows.length).toBeGreaterThanOrEqual(13);
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
    draft.setColor('primary', draft.draft().colors['base-100']);
    const fixture = TestBed.createComponent(ContrastScorecard);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toMatch(/FAIL|✗/);
  });

  test('shows AAA contrast heading and summary badges', () => {
    const fixture = TestBed.createComponent(ContrastScorecard);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toMatch(/Contrast \(AAA/);
    expect(text).toMatch(/AAA\s+\d+%/);
  });
});
