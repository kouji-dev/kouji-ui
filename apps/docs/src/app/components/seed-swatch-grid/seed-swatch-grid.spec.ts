import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SeedSwatchGrid } from './seed-swatch-grid';
import {
  HUE_FAMILIES,
  SEED_SHADE_COUNT,
  SEED_SWATCHES,
} from '../../lib/theme/seed-swatches';
import { hexOklchLightness } from '../../lib/theme/theme-color-utils';

describe('SeedSwatchGrid', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SeedSwatchGrid] });
  });

  test('renders one button per flattened swatch', () => {
    const fixture = TestBed.createComponent(SeedSwatchGrid);
    fixture.componentRef.setInput('activeHex', null);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button[data-hex]');
    expect(buttons.length).toBe(SEED_SWATCHES.length);
  });

  test('renders one hue row per family', () => {
    const fixture = TestBed.createComponent(SeedSwatchGrid);
    fixture.componentRef.setInput('activeHex', null);
    fixture.detectChanges();
    const cols = fixture.nativeElement.querySelectorAll('[data-family]');
    expect(cols.length).toBe(HUE_FAMILIES.length);
  });

  test('each row has SEED_SHADE_COUNT horizontal swatches', () => {
    const fixture = TestBed.createComponent(SeedSwatchGrid);
    fixture.componentRef.setInput('activeHex', null);
    fixture.detectChanges();
    const ramps = fixture.nativeElement.querySelectorAll('.hue-row__ramp');
    expect(ramps.length).toBe(HUE_FAMILIES.length);
    for (const ramp of Array.from(ramps) as HTMLElement[]) {
      expect(ramp.querySelectorAll('button[data-hex]').length).toBe(SEED_SHADE_COUNT);
    }
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

  test('within each row, shades are lighter on the left than the right', () => {
    const fixture = TestBed.createComponent(SeedSwatchGrid);
    fixture.componentRef.setInput('activeHex', null);
    fixture.detectChanges();
    const ramps = fixture.nativeElement.querySelectorAll('.hue-row__ramp');
    for (const ramp of Array.from(ramps) as HTMLElement[]) {
      const hexes = Array.from(ramp.querySelectorAll('button[data-hex]')).map(
        b => (b as HTMLElement).dataset['hex']!,
      );
      for (let i = 0; i < hexes.length - 1; i++) {
        expect(hexOklchLightness(hexes[i])).toBeGreaterThanOrEqual(hexOklchLightness(hexes[i + 1]));
      }
    }
  });

  test('palette layout applies palette class', () => {
    const fixture = TestBed.createComponent(SeedSwatchGrid);
    fixture.componentRef.setInput('activeHex', null);
    fixture.componentRef.setInput('layout', 'palette');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.seed-grid--palette')).toBeTruthy();
  });
});
