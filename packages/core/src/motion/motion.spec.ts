import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { KjMotion } from './motion';
import { KJ_MOTION_CONFIG, KJ_MOTION_DEFAULTS, provideKjMotion } from './config';

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

describe('KjMotion — configuration surface (cust F-20)', () => {
  it('writes the configured timing scale onto the host as --kj-motion-* properties', async () => {
    const restore = stubMatchMedia(false);
    try {
      TestBed.configureTestingModule({
        providers: [
          ...provideKjMotion({
            durations: { md: '180ms' },
            easings: { default: 'ease-out' },
            defaults: { distance: '1rem' },
          }),
        ],
      });
      const { container } = await render(`<div kjMotion="fade"></div>`, { imports: [KjMotion] });
      await flush();
      const el = container.querySelector('[kjMotion]') as HTMLElement;
      expect(el.style.getPropertyValue('--kj-motion-duration-md')).toBe('180ms');
      expect(el.style.getPropertyValue('--kj-motion-ease')).toBe('ease-out');
      expect(el.style.getPropertyValue('--kj-motion-distance')).toBe('1rem');
    } finally {
      restore();
    }
  });

  it('deep-merges: naming one duration keeps the rest of the scale', async () => {
    TestBed.configureTestingModule({
      providers: [...provideKjMotion({ durations: { md: '180ms' } })],
    });
    const config = TestBed.inject(KJ_MOTION_CONFIG);
    expect(config.durations).toEqual({ ...KJ_MOTION_DEFAULTS.durations, md: '180ms' });
    expect(config.easings).toEqual(KJ_MOTION_DEFAULTS.easings);
  });

  it('warns once in dev mode for a preset that is not registered', async () => {
    const restore = stubMatchMedia(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await render(`<div kjMotion="flip"></div>`, { imports: [KjMotion] });
      await flush();
      const hits = warn.mock.calls.filter((c) => String(c[0]).includes('unknown preset "flip"'));
      expect(hits).toHaveLength(1);
    } finally {
      warn.mockRestore();
      restore();
    }
  });

  it('does not warn for a preset registered through provideKjMotion', async () => {
    const restore = stubMatchMedia(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      TestBed.configureTestingModule({
        providers: [
          ...provideKjMotion({ animations: [...KJ_MOTION_DEFAULTS.animations, 'flip'] }),
        ],
      });
      const { container } = await render(`<div kjMotion="flip"></div>`, { imports: [KjMotion] });
      await flush();
      expect(container.querySelector('[kjMotion]')).toHaveAttribute('data-kj-motion', 'flip');
      expect(
        warn.mock.calls.filter((c) => String(c[0]).includes('unknown preset')),
      ).toHaveLength(0);
    } finally {
      warn.mockRestore();
      restore();
    }
  });

  it('every shipped preset name is registered by default', () => {
    expect(KJ_MOTION_DEFAULTS.animations).toContain('fade');
    expect(KJ_MOTION_DEFAULTS.animations).toContain('scale-spring');
    expect(KJ_MOTION_DEFAULTS.animations).toContain('slide-up-fade');
  });
});
