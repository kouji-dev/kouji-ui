import { render } from '@testing-library/angular';
import { KjMotion } from './motion';

/** Flush the afterNextRender that backs KjReducedMotion. */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

/** matchMedia stub so the injected KjReducedMotion is deterministic. */
function stubMatchMedia(matches: boolean) {
  const original = window.matchMedia;
  window.matchMedia = (() =>
    ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('KjMotion', () => {
  it('adds the kj-motion class and reflects the preset name', async () => {
    const restore = stubMatchMedia(false);
    try {
      const { container } = await render(`<div kjMotion="slide-up-fade"></div>`, {
        imports: [KjMotion],
      });
      await flush();
      const el = container.querySelector('[kjMotion]')!;
      expect(el).toHaveClass('kj-motion');
      expect(el).toHaveAttribute('data-kj-motion', 'slide-up-fade');
    } finally {
      restore();
    }
  });

  it('defaults data-kj-motion-state to "enter"', async () => {
    const restore = stubMatchMedia(false);
    try {
      const { container } = await render(`<div kjMotion="fade"></div>`, {
        imports: [KjMotion],
      });
      await flush();
      expect(container.querySelector('[kjMotion]')).toHaveAttribute(
        'data-kj-motion-state',
        'enter',
      );
    } finally {
      restore();
    }
  });

  it('reflects an explicit exit state', async () => {
    const restore = stubMatchMedia(false);
    try {
      const { container } = await render(
        `<div kjMotion="scale" kjMotionState="exit"></div>`,
        { imports: [KjMotion] },
      );
      await flush();
      expect(container.querySelector('[kjMotion]')).toHaveAttribute(
        'data-kj-motion-state',
        'exit',
      );
    } finally {
      restore();
    }
  });

  it('omits data-kj-reduced-motion when motion is allowed', async () => {
    const restore = stubMatchMedia(false);
    try {
      const { container } = await render(`<div kjMotion="fade"></div>`, {
        imports: [KjMotion],
      });
      await flush();
      expect(container.querySelector('[kjMotion]')).not.toHaveAttribute(
        'data-kj-reduced-motion',
      );
    } finally {
      restore();
    }
  });

  it('sets data-kj-reduced-motion when the user prefers reduced motion', async () => {
    const restore = stubMatchMedia(true);
    try {
      const { container } = await render(`<div kjMotion="fade"></div>`, {
        imports: [KjMotion],
      });
      await flush();
      expect(container.querySelector('[kjMotion]')).toHaveAttribute(
        'data-kj-reduced-motion',
        '',
      );
    } finally {
      restore();
    }
  });
});
