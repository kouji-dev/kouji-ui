import { Component, PLATFORM_ID, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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

  /**
   * perf F-15. `KjOverlayController.runTransition` used to build its own
   * `matchMedia('(prefers-reduced-motion: reduce)')` on every open and every
   * close. It could not read the signal instead, because the signal is seeded
   * in `afterNextRender` (to keep hydration stable) and an overlay opened
   * before that render would have read a stale `false`. `matchesNow()` is the
   * reader that fixes both halves: live value, one shared MediaQueryList.
   */
  describe('matchesNow()', () => {
    it('reads the live value before the first render has seeded the signal', () => {
      const original = window.matchMedia;
      window.matchMedia = stubMatchMedia(true).impl;
      try {
        TestBed.configureTestingModule({});
        // Injected, never rendered — so the `afterNextRender` that seeds the
        // signal has not run. This is exactly the state an overlay opened
        // during the first tick sees.
        const motion = TestBed.inject(KjReducedMotion);
        expect(motion.prefersReducedMotion()).toBe(false);
        expect(motion.matchesNow()).toBe(true);
      } finally {
        window.matchMedia = original;
      }
    });

    it('shares one MediaQueryList across every call and the signal', async () => {
      const original = window.matchMedia;
      const stub = stubMatchMedia(false);
      let constructed = 0;
      window.matchMedia = ((q: string) => {
        constructed++;
        return stub.impl(q);
      }) as typeof window.matchMedia;
      try {
        @Component({ standalone: true, template: '' })
        class Host {
          readonly motion = inject(KjReducedMotion);
        }
        const { fixture } = await render(Host);
        const motion = fixture.componentInstance.motion;
        for (let i = 0; i < 10; i++) motion.matchesNow();
        await flushAfterNextRender();
        for (let i = 0; i < 10; i++) motion.matchesNow();
        expect(constructed).toBe(1);
      } finally {
        window.matchMedia = original;
      }
    });

    it('is false where matchMedia is unavailable', async () => {
      const original = window.matchMedia;
      (window as unknown as { matchMedia: undefined }).matchMedia = undefined;
      try {
        @Component({ standalone: true, template: '' })
        class Host {
          readonly motion = inject(KjReducedMotion);
        }
        const { fixture } = await render(Host);
        expect(fixture.componentInstance.motion.matchesNow()).toBe(false);
      } finally {
        window.matchMedia = original;
      }
    });

    it('is false on the server without touching matchMedia', async () => {
      const original = window.matchMedia;
      let constructed = 0;
      window.matchMedia = ((q: string) => {
        constructed++;
        return stubMatchMedia(true).impl(q);
      }) as typeof window.matchMedia;
      try {
        @Component({ standalone: true, template: '' })
        class Host {
          readonly motion = inject(KjReducedMotion);
        }
        const { fixture } = await render(Host, {
          providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
        });
        expect(fixture.componentInstance.motion.matchesNow()).toBe(false);
        expect(constructed).toBe(0);
      } finally {
        window.matchMedia = original;
      }
    });
  });
});
