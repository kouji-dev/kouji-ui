import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { KjProgressBar } from './progress-bar';
import { KjProgressBarFill } from './progress-bar-fill';
import { provideKjProgressBar } from './config';

expect.extend(toHaveNoViolations);

const imports = [KjProgressBar, KjProgressBarFill];

/**
 * Flush microtasks + the rAF that backs `afterNextRender` so the directive
 * has a chance to subscribe to the reduced-motion media query.
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

describe('KjProgressBar', () => {
  describe('determinate mode', () => {
    it('sets aria-valuenow from kjValue', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="42" aria-label="Upload"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('aria-valuenow', '42');
    });

    it('rounds aria-valuenow so sub-integer jitter does not churn the attribute', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="47.4" aria-label="Upload"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('aria-valuenow', '47');
    });

    it('sets role="progressbar" on the host', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="50" aria-label="Upload"></div>`,
        { imports },
      );
      await flush();
      expect(container.querySelector('[kjProgressBar]')).toHaveAttribute(
        'role',
        'progressbar',
      );
    });

    it('omits data-indeterminate when value is a number', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="20" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      expect(
        container.querySelector('[kjProgressBar]'),
      ).not.toHaveAttribute('data-indeterminate');
    });
  });

  describe('indeterminate mode', () => {
    it('omits aria-valuenow when kjValue is null', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="null" aria-label="Loading"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      // APG-correct: indeterminate must NOT carry aria-valuenow at all.
      expect(host.hasAttribute('aria-valuenow')).toBe(false);
    });

    it('omits aria-valuenow by default (kjValue defaults to null)', async () => {
      const { container } = await render(
        `<div kjProgressBar aria-label="Loading"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host.hasAttribute('aria-valuenow')).toBe(false);
    });

    it('reflects data-indeterminate="true" when kjValue is null', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="null" aria-label="Loading"></div>`,
        { imports },
      );
      await flush();
      expect(container.querySelector('[kjProgressBar]')).toHaveAttribute(
        'data-indeterminate',
        'true',
      );
    });

    it('still emits aria-valuemin and aria-valuemax', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="null" aria-label="Loading"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('aria-valuemin', '0');
      expect(host).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('min / max defaults & overrides', () => {
    it('defaults aria-valuemin to 0 and aria-valuemax to 100', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="50" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('aria-valuemin', '0');
      expect(host).toHaveAttribute('aria-valuemax', '100');
    });

    it('reflects custom min / max for absolute units', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjMin]="0" [kjMax]="2500000" [kjValue]="1200000" aria-label="bytes"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('aria-valuemin', '0');
      expect(host).toHaveAttribute('aria-valuemax', '2500000');
      expect(host).toHaveAttribute('aria-valuenow', '1200000');
    });
  });

  describe('clamping out-of-range values', () => {
    it('clamps below kjMin', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { container } = await render(
        `<div kjProgressBar [kjValue]="-20" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('aria-valuenow', '0');
      warn.mockRestore();
    });

    it('clamps above kjMax', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { container } = await render(
        `<div kjProgressBar [kjValue]="150" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('aria-valuenow', '100');
      warn.mockRestore();
    });

    it('clamps within custom min / max', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { container } = await render(
        `<div kjProgressBar [kjMin]="10" [kjMax]="20" [kjValue]="5" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('aria-valuenow', '10');
      warn.mockRestore();
    });
  });

  describe('aria-valuetext', () => {
    it('reflects kjAriaValuetext when set', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="60" kjAriaValuetext="Step 3 of 5" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('aria-valuetext', 'Step 3 of 5');
      // Visual fraction is still 60% even though SR reads the phrasing.
      expect(host).toHaveAttribute('aria-valuenow', '60');
    });

    it('omits aria-valuetext when not set', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="60" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host.hasAttribute('aria-valuetext')).toBe(false);
    });
  });

  describe('variant + size composition (KjVariant / KjSize)', () => {
    it('reflects default data-variant from KJ_PROGRESS_BAR_DEFAULTS (primary)', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="50" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      expect(container.querySelector('[kjProgressBar]')).toHaveAttribute(
        'data-variant',
        'primary',
      );
    });

    it('reflects default data-size from KJ_PROGRESS_BAR_DEFAULTS (md)', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="50" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      expect(container.querySelector('[kjProgressBar]')).toHaveAttribute(
        'data-size',
        'md',
      );
    });

    it('forwards kjVariant via hostDirectives', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="50" [kjVariant]="'success'" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      expect(container.querySelector('[kjProgressBar]')).toHaveAttribute(
        'data-variant',
        'success',
      );
    });

    it('forwards kjSize via hostDirectives', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="50" [kjSize]="'lg'" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      expect(container.querySelector('[kjProgressBar]')).toHaveAttribute(
        'data-size',
        'lg',
      );
    });

    it('provideKjProgressBar at TestBed scope flows into directive defaults', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideKjProgressBar({
            variants: ['primary', 'success', 'warning', 'error', 'brand'],
            defaults: { variant: 'brand', size: 'lg' },
          }),
        ],
      });
      const { container } = await render(
        `<div kjProgressBar [kjValue]="50" aria-label="x"></div>`,
        { imports },
      );
      await flush();
      const host = container.querySelector('[kjProgressBar]')!;
      expect(host).toHaveAttribute('data-variant', 'brand');
      expect(host).toHaveAttribute('data-size', 'lg');
    });
  });

  describe('reduced-motion reflection', () => {
    it('reflects data-reduced-motion="reduce" when matchMedia matches', async () => {
      const original = window.matchMedia;
      const listeners = new Set<(e: MediaQueryListEvent) => void>();
      const mql: Partial<MediaQueryList> = {
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: ((_t: string, cb: EventListener) => {
          listeners.add(cb as (e: MediaQueryListEvent) => void);
        }) as MediaQueryList['addEventListener'],
        removeEventListener: ((_t: string, cb: EventListener) => {
          listeners.delete(cb as (e: MediaQueryListEvent) => void);
        }) as MediaQueryList['removeEventListener'],
      };
      window.matchMedia = (() => mql as MediaQueryList) as typeof window.matchMedia;

      try {
        const { container } = await render(
          `<div kjProgressBar [kjValue]="50" aria-label="x"></div>`,
          { imports },
        );
        await flush();
        expect(container.querySelector('[kjProgressBar]')).toHaveAttribute(
          'data-reduced-motion',
          'reduce',
        );
      } finally {
        window.matchMedia = original;
      }
    });

    it('omits data-reduced-motion when matchMedia does not match', async () => {
      const original = window.matchMedia;
      const mql: Partial<MediaQueryList> = {
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      window.matchMedia = (() => mql as MediaQueryList) as typeof window.matchMedia;

      try {
        const { container } = await render(
          `<div kjProgressBar [kjValue]="50" aria-label="x"></div>`,
          { imports },
        );
        await flush();
        expect(
          container.querySelector('[kjProgressBar]'),
        ).not.toHaveAttribute('data-reduced-motion');
      } finally {
        window.matchMedia = original;
      }
    });
  });

  describe('KjProgressBarFill child', () => {
    it('reflects --kj-progress-fraction from the parent context', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="40" aria-label="x">
           <div kjProgressBarFill data-testid="fill"></div>
         </div>`,
        { imports },
      );
      await flush();
      const fill = container.querySelector('[kjProgressBarFill]') as HTMLElement;
      // 40 / (100 - 0) = 0.4 — the fill mirrors the parent fraction so themes
      // can scaleX(var(--kj-progress-fraction)) on the named inner element.
      expect(fill.style.getPropertyValue('--kj-progress-fraction')).toBe('0.4');
    });

    it('reflects data-indeterminate on the fill when parent is indeterminate', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="null" aria-label="x">
           <div kjProgressBarFill></div>
         </div>`,
        { imports },
      );
      await flush();
      const fill = container.querySelector('[kjProgressBarFill]') as HTMLElement;
      expect(fill).toHaveAttribute('data-indeterminate', 'true');
    });

    it('omits data-indeterminate on the fill in determinate mode', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="50" aria-label="x">
           <div kjProgressBarFill></div>
         </div>`,
        { imports },
      );
      await flush();
      const fill = container.querySelector('[kjProgressBarFill]') as HTMLElement;
      expect(fill).not.toHaveAttribute('data-indeterminate');
    });

    it('updates fraction reactively when the parent value changes', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <div kjProgressBar [kjValue]="value()" aria-label="x">
            <div kjProgressBarFill data-testid="fill"></div>
          </div>
        `,
      })
      class Host {
        readonly value = signal<number | null>(20);
      }
      const { fixture } = await render(Host);
      await flush();
      const fill = fixture.nativeElement.querySelector(
        '[kjProgressBarFill]',
      ) as HTMLElement;
      expect(fill.style.getPropertyValue('--kj-progress-fraction')).toBe('0.2');

      fixture.componentInstance.value.set(80);
      fixture.detectChanges();
      await flush();
      expect(fill.style.getPropertyValue('--kj-progress-fraction')).toBe('0.8');

      fixture.componentInstance.value.set(null);
      fixture.detectChanges();
      await flush();
      expect(fill).toHaveAttribute('data-indeterminate', 'true');
    });
  });

  describe('a11y audits', () => {
    it('determinate progress bar passes axe', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="50" aria-label="Upload progress">
           <div kjProgressBarFill></div>
         </div>`,
        { imports },
      );
      await flush();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('indeterminate progress bar passes axe', async () => {
      const { container } = await render(
        `<div kjProgressBar [kjValue]="null" aria-label="Loading">
           <div kjProgressBarFill></div>
         </div>`,
        { imports },
      );
      await flush();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
