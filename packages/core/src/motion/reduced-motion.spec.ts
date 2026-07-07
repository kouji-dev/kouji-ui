import { Component, PLATFORM_ID, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { KjReducedMotion } from './reduced-motion';

/**
 * Flush microtasks + the rAF that backs afterNextRender so the service runs
 * its initial matchMedia read and attaches the listener.
 */
async function flushAfterNextRender(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

/** Build a controllable matchMedia stub and its change trigger. */
function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql: Partial<MediaQueryList> = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: ((_t: string, cb: EventListener) => {
      listeners.add(cb as (e: MediaQueryListEvent) => void);
    }) as MediaQueryList['addEventListener'],
    removeEventListener: ((_t: string, cb: EventListener) => {
      listeners.delete(cb as (e: MediaQueryListEvent) => void);
    }) as MediaQueryList['removeEventListener'],
  };
  const impl = (() => mql as MediaQueryList) as typeof window.matchMedia;
  const emit = (matches: boolean) => {
    (mql as { matches: boolean }).matches = matches;
    listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
  };
  return { impl, emit, listenerCount: () => listeners.size };
}

describe('KjReducedMotion', () => {
  it('is false initially when matchMedia does not match', async () => {
    const original = window.matchMedia;
    window.matchMedia = stubMatchMedia(false).impl;
    try {
      @Component({ standalone: true, template: '' })
      class Host {
        readonly motion = inject(KjReducedMotion);
      }
      const { fixture } = await render(Host);
      await flushAfterNextRender();
      expect(fixture.componentInstance.motion.prefersReducedMotion()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it('is true when matchMedia matches prefers-reduced-motion: reduce', async () => {
    const original = window.matchMedia;
    window.matchMedia = stubMatchMedia(true).impl;
    try {
      @Component({ standalone: true, template: '' })
      class Host {
        readonly motion = inject(KjReducedMotion);
      }
      const { fixture } = await render(Host);
      await flushAfterNextRender();
      expect(fixture.componentInstance.motion.prefersReducedMotion()).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });

  it('updates live when the OS setting flips', async () => {
    const original = window.matchMedia;
    const stub = stubMatchMedia(false);
    window.matchMedia = stub.impl;
    try {
      @Component({ standalone: true, template: '' })
      class Host {
        readonly motion = inject(KjReducedMotion);
      }
      const { fixture } = await render(Host);
      await flushAfterNextRender();
      expect(fixture.componentInstance.motion.prefersReducedMotion()).toBe(false);

      stub.emit(true);
      expect(fixture.componentInstance.motion.prefersReducedMotion()).toBe(true);

      stub.emit(false);
      expect(fixture.componentInstance.motion.prefersReducedMotion()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it('stays false and touches no DOM on the server (SSR no-op)', async () => {
    const original = window.matchMedia;
    // Fail loudly if the service reads matchMedia under a server platform.
    window.matchMedia = (() => {
      throw new Error('matchMedia must not be called on the server');
    }) as typeof window.matchMedia;
    try {
      @Component({ standalone: true, template: '' })
      class Host {
        readonly motion = inject(KjReducedMotion);
      }
      const { fixture } = await render(Host, {
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      await flushAfterNextRender();
      expect(fixture.componentInstance.motion.prefersReducedMotion()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it('does not throw when matchMedia is unavailable', async () => {
    const original = window.matchMedia;
    (window as unknown as { matchMedia: undefined }).matchMedia = undefined;
    try {
      @Component({ standalone: true, template: '' })
      class Host {
        readonly motion = inject(KjReducedMotion);
      }
      const { fixture } = await render(Host);
      await flushAfterNextRender();
      expect(fixture.componentInstance.motion.prefersReducedMotion()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it('registers exactly one matchMedia listener', async () => {
    const original = window.matchMedia;
    const stub = stubMatchMedia(false);
    window.matchMedia = stub.impl;
    try {
      @Component({ standalone: true, template: '' })
      class Host {
        readonly motion = inject(KjReducedMotion);
      }
      await render(Host);
      await flushAfterNextRender();
      expect(stub.listenerCount()).toBe(1);
    } finally {
      window.matchMedia = original;
    }
  });
});
