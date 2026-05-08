import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach } from 'vitest';
import { assertive } from './assertive';

describe('assertive', () => {
  afterEach(() => {
    document.querySelectorAll('[data-kj-live-region]').forEach(el => el.remove());
  });

  it('announce writes to assertive live region', async () => {
    TestBed.runInInjectionContext(() => {
      const s = assertive();
      s.attach({} as never);
      s.announce('boom');
    });
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    const region = document.querySelector('[data-kj-live-region="assertive"]') as HTMLElement;
    expect(region).toBeTruthy();
    expect(region.textContent).toBe('boom');
  });
});
