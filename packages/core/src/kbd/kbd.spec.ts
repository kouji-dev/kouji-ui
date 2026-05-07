import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KJ_SIZE_PRESET } from '../presets';
import { KJ_KBD_SIZE_PRESET, KjKbd } from './kbd';

/**
 * Flush microtasks + the rAF that backs `afterNextRender` so the directive's
 * dev-mode host inspection has a chance to run.
 */
async function flushAfterNextRender(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

@Component({
  standalone: true,
  imports: [KjKbd],
  template: `<kbd kjKbd [kjSize]="size">{{ label }}</kbd>`,
})
class HostComponent {
  size: string | undefined = undefined;
  label = 'Enter';
}

describe('KjKbd', () => {
  afterEach(() => vi.restoreAllMocks());

  describe('size composition (KjSize via hostDirectives)', () => {
    it('reflects default kjSize as data-size="md" on the host', async () => {
      const { container } = await render(`<kbd kjKbd>Enter</kbd>`, { imports: [KjKbd] });
      await flushAfterNextRender();
      // Built-in KJ_SIZE_PRESET factory default is 'md'.
      expect(container.querySelector('kbd')).toHaveAttribute('data-size', 'md');
    });

    it('reflects kjSize input as data-size on the host', async () => {
      const { container } = await render(`<kbd kjKbd [kjSize]="'lg'">Enter</kbd>`, {
        imports: [KjKbd],
        providers: [
          {
            provide: KJ_SIZE_PRESET,
            useValue: { values: ['xs', 'sm', 'md', 'lg'], default: 'md' },
          },
        ],
      });
      await flushAfterNextRender();
      expect(container.querySelector('kbd')).toHaveAttribute('data-size', 'lg');
    });

    it('honours the KJ_KBD_SIZE_PRESET re-export (xs / sm / md / lg, default md)', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: KJ_SIZE_PRESET, useValue: KJ_KBD_SIZE_PRESET }],
      });
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.size = 'xs';
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kbd');
      expect(host.getAttribute('data-size')).toBe('xs');
    });

    it('warns in dev mode when kjSize is outside the preset (size validation flows through)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      TestBed.configureTestingModule({
        providers: [{ provide: KJ_SIZE_PRESET, useValue: KJ_KBD_SIZE_PRESET }],
      });
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.size = 'huge';
      fixture.detectChanges();
      // `KjSize` warns synchronously via `effect`; element-tag warning is
      // deferred to `afterNextRender`. Either way both have already fired by
      // here; we just need *some* call matching the size message.
      const matched = warn.mock.calls.some((c) => /unknown size/i.test(String(c[0])));
      expect(matched).toBe(true);
    });
  });

  describe('host element discipline (dev-mode warning)', () => {
    it('does not warn when host is <kbd>', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<kbd kjKbd>Enter</kbd>`, { imports: [KjKbd] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) =>
        /applied to <\w+>/i.test(String(c[0])),
      );
      expect(matched).toBe(false);
    });

    it('warns when host is not <kbd> (e.g. <span>)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<span kjKbd>Enter</span>`, { imports: [KjKbd] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) => {
        const msg = String(c[0]);
        return /kjKbd applied to <span>/i.test(msg) && /<kbd>/i.test(msg);
      });
      expect(matched).toBe(true);
    });
  });

  describe('focusable-descendant discipline (dev-mode warning)', () => {
    it('warns when a focusable descendant exists', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<kbd kjKbd><button>?</button></kbd>`, { imports: [KjKbd] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) =>
        /focusable descendant/i.test(String(c[0])),
      );
      expect(matched).toBe(true);
    });

    it('does not warn for plain text content', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<kbd kjKbd>Enter</kbd>`, { imports: [KjKbd] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) =>
        /focusable descendant/i.test(String(c[0])),
      );
      expect(matched).toBe(false);
    });

    it('does not warn for non-focusable element children', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<kbd kjKbd><span>Enter</span></kbd>`, { imports: [KjKbd] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) =>
        /focusable descendant/i.test(String(c[0])),
      );
      expect(matched).toBe(false);
    });
  });
});
