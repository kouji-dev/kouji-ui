import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KJ_BUTTON_CONFIG, KJ_BUTTON_DEFAULTS, provideKjButton } from './config';

describe('KJ_BUTTON_CONFIG', () => {
  it('default factory returns the shipped defaults', () => {
    expect(TestBed.inject(KJ_BUTTON_CONFIG)).toEqual(KJ_BUTTON_DEFAULTS);
  });

  it('provideKjButton replaces variants and sizes (no merge)', () => {
    TestBed.configureTestingModule({
      providers: [provideKjButton({ variants: ['only-one'], sizes: ['only-md'] })],
    });
    const cfg = TestBed.inject(KJ_BUTTON_CONFIG);
    expect(cfg.variants).toEqual(['only-one']);
    expect(cfg.sizes).toEqual(['only-md']);
    expect(cfg.defaults).toEqual(KJ_BUTTON_DEFAULTS.defaults);
  });

  it('provideKjButton overrides defaults when given', () => {
    TestBed.configureTestingModule({
      providers: [
        provideKjButton({
          variants: ['a', 'b'],
          defaults: { variant: 'b', size: 'lg' },
        }),
      ],
    });
    const cfg = TestBed.inject(KJ_BUTTON_CONFIG);
    expect(cfg.defaults).toEqual({ variant: 'b', size: 'lg' });
    expect(cfg.sizes).toEqual(KJ_BUTTON_DEFAULTS.sizes);
  });
});
