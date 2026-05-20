import { Component, signal, viewChild } from '@angular/core';
import { render } from '@testing-library/angular';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { KjTableVirtual } from './table-virtual';

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
    get(): number { return 400; },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(): number { return 200; },
  });
});

@Component({
  standalone: true,
  imports: [KjTableVirtual],
  template: `
    <div
      KjTableVirtual
      [kjCount]="count()"
      [kjEstimateSize]="estimate()"
      [kjOverscan]="overscan()"
      style="height: 200px; overflow: auto;"
      #v="KjTableVirtual"
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

  setCount(n: number): void { this.count.set(n); }
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
