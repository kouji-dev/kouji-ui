import { Component, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { render } from '@testing-library/angular';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { KjTableVirtual } from './table-virtual';
import { KjTableVirtualItem } from './table-virtual-item';

// jsdom does not implement layout or ResizeObserver; virtual-core uses both
// (ResizeObserver for the scroll rect, plus reads `offsetWidth/offsetHeight`
// on the scroll element). Stub them with deterministic values so the
// virtualizer "sees" a 200px tall viewport.
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
  // virtual-core's `observeElementRect` reads `element.offsetWidth` /
  // `element.offsetHeight` (see node_modules/@tanstack/virtual-core/.../index.js
  // `getRect`). jsdom returns 0 for both, so force a 400×200 viewport via
  // prototype getters.
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(): number {
      return 400;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(): number {
      return 200;
    },
  });
});

@Component({
  standalone: true,
  imports: [KjTableVirtual],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      kjTableVirtual
      [kjCount]="count()"
      [kjEstimateSize]="estimate()"
      [kjOverscan]="overscan()"
      style="height: 200px; overflow: auto;"
      #v="kjTableVirtual"
    >
      <div [style.height.px]="v.totalSize()"></div>
    </div>
  `,
})
class Host {
  protected readonly count = signal(100);
  protected readonly estimate = signal(20);
  protected readonly overscan = signal(5);
  readonly virt = viewChild.required(KjTableVirtual);

  setCount(n: number): void {
    this.count.set(n);
  }
}

describe('KjTableVirtual', () => {
  it('mounts the virtualizer and exposes virtualRows() as an array', async () => {
    const { fixture } = await render(Host);
    await fixture.whenStable();
    fixture.detectChanges();
    const virt = fixture.componentInstance.virt();
    expect(Array.isArray(virt.virtualRows())).toBe(true);
  });

  it('windows the rows to roughly viewport / estimateSize + overscan', async () => {
    const { fixture } = await render(Host);
    await fixture.whenStable();
    fixture.detectChanges();
    const virt = fixture.componentInstance.virt();
    const rows = virt.virtualRows();
    // Viewport 200px / 20px row = 10 visible. With 5 overscan above + below
    // we expect ≤ ~20 items, and certainly far fewer than the full 100.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(30);
    expect(rows.length).toBeLessThan(100);
  });

  it('paddingTop starts at 0 and paddingBottom is positive when count > visible window', async () => {
    const { fixture } = await render(Host);
    await fixture.whenStable();
    fixture.detectChanges();
    const virt = fixture.componentInstance.virt();
    expect(virt.paddingTop()).toBe(0);
    expect(virt.paddingBottom()).toBeGreaterThan(0);
  });

  it('totalSize equals count * estimateSize before any measurement', async () => {
    const { fixture } = await render(Host);
    await fixture.whenStable();
    fixture.detectChanges();
    const virt = fixture.componentInstance.virt();
    // 100 rows × 20px = 2000px
    expect(virt.totalSize()).toBe(100 * 20);
  });
});

// ── Rows + measurement ─────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [KjTableVirtual, KjTableVirtualItem],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div style="height: 200px; overflow: auto;">
      <table>
        <tbody kjTableVirtual [kjCount]="count()" [kjEstimateSize]="20" [kjInitialRows]="initial()" #v="kjTableVirtual">
          @for (vr of v.virtualRows(); track vr.key) {
            <tr [kjTableVirtualItem]="vr.index" [kjVirtualOwner]="v" [kjMeasureDeps]="expanded() === vr.index">
              <td>row {{ vr.index }}</td>
            </tr>
            @if (expanded() === vr.index) {
              <tr data-kj-virtual-extra><td>detail</td></tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
class RowsHost {
  readonly count = signal(100);
  readonly initial = signal(20);
  readonly expanded = signal<number | null>(null);
  readonly virt = viewChild.required(KjTableVirtual);
}

describe('KjTableVirtual — server window', () => {
  it('exposes the first kjInitialRows rows at the estimate while the virtualizer has not mounted', async () => {
    // afterNextRender is a no-op under Angular's server flag — the state a
    // prerender (and the first client paint) sees.
    (globalThis as { ngServerMode?: boolean }).ngServerMode = true;
    try {
      const { fixture, container } = await render(RowsHost);
      fixture.detectChanges();
      const virt = fixture.componentInstance.virt();
      expect(virt.mounted()).toBe(false);
      expect(virt.virtualRows().length).toBe(20);
      expect(container.querySelectorAll('tr[data-index]').length).toBe(20);
      expect(virt.totalSize()).toBe(100 * 20);
      expect(virt.paddingTop()).toBe(0);
      expect(virt.paddingBottom()).toBe(80 * 20);
    } finally {
      delete (globalThis as { ngServerMode?: boolean }).ngServerMode;
    }
  });

  it('never exposes more seeded rows than the dataset holds', async () => {
    (globalThis as { ngServerMode?: boolean }).ngServerMode = true;
    try {
      const { fixture } = await render(RowsHost);
      fixture.componentInstance.count.set(5);
      fixture.detectChanges();
      const virt = fixture.componentInstance.virt();
      expect(virt.virtualRows().length).toBe(5);
      expect(virt.paddingBottom()).toBe(0);
    } finally {
      delete (globalThis as { ngServerMode?: boolean }).ngServerMode;
    }
  });
});

describe('KjTableVirtual — measurement', () => {
  it('mounts on the client and replaces the seeded window with the measured one', async () => {
    const { fixture } = await render(RowsHost);
    await fixture.whenStable();
    fixture.detectChanges();
    const virt = fixture.componentInstance.virt();
    expect(virt.mounted()).toBe(true);
    // Rendered rows are measured: the stubbed offsetHeight is 200px, so every
    // row in the window is 200px, not the 20px estimate.
    const first = virt.virtualRows()[0]!;
    expect(first.size).toBe(200);
    expect(virt.totalSize()).toBeGreaterThan(100 * 20);
  });

  it('folds a data-kj-virtual-extra sibling (the expansion row) into its row height', async () => {
    const { fixture } = await render(RowsHost);
    await fixture.whenStable();
    fixture.detectChanges();
    const virt = fixture.componentInstance.virt();
    const before = virt.virtualRows()[0]!.size;
    fixture.componentInstance.expanded.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(virt.virtualRows()[0]!.size).toBe(before + 200);
    fixture.componentInstance.expanded.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(virt.virtualRows()[0]!.size).toBe(before);
  });

  it('stamps data-index on measured rows', async () => {
    const { fixture, container } = await render(RowsHost);
    await fixture.whenStable();
    fixture.detectChanges();
    const rows = Array.from(container.querySelectorAll<HTMLElement>('tr[data-index]'));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].getAttribute('data-index')).toBe('0');
  });
});
