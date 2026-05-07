import { render } from '@testing-library/angular';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { KjSpinner } from './spinner';

/**
 * Flush microtasks + the rAF that backs `afterNextRender` so the directive
 * has a chance to read host attributes and the `prefers-reduced-motion`
 * media query.
 */
async function flushAfterNextRender(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Stub `window.matchMedia` for a deterministic `prefers-reduced-motion`
 * value during a test. Returns the listener registered by the directive so
 * the test can simulate a runtime change of the user preference.
 */
function stubMatchMedia(initial: boolean): {
  fire: (matches: boolean) => void;
  restore: () => void;
} {
  const original = window.matchMedia;
  let listener: ((e: MediaQueryListEvent) => void) | null = null;
  const mql: Partial<MediaQueryList> = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: ((_type: string, l: EventListener) => {
      listener = l as (e: MediaQueryListEvent) => void;
    }) as MediaQueryList['addEventListener'],
    removeEventListener: (() => {
      listener = null;
    }) as MediaQueryList['removeEventListener'],
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => true,
  };
  (window as unknown as { matchMedia: (q: string) => MediaQueryList }).matchMedia = () =>
    mql as MediaQueryList;
  return {
    fire: (matches: boolean) => {
      (mql as { matches: boolean }).matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
    restore: () => {
      window.matchMedia = original;
    },
  };
}

describe('KjSpinner', () => {
  let mm: ReturnType<typeof stubMatchMedia>;

  beforeEach(() => {
    mm = stubMatchMedia(false);
  });

  afterEach(() => {
    mm.restore();
  });

  describe('a11y contract', () => {
    it('sets role="status" on the host', async () => {
      const { container } = await render(`<span kjSpinner></span>`, {
        imports: [KjSpinner],
      });
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('role', 'status');
    });

    it('sets aria-live="polite" and aria-atomic="true"', async () => {
      const { container } = await render(`<span kjSpinner></span>`, {
        imports: [KjSpinner],
      });
      await flushAfterNextRender();
      const host = container.querySelector('span')!;
      expect(host).toHaveAttribute('aria-live', 'polite');
      expect(host).toHaveAttribute('aria-atomic', 'true');
    });

    it('applies default aria-label="Loading" when no consumer label is provided', async () => {
      const { container } = await render(`<span kjSpinner></span>`, {
        imports: [KjSpinner],
      });
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('aria-label', 'Loading');
    });

    it('consumer kjAriaLabel input wins over the default', async () => {
      const { container } = await render(
        `<span kjSpinner kjAriaLabel="Sending"></span>`,
        { imports: [KjSpinner] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('aria-label', 'Sending');
    });

    it('does not override a consumer-authored aria-label attribute on the host', async () => {
      const { container } = await render(
        `<span kjSpinner aria-label="Saving draft"></span>`,
        { imports: [KjSpinner] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('aria-label', 'Saving draft');
    });

    it('does not set aria-label when host carries aria-labelledby', async () => {
      const { container } = await render(
        `<span id="lbl">Loading users</span>
         <span kjSpinner aria-labelledby="lbl"></span>`,
        { imports: [KjSpinner] },
      );
      await flushAfterNextRender();
      const host = container.querySelector('span[kjSpinner]')!;
      expect(host).not.toHaveAttribute('aria-label');
      expect(host).toHaveAttribute('aria-labelledby', 'lbl');
    });
  });

  describe('data-animation reflection', () => {
    it('defaults to data-animation="spin"', async () => {
      const { container } = await render(`<span kjSpinner></span>`, {
        imports: [KjSpinner],
      });
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('data-animation', 'spin');
    });

    it('reflects kjAnimation="dots"', async () => {
      const { container } = await render(
        `<span kjSpinner kjAnimation="dots"></span>`,
        { imports: [KjSpinner] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('data-animation', 'dots');
    });

    it('reflects kjAnimation="pulse"', async () => {
      const { container } = await render(
        `<span kjSpinner kjAnimation="pulse"></span>`,
        { imports: [KjSpinner] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('data-animation', 'pulse');
    });

    it('reflects kjAnimation="bars"', async () => {
      const { container } = await render(
        `<span kjSpinner kjAnimation="bars"></span>`,
        { imports: [KjSpinner] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('data-animation', 'bars');
    });
  });

  describe('data-reduced-motion mirrors prefers-reduced-motion', () => {
    it('omits data-reduced-motion when the user preference is not set', async () => {
      const { container } = await render(`<span kjSpinner></span>`, {
        imports: [KjSpinner],
      });
      await flushAfterNextRender();
      expect(container.querySelector('span')).not.toHaveAttribute('data-reduced-motion');
    });

    it('reflects data-reduced-motion="true" when the media query matches at mount', async () => {
      mm.restore();
      mm = stubMatchMedia(true);
      const { container } = await render(`<span kjSpinner></span>`, {
        imports: [KjSpinner],
      });
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('data-reduced-motion', 'true');
    });

    it('updates data-reduced-motion when the media query changes at runtime', async () => {
      const { container, fixture } = await render(`<span kjSpinner></span>`, {
        imports: [KjSpinner],
      });
      await flushAfterNextRender();
      const host = container.querySelector('span')!;
      expect(host).not.toHaveAttribute('data-reduced-motion');

      mm.fire(true);
      fixture.detectChanges();
      expect(host).toHaveAttribute('data-reduced-motion', 'true');

      mm.fire(false);
      fixture.detectChanges();
      expect(host).not.toHaveAttribute('data-reduced-motion');
    });

    it('does not throw when window.matchMedia is unavailable (SSR-style)', async () => {
      mm.restore();
      const original = window.matchMedia;
      // Simulate non-browser env at the time afterNextRender runs.
      (window as unknown as { matchMedia: undefined }).matchMedia = undefined;
      try {
        const { container } = await render(`<span kjSpinner></span>`, {
          imports: [KjSpinner],
        });
        await flushAfterNextRender();
        expect(container.querySelector('span')).not.toHaveAttribute('data-reduced-motion');
      } finally {
        window.matchMedia = original;
        mm = stubMatchMedia(false);
      }
    });
  });

  describe('KjVariant + KjSize composition', () => {
    it('reflects default data-variant="neutral" from KJ_SPINNER_DEFAULTS', async () => {
      const { container } = await render(`<span kjSpinner></span>`, {
        imports: [KjSpinner],
      });
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('data-variant', 'neutral');
    });

    it('reflects default data-size="md" from KJ_SPINNER_DEFAULTS', async () => {
      const { container } = await render(`<span kjSpinner></span>`, {
        imports: [KjSpinner],
      });
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('data-size', 'md');
    });

    it('forwards kjVariant input to data-variant (composed via hostDirectives)', async () => {
      const { container } = await render(
        `<span kjSpinner kjVariant="primary"></span>`,
        { imports: [KjSpinner] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('data-variant', 'primary');
    });

    it('forwards kjSize input to data-size (composed via hostDirectives)', async () => {
      const { container } = await render(
        `<span kjSpinner kjSize="xs"></span>`,
        { imports: [KjSpinner] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('span')).toHaveAttribute('data-size', 'xs');
    });

    it('warns on unknown variant in dev mode', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        await render(`<span kjSpinner kjVariant="bogus"></span>`, {
          imports: [KjSpinner],
        });
        await flushAfterNextRender();
        expect(warn).toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  });
});
