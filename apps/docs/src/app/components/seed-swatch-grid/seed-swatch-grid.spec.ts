import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SeedSwatchGrid } from './seed-swatch-grid';
import { SEED_SWATCHES } from '../../lib/theme/seed-swatches';

describe('SeedSwatchGrid', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SeedSwatchGrid] });
  });

  test('renders one button per swatch', () => {
    const fixture = TestBed.createComponent(SeedSwatchGrid);
    fixture.componentRef.setInput('activeHex', null);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button[data-hex]');
    expect(buttons.length).toBe(SEED_SWATCHES.length);
  });

  test('emits seedPicked on click with the hex', () => {
    const fixture = TestBed.createComponent(SeedSwatchGrid);
    fixture.componentRef.setInput('activeHex', null);
    fixture.detectChanges();
    const spy = vi.fn();
    fixture.componentInstance.seedPicked.subscribe(spy);
    const first = fixture.nativeElement.querySelector('button[data-hex]') as HTMLButtonElement;
    first.click();
    expect(spy).toHaveBeenCalledWith(first.dataset['hex']);
  });

  test('marks the activeHex button with aria-pressed=true', () => {
    const fixture = TestBed.createComponent(SeedSwatchGrid);
    fixture.componentRef.setInput('activeHex', SEED_SWATCHES[0].hex);
    fixture.detectChanges();
    const active = fixture.nativeElement.querySelector(`button[data-hex="${SEED_SWATCHES[0].hex}"]`);
    expect(active.getAttribute('aria-pressed')).toBe('true');
  });

  test('groups by hue family', () => {
    const fixture = TestBed.createComponent(SeedSwatchGrid);
    fixture.componentRef.setInput('activeHex', null);
    fixture.detectChanges();
    const groups = fixture.nativeElement.querySelectorAll('[data-family]');
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });
});
