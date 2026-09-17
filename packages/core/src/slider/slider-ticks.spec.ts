import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { KjSlider, coerceTicks } from './slider';

/**
 * arch F-2, the tri-state half. `kjTicks` is `readonly number[] | 'auto' |
 * false`, so `booleanAttribute` on its own would destroy two of the three
 * modes — which is why earlier sweeps skipped it and left a note.
 *
 * Skipping it was not free. Angular does not type-check static attributes, so
 * `kjTicks="false"` bound the STRING `"false"`, which is neither `false` nor
 * an array — and the resolver's last branch is `'auto'`. An author who wrote
 * ticks off got one tick per step. These pin the coercion that fixes it,
 * alongside the two modes it has to preserve.
 */
describe('coerceTicks (the kjTicks tri-state transform)', () => {
  it('keeps an explicit array untouched', () => {
    const ticks = [0, 10, 50];
    expect(coerceTicks(ticks)).toBe(ticks);
  });

  it('keeps the two string-ish "on" spellings as auto', () => {
    expect(coerceTicks('auto')).toBe('auto');
    // A bare `kjTicks` attribute binds the empty string. `'auto'` is the only
    // "on" this input has, so that is what it means.
    expect(coerceTicks('')).toBe('auto');
    expect(coerceTicks(true)).toBe('auto');
  });

  it('reads every "off" spelling as false, including the string', () => {
    expect(coerceTicks(false)).toBe(false);
    // The one that used to silently turn ticks ON.
    expect(coerceTicks('false')).toBe(false);
    expect(coerceTicks(null)).toBe(false);
    expect(coerceTicks(undefined)).toBe(false);
  });
});

describe('KjSlider.ticks resolves each mode', () => {
  @Component({
    standalone: true,
    imports: [KjSlider],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <div kjSlider [kjMin]="0" [kjMax]="10" [kjStep]="5" [kjTicks]="ticks()"></div>
    `,
  })
  class BoundHost {
    readonly ticks = signal<readonly number[] | 'auto' | false>(false);
  }

  @Component({
    standalone: true,
    imports: [KjSlider],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div kjSlider kjMin="0" kjMax="10" kjStep="5" kjTicks="false" data-test="off"></div>`,
  })
  class StaticOffHost {}

  @Component({
    standalone: true,
    imports: [KjSlider],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div kjSlider kjMin="0" kjMax="10" kjStep="5" kjTicks data-test="bare"></div>`,
  })
  class BareHost {}

  /** The `KjSlider` instance on the one `[kjSlider]` element in the fixture. */
  function sliderOf(fixture: ComponentFixture<unknown>): KjSlider {
    return fixture.debugElement
      .query((d) => d.nativeElement?.hasAttribute?.('kjSlider'))
      .injector.get(KjSlider);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('a bound array, a bound "auto" and a bound false each resolve', () => {
    const fixture = TestBed.createComponent(BoundHost);
    fixture.detectChanges();
    const slider = sliderOf(fixture);

    expect(slider.ticks()).toEqual([]);

    fixture.componentInstance.ticks.set('auto');
    fixture.detectChanges();
    expect(slider.ticks()).toEqual([0, 5, 10]);

    fixture.componentInstance.ticks.set([1, 9]);
    fixture.detectChanges();
    expect(slider.ticks()).toEqual([1, 9]);
  });

  it('the static kjTicks="false" really renders no ticks', () => {
    const fixture = TestBed.createComponent(StaticOffHost);
    fixture.detectChanges();
    const slider = sliderOf(fixture);
    // Pre-transform this was `[0, 5, 10]` — the string `"false"` fell through
    // to the `'auto'` branch.
    expect(slider.ticks()).toEqual([]);
  });

  it('a bare kjTicks attribute means auto', () => {
    const fixture = TestBed.createComponent(BareHost);
    fixture.detectChanges();
    const slider = sliderOf(fixture);
    expect(slider.ticks()).toEqual([0, 5, 10]);
  });
});
