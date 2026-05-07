import { Component, signal } from '@angular/core';
import { fireEvent, render } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';
import { KjPagination } from './pagination';
import { KjPaginationItem } from './pagination-item';
import { KjPaginationPrevious } from './pagination-previous';
import { KjPaginationNext } from './pagination-next';
import { KjPaginationFirst } from './pagination-first';
import { KjPaginationLast } from './pagination-last';
import { KjPaginationEllipsis } from './pagination-ellipsis';
import { KjPaginationInfo } from './pagination-info';
import { computePageTokens } from './page-tokens';

const imports = [
  KjPagination,
  KjPaginationItem,
  KjPaginationPrevious,
  KjPaginationNext,
  KjPaginationFirst,
  KjPaginationLast,
  KjPaginationEllipsis,
  KjPaginationInfo,
];

@Component({
  standalone: true,
  imports,
  template: `
    <nav kjPagination [(kjPage)]="page" [kjTotalPages]="totalPages()" #p="kjPagination">
      <button kjPaginationFirst>«</button>
      <button kjPaginationPrevious>‹</button>
      @for (token of p.pages(); track token) {
        @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
          <span kjPaginationEllipsis>…</span>
        } @else {
          <button kjPaginationItem [kjPage]="token">{{ token }}</button>
        }
      }
      <button kjPaginationNext>›</button>
      <button kjPaginationLast>»</button>
      <span kjPaginationInfo></span>
    </nav>
  `,
})
class PaginationHost {
  readonly page = signal(1);
  readonly totalPages = signal(10);
}

@Component({
  standalone: true,
  imports,
  template: `
    <nav kjPagination [(kjPage)]="page" [kjTotalPages]="totalPages()" #p="kjPagination">
      @for (token of p.pages(); track token) {
        @if (token !== 'ellipsis-left' && token !== 'ellipsis-right') {
          <button kjPaginationItem [kjPage]="token">{{ token }}</button>
        }
      }
    </nav>
  `,
})
class SmallPaginationHost {
  readonly page = signal(1);
  readonly totalPages = signal(3);
}

describe('computePageTokens (algorithm)', () => {
  describe('edge cases', () => {
    it('returns [] when total <= 0', () => {
      expect(computePageTokens(1, 0, 1, 1)).toEqual([]);
      expect(computePageTokens(1, -5, 1, 1)).toEqual([]);
    });

    it('renders all pages with no ellipses when total fits in the window', () => {
      // boundary*2 + siblings*2 + 3 = 1*2 + 1*2 + 3 = 7 — total <= 7 fits.
      expect(computePageTokens(1, 1, 1, 1)).toEqual([1]);
      expect(computePageTokens(2, 5, 1, 1)).toEqual([1, 2, 3, 4, 5]);
      expect(computePageTokens(4, 7, 1, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe('large datasets — current near start', () => {
    it('total=10, current=1: only right ellipsis (sibling window collapses to filler)', () => {
      // With current=1 and siblings=1, the sibling window would span [0,2]
      // but is clamped at the boundary anchor (page 1) — only `2` is added
      // by the !showLeftEllipsis filler branch. The right ellipsis bridges
      // to the right boundary.
      expect(computePageTokens(1, 10, 1, 1)).toEqual([1, 2, 'ellipsis-right', 10]);
    });

    it('total=10, current=2: only right ellipsis', () => {
      expect(computePageTokens(2, 10, 1, 1)).toEqual([1, 2, 3, 'ellipsis-right', 10]);
    });

    it('total=10, current=3: only right ellipsis', () => {
      expect(computePageTokens(3, 10, 1, 1)).toEqual([1, 2, 3, 4, 'ellipsis-right', 10]);
    });
  });

  describe('large datasets — current near end', () => {
    it('total=10, current=10: only left ellipsis (sibling window clamps at boundary)', () => {
      // Mirror of the current=1 case — the sibling window is clamped at
      // the right boundary anchor, leaving the !showRightEllipsis filler
      // branch to push `9` and the left ellipsis to bridge.
      expect(computePageTokens(10, 10, 1, 1)).toEqual([1, 'ellipsis-left', 9, 10]);
    });

    it('total=10, current=9: only left ellipsis', () => {
      expect(computePageTokens(9, 10, 1, 1)).toEqual([1, 'ellipsis-left', 8, 9, 10]);
    });

    it('total=10, current=8: only left ellipsis', () => {
      expect(computePageTokens(8, 10, 1, 1)).toEqual([1, 'ellipsis-left', 7, 8, 9, 10]);
    });
  });

  describe('large datasets — current in the middle', () => {
    it('total=10, current=5: both ellipses', () => {
      expect(computePageTokens(5, 10, 1, 1)).toEqual([
        1,
        'ellipsis-left',
        4,
        5,
        6,
        'ellipsis-right',
        10,
      ]);
    });

    it('total=20, current=10, siblings=2, boundary=2: both ellipses', () => {
      expect(computePageTokens(10, 20, 2, 2)).toEqual([
        1,
        2,
        'ellipsis-left',
        8,
        9,
        10,
        11,
        12,
        'ellipsis-right',
        19,
        20,
      ]);
    });
  });

  describe('off-by-one sweep across totals 7–11', () => {
    it.each([7, 8, 9, 10, 11])(
      'total=%i: every current 1..total produces a stable, well-formed token list',
      (total) => {
        for (let current = 1; current <= total; current++) {
          const tokens = computePageTokens(current, total, 1, 1);
          // Always starts with 1 when boundary>=1.
          expect(tokens[0]).toBe(1);
          // Always ends with total when boundary>=1.
          expect(tokens[tokens.length - 1]).toBe(total);
          // The current page number always appears as a numeric token.
          expect(tokens.includes(current)).toBe(true);
          // Numeric tokens are strictly ascending.
          const numerics = tokens.filter((t): t is number => typeof t === 'number');
          for (let i = 1; i < numerics.length; i++) {
            expect(numerics[i]).toBeGreaterThan(numerics[i - 1]);
          }
        }
      },
    );
  });

  describe('degenerate inputs', () => {
    it('siblings=0, boundary=0, total=10, current=5: collapses to current only', () => {
      // No boundary anchors, no sibling neighbors — just the current with
      // ellipses bridging on each side.
      const tokens = computePageTokens(5, 10, 0, 0);
      expect(tokens).toContain(5);
      // No `1` or `10` because boundary=0.
      expect(tokens.includes(1)).toBe(false);
      expect(tokens.includes(10)).toBe(false);
    });
  });
});

describe('KjPagination — directive integration', () => {
  describe('host wiring', () => {
    it('hosts <nav> with aria-label="Pagination" by default', async () => {
      const { container } = await render(PaginationHost);
      const nav = container.querySelector('[kjPagination]')!;
      expect(nav.tagName).toBe('NAV');
      expect(nav).toHaveAttribute('aria-label', 'Pagination');
    });

    it('reflects current page and total via data attributes', async () => {
      const { container } = await render(PaginationHost);
      const nav = container.querySelector('[kjPagination]')!;
      expect(nav).toHaveAttribute('data-page', '1');
      expect(nav).toHaveAttribute('data-total-pages', '10');
    });
  });

  describe('aria-current on the active item', () => {
    it('marks the current page item with aria-current="page" and data-current="true"', async () => {
      const { container, fixture } = await render(PaginationHost);
      // Initial page = 1.
      const items = container.querySelectorAll<HTMLElement>('[kjPaginationItem]');
      const first = Array.from(items).find((b) => b.textContent?.trim() === '1')!;
      expect(first).toHaveAttribute('aria-current', 'page');
      expect(first).toHaveAttribute('data-current', 'true');

      // Move to page 3. With totalPages=10, siblings=1, boundary=1, current=3
      // the window is [1, 2, 3, 4, 'ellipsis-right', 10] — page 3 is rendered.
      (fixture.componentInstance as PaginationHost).page.set(3);
      fixture.detectChanges();
      const updated = container.querySelectorAll<HTMLElement>('[kjPaginationItem]');
      const three = Array.from(updated).find((b) => b.textContent?.trim() === '3')!;
      expect(three).toHaveAttribute('aria-current', 'page');
      expect(three).toHaveAttribute('data-current', 'true');
      // The previously-current item is no longer aria-current.
      const one = Array.from(updated).find((b) => b.textContent?.trim() === '1')!;
      expect(one).not.toHaveAttribute('aria-current');
      expect(one).toHaveAttribute('data-current', 'false');
    });

    it('stamps a configured aria-label on each item', async () => {
      const { container } = await render(PaginationHost);
      const items = container.querySelectorAll<HTMLElement>('[kjPaginationItem]');
      const first = Array.from(items).find((b) => b.textContent?.trim() === '1')!;
      expect(first).toHaveAttribute('aria-label', 'Page 1');
    });
  });

  describe('boundary controls — disabled state at edges, focus-preserving', () => {
    it('Previous and First are aria-disabled on page 1, but stay focusable (tabindex="0")', async () => {
      const { container } = await render(PaginationHost);
      const prev = container.querySelector<HTMLElement>('[kjPaginationPrevious]')!;
      const first = container.querySelector<HTMLElement>('[kjPaginationFirst]')!;
      expect(prev).toHaveAttribute('aria-disabled', 'true');
      expect(prev).toHaveAttribute('tabindex', '0');
      expect(first).toHaveAttribute('aria-disabled', 'true');
      expect(first).toHaveAttribute('tabindex', '0');
      // Native disabled is NOT used.
      expect(prev).not.toHaveAttribute('disabled');
      expect(first).not.toHaveAttribute('disabled');
    });

    it('Next and Last are aria-disabled on the last page, but stay focusable', async () => {
      const { fixture, container } = await render(PaginationHost);
      (fixture.componentInstance as PaginationHost).page.set(10);
      fixture.detectChanges();
      const next = container.querySelector<HTMLElement>('[kjPaginationNext]')!;
      const last = container.querySelector<HTMLElement>('[kjPaginationLast]')!;
      expect(next).toHaveAttribute('aria-disabled', 'true');
      expect(next).toHaveAttribute('tabindex', '0');
      expect(last).toHaveAttribute('aria-disabled', 'true');
      expect(last).toHaveAttribute('tabindex', '0');
    });

    it('Previous click is suppressed at the first-page boundary (capture-phase)', async () => {
      const { fixture, container } = await render(PaginationHost);
      const host = fixture.componentInstance as PaginationHost;
      const prev = container.querySelector<HTMLElement>('[kjPaginationPrevious]')!;
      fireEvent.click(prev);
      fixture.detectChanges();
      expect(host.page()).toBe(1);
    });

    it('Next click is suppressed at the last-page boundary', async () => {
      const { fixture, container } = await render(PaginationHost);
      const host = fixture.componentInstance as PaginationHost;
      host.page.set(10);
      fixture.detectChanges();
      const next = container.querySelector<HTMLElement>('[kjPaginationNext]')!;
      fireEvent.click(next);
      fixture.detectChanges();
      expect(host.page()).toBe(10);
    });

    it('Next click advances the page when not at the boundary', async () => {
      const { fixture, container } = await render(PaginationHost);
      const host = fixture.componentInstance as PaginationHost;
      host.page.set(3);
      fixture.detectChanges();
      const next = container.querySelector<HTMLElement>('[kjPaginationNext]')!;
      fireEvent.click(next);
      fixture.detectChanges();
      expect(host.page()).toBe(4);
    });

    it('First / Last jump to the corresponding boundary', async () => {
      const { fixture, container } = await render(PaginationHost);
      const host = fixture.componentInstance as PaginationHost;
      host.page.set(5);
      fixture.detectChanges();
      const last = container.querySelector<HTMLElement>('[kjPaginationLast]')!;
      fireEvent.click(last);
      fixture.detectChanges();
      expect(host.page()).toBe(10);
      const first = container.querySelector<HTMLElement>('[kjPaginationFirst]')!;
      fireEvent.click(first);
      fixture.detectChanges();
      expect(host.page()).toBe(1);
    });
  });

  describe('kjPage two-way model', () => {
    it('clicking a page item updates the consumer signal', async () => {
      const { fixture, container } = await render(PaginationHost);
      const host = fixture.componentInstance as PaginationHost;
      const items = container.querySelectorAll<HTMLElement>('[kjPaginationItem]');
      const two = Array.from(items).find((b) => b.textContent?.trim() === '2')!;
      fireEvent.click(two);
      fixture.detectChanges();
      expect(host.page()).toBe(2);
    });

    it('writing the consumer signal flows to the directive (current item updates)', async () => {
      const { fixture, container } = await render(PaginationHost);
      (fixture.componentInstance as PaginationHost).page.set(2);
      fixture.detectChanges();
      const items = container.querySelectorAll<HTMLElement>('[kjPaginationItem]');
      const two = Array.from(items).find((b) => b.textContent?.trim() === '2')!;
      expect(two).toHaveAttribute('aria-current', 'page');
    });

    it('out-of-range writes are clamped and a warning is issued', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = await render(PaginationHost);
      const host = fixture.componentInstance as PaginationHost;
      host.page.set(99);
      fixture.detectChanges();
      // Two ticks — the clamp effect re-runs on the second.
      await Promise.resolve();
      fixture.detectChanges();
      expect(host.page()).toBe(10);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('live-region announcement', () => {
    it('appends a polite, atomic, visually-hidden live region inside the nav', async () => {
      const { container } = await render(PaginationHost);
      // afterNextRender is asynchronous in jsdom — wait a tick.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const nav = container.querySelector('[kjPagination]')!;
      const region = nav.querySelector('[data-kj-pagination-live]') as HTMLElement | null;
      expect(region).toBeTruthy();
      expect(region!).toHaveAttribute('aria-live', 'polite');
      expect(region!).toHaveAttribute('aria-atomic', 'true');
      expect(region!.getAttribute('style') ?? '').toContain('clip:rect(0,0,0,0)');
    });

    it('writes the configured announcement template on page change', async () => {
      const { fixture, container } = await render(PaginationHost);
      const host = fixture.componentInstance as PaginationHost;
      // Wait for the live region to attach.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      host.page.set(4);
      fixture.detectChanges();
      // The directive uses queueMicrotask to clear-then-set; flush it.
      await Promise.resolve();
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
      const region = container.querySelector(
        '[data-kj-pagination-live]',
      ) as HTMLElement;
      expect(region.textContent).toBe('Page 4 of 10');
    });
  });

  describe('small dataset', () => {
    it('renders every page with no ellipses', async () => {
      const { container } = await render(SmallPaginationHost);
      const items = container.querySelectorAll<HTMLElement>('[kjPaginationItem]');
      expect(items).toHaveLength(3);
      const ellipses = container.querySelectorAll('[kjPaginationEllipsis]');
      expect(ellipses).toHaveLength(0);
    });
  });

  describe('info directive', () => {
    it('renders the "Page N of M" string into an empty host', async () => {
      const { container, fixture } = await render(PaginationHost);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      const info = container.querySelector('[kjPaginationInfo]')!;
      expect(info.textContent).toContain('Page 1 of 10');
    });
  });
});

