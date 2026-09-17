import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach } from 'vitest';
import { assertive } from './assertive';
import { polite } from './polite';

const frame = (): Promise<void> =>
  new Promise((r) => requestAnimationFrame(() => r(undefined)));

describe('polite', () => {
  afterEach(() => {
    document.querySelectorAll('[data-kj-live-region]').forEach((el) => el.remove());
  });

  it('announce writes to polite live region', async () => {
    TestBed.runInInjectionContext(() => {
      const s = polite();
      s.attach({} as never);
      s.announce('hello');
    });
    await frame();
    const region = document.querySelector('[data-kj-live-region="polite"]') as HTMLElement;
    expect(region).toBeTruthy();
    expect(region.textContent).toBe('hello');
  });

  it('adopts a region already in the document instead of creating a second one (mfe F-11)', async () => {
    // Stands in for the region another copy of the library (or a previous
    // instance of this one) already appended: discovery is a DOM query, so
    // there is exactly one region per politeness per page.
    const seeded = document.createElement('div');
    seeded.setAttribute('data-kj-live-region', 'polite');
    seeded.setAttribute('aria-live', 'polite');
    document.body.appendChild(seeded);

    const a = polite();
    const b = polite();
    a.attach({} as never);
    b.attach({} as never);
    a.announce('one');
    await frame();
    b.announce('two');
    await frame();

    expect(document.querySelectorAll('[data-kj-live-region="polite"]').length).toBe(1);
    expect(seeded.textContent).toBe('two');
  });

  it('keeps polite and assertive in separate regions', async () => {
    const p = polite();
    const a = assertive();
    p.attach({} as never);
    a.attach({} as never);
    p.announce('calm');
    a.announce('urgent');
    await frame();
    expect(
      document.querySelector('[data-kj-live-region="polite"]')!.textContent,
    ).toBe('calm');
    expect(
      document.querySelector('[data-kj-live-region="assertive"]')!.textContent,
    ).toBe('urgent');
  });

  it('creates no region when the overlay context reports a non-browser platform (ssr F-14)', () => {
    const s = polite();
    s.attach({ platform: { isBrowser: false } } as never);
    s.announce('hello');
    expect(document.querySelector('[data-kj-live-region]')).toBeNull();
  });
});
