import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { A11yPanel } from './a11y-panel';

describe('A11yPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  test('renders the contrast scorecard', () => {
    const fixture = TestBed.createComponent(A11yPanel);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-contrast-scorecard')).not.toBeNull();
  });
});
