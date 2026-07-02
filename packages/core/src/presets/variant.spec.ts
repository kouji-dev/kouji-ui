import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { KJ_VARIANT_PRESET, KjVariant } from './variant';

@Component({
  standalone: true,
  imports: [KjVariant],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<button kjVariant [kjVariant]="value">x</button>`,
})
class HostComponent {
  value: string | undefined = undefined;
}

describe('KjVariant', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reflects kjVariant input as data-variant on the host', async () => {
    const { getByRole } = await render(`<button kjVariant [kjVariant]="'destructive'">x</button>`, {
      imports: [KjVariant],
      providers: [
        {
          provide: KJ_VARIANT_PRESET,
          useValue: { values: ['default', 'destructive'], default: 'default' },
        },
      ],
    });
    expect(getByRole('button')).toHaveAttribute('data-variant', 'destructive');
  });

  it('falls back to KJ_VARIANT_PRESET.default when input not set', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_VARIANT_PRESET, useValue: { values: ['a', 'b'], default: 'b' } }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('data-variant')).toBe('b');
  });

  it('uses the built-in factory default when no provider is registered', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('data-variant')).toBe('default');
  });

  it('warns once in dev mode for an unknown value', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_VARIANT_PRESET, useValue: { values: ['a', 'b'], default: 'a' } }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = 'bogus';
    fixture.detectChanges();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/unknown variant/i);
  });

  it('does not warn for a known value', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_VARIANT_PRESET, useValue: { values: ['a', 'b'], default: 'a' } }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = 'b';
    fixture.detectChanges();
    expect(warn).not.toHaveBeenCalled();
  });
});
