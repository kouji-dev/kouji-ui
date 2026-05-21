import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';
import { KjChart } from './chart';

expect.extend(toHaveNoViolations);

describe('KjChart', () => {
  it('renders the host element', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"></div>`,
      { imports: [KjChart] },
    );
    expect(container.querySelector('[kjChart]')).toBeInTheDocument();
  });

  it('sets role=img', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"></div>`,
      { imports: [KjChart] },
    );
    expect(container.querySelector('[kjChart]')).toHaveAttribute('role', 'img');
  });

  it('sets aria-label', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Revenue chart"></div>`,
      { imports: [KjChart] },
    );
    expect(container.querySelector('[kjChart]')).toHaveAttribute('aria-label', 'Revenue chart');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Revenue chart"></div>`,
      { imports: [KjChart] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('calls chart.resize() when ResizeObserver fires', async () => {
    let roCb: (() => void) | undefined;
    const OriginalRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) { roCb = () => cb([], this as unknown as ResizeObserver); }
      observe() {} unobserve() {} disconnect() {}
    } as unknown as typeof ResizeObserver;

    const resizeSpy = vi.fn();
    vi.doMock('echarts', () => ({
      init: () => ({
        setOption: vi.fn(),
        resize: resizeSpy,
        on: vi.fn(),
        dispose: vi.fn(),
        showLoading: vi.fn(),
        hideLoading: vi.fn(),
        getOption: vi.fn(),
        dispatchAction: vi.fn(),
      }),
    }));

    const { KjChart: Fresh } = await import('./chart');
    await render(`<div kjChart [kjChartOption]="{}" kjChartLabel="x"></div>`, { imports: [Fresh] });
    await new Promise(r => setTimeout(r, 0));

    roCb?.();
    await new Promise(r => requestAnimationFrame(() => r(null)));

    expect(resizeSpy).toHaveBeenCalledTimes(1);

    globalThis.ResizeObserver = OriginalRO;
    vi.doUnmock('echarts');
  });
});
