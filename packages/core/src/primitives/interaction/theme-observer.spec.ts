import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KjThemeObserver } from './theme-observer';

/** MutationObserver callbacks are delivered as microtasks. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('KjThemeObserver', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  it('runs the handler when the theme changes on <html>', async () => {
    const svc = TestBed.inject(KjThemeObserver);
    const seen = vi.fn();
    const release = svc.observe(seen);

    document.documentElement.setAttribute('data-theme', 'dark');
    await flush();

    expect(seen).toHaveBeenCalledTimes(1);
    release();
  });

  it('bumps version so a computed can re-derive on a theme switch', async () => {
    const svc = TestBed.inject(KjThemeObserver);
    const release = svc.observe(() => {});
    const before = svc.version();

    document.documentElement.setAttribute('data-theme', 'retro');
    await flush();

    expect(svc.version()).toBe(before + 1);
    release();
  });

  it('constructs ONE MutationObserver for many handlers on the same element', () => {
    // Subclass rather than spy: tinyspy does not intercept `new`.
    const real = globalThis.MutationObserver;
    let constructed = 0;
    vi.stubGlobal(
      'MutationObserver',
      class extends real {
        constructor(callback: MutationCallback) {
          super(callback);
          constructed++;
        }
      },
    );
    try {
      const svc = TestBed.inject(KjThemeObserver);
      const releases = [svc.observe(() => {}), svc.observe(() => {}), svc.observe(() => {})];
      expect(constructed, 'three charts used to mean three observers on <html>').toBe(1);
      for (const release of releases) release();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fans one mutation out to every registered handler', async () => {
    const svc = TestBed.inject(KjThemeObserver);
    const a = vi.fn();
    const b = vi.fn();
    const releases = [svc.observe(a), svc.observe(b)];

    document.documentElement.setAttribute('data-theme', 'mint');
    await flush();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    for (const release of releases) release();
  });

  it('also watches a scoped theme wrapper, without a second observer on <html>', async () => {
    const scope = document.createElement('div');
    scope.setAttribute('data-theme', 'light');
    document.body.appendChild(scope);

    const svc = TestBed.inject(KjThemeObserver);
    const seen = vi.fn();
    const release = svc.observe(seen, scope);

    scope.setAttribute('data-theme', 'dark');
    await flush();
    expect(seen).toHaveBeenCalledTimes(1);

    document.documentElement.setAttribute('data-theme', 'dark');
    await flush();
    expect(seen).toHaveBeenCalledTimes(2);

    release();
    scope.remove();
  });

  it('stops observing once the last handler for a target is released', async () => {
    const svc = TestBed.inject(KjThemeObserver);
    const a = vi.fn();
    const b = vi.fn();
    const releaseA = svc.observe(a);
    const releaseB = svc.observe(b);

    releaseA();
    document.documentElement.setAttribute('data-theme', 'dark');
    await flush();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);

    releaseB();
    document.documentElement.setAttribute('data-theme', 'light');
    await flush();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('a handler that disposes itself while running does not break the fan-out', async () => {
    const svc = TestBed.inject(KjThemeObserver);
    const second = vi.fn();
    let releaseFirst = () => {};
    releaseFirst = svc.observe(() => releaseFirst());
    const releaseSecond = svc.observe(second);

    document.documentElement.setAttribute('data-theme', 'dark');
    await flush();

    expect(second).toHaveBeenCalledTimes(1);
    releaseSecond();
  });
});
