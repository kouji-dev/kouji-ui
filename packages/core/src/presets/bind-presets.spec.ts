import { InjectionToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KJ_VARIANT_PRESET } from './variant';
import { KJ_SIZE_PRESET } from './size';
import { bindPresets } from './bind-presets';

interface DummyConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

const DUMMY_CONFIG = new InjectionToken<DummyConfig>('dummy.config');

describe('bindPresets', () => {
  it('translates a config token into KJ_VARIANT_PRESET', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DUMMY_CONFIG,
          useValue: {
            variants: ['a', 'b'],
            sizes: ['s', 'm'],
            defaults: { variant: 'b', size: 'm' },
          },
        },
        ...bindPresets(DUMMY_CONFIG),
      ],
    });
    expect(TestBed.inject(KJ_VARIANT_PRESET)).toEqual({ values: ['a', 'b'], default: 'b' });
  });

  it('translates a config token into KJ_SIZE_PRESET', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DUMMY_CONFIG,
          useValue: {
            variants: ['a'],
            sizes: ['s', 'm', 'l'],
            defaults: { variant: 'a', size: 'l' },
          },
        },
        ...bindPresets(DUMMY_CONFIG),
      ],
    });
    expect(TestBed.inject(KJ_SIZE_PRESET)).toEqual({ values: ['s', 'm', 'l'], default: 'l' });
  });
});
