import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { KJ_SIZE_PRESET, KjSize } from './size';

@Component({
  standalone: true,
  imports: [KjSize],
  template: `<button kjSize [kjSize]="value">x</button>`,
})
class HostComponent {
  value: string | undefined = undefined;
}

describe('KjSize', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reflects kjSize input as data-size on the host', async () => {
    const { getByRole } = await render(`<button kjSize [kjSize]="'lg'">x</button>`, {
      imports: [KjSize],
      providers: [
        { provide: KJ_SIZE_PRESET, useValue: { values: ['md', 'lg'], default: 'md' } },
      ],
    });
    expect(getByRole('button')).toHaveAttribute('data-size', 'lg');
  });

  it('falls back to KJ_SIZE_PRESET.default when input not set', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_SIZE_PRESET, useValue: { values: ['xs', 'md'], default: 'md' } }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('data-size')).toBe('md');
  });

  it('uses the built-in factory default when no provider is registered', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('data-size')).toBe('md');
  });

  it('warns once in dev mode for an unknown value', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_SIZE_PRESET, useValue: { values: ['xs', 'md'], default: 'md' } }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = 'bogus';
    fixture.detectChanges();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/unknown size/i);
  });

  it('does not warn for a known value', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_SIZE_PRESET, useValue: { values: ['xs', 'md'], default: 'md' } }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = 'xs';
    fixture.detectChanges();
    expect(warn).not.toHaveBeenCalled();
  });
});
