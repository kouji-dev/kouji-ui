import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach } from 'vitest';
import { polite } from './polite';

describe('polite', () => {
  afterEach(() => {
    document.querySelectorAll('[data-kj-live-region]').forEach(el => el.remove());
  });

  it('announce writes to polite live region', async () => {
    TestBed.runInInjectionContext(() => {
      const s = polite();
      s.attach({} as never);
      s.announce('hello');
    });
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    const region = document.querySelector('[data-kj-live-region="polite"]') as HTMLElement;
    expect(region).toBeTruthy();
    expect(region.textContent).toBe('hello');
  });
});
