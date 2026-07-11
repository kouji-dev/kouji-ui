import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EChartsOption } from 'echarts';
import { KjChartComponent } from './chart';

// Stub echarts: jsdom has no real canvas backend, so `init` returns a fake
// instance whose methods we can assert on. `vi.hoisted` lets the mock factory
// (hoisted above imports) share these spies with the test body.
const ec = vi.hoisted(() => {
  const setOption = vi.fn();
  const dispose = vi.fn();
  const resize = vi.fn();
  const init = vi.fn(() => ({ setOption, dispose, resize }));
  return { setOption, dispose, resize, init };
});
vi.mock('echarts', () => ({ init: ec.init }));

// jsdom has no ResizeObserver; the chart observes its host on init.
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/**
 * Flush microtasks + the timer backing `afterNextRender`, plus the dynamic
 * `import('echarts')` promise, so lazy init completes before assertions.
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

const barOption: EChartsOption = {
  xAxis: { type: 'category', data: ['A', 'B'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [1, 2] }],
};

@Component({
  standalone: true,
  imports: [KjChartComponent],
  template: `<kj-chart [option]="option()" [height]="height" [ariaLabel]="label" [caption]="caption" />`,
})
class HostComponent {
  readonly option = signal<EChartsOption | undefined>(barOption);
  height: string | number = 320;
  label = 'Revenue by month';
  caption = '';
}

describe('KjChartComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
  });

  beforeEach(() => {
    ec.init.mockClear();
    ec.setOption.mockClear();
    ec.dispose.mockClear();
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-chart')).not.toBeNull();
  });

  it('applies the height (number → px) to the host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-chart') as HTMLElement;
    expect(host.style.height).toBe('320px');
  });

  it('exposes role="img" and the aria-label for screen readers', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-chart') as HTMLElement;
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Revenue by month');
    // No caption → no describedby wiring, no sr-only span.
    expect(host.hasAttribute('aria-describedby')).toBe(false);
    expect(host.querySelector('.kj-chart__caption')).toBeNull();
  });

  it('renders a visually-hidden caption wired via aria-describedby', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.caption = 'Trending up 12% quarter over quarter.';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-chart') as HTMLElement;
    const span = host.querySelector('.kj-chart__caption') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span.textContent).toContain('Trending up 12%');
    expect(host.getAttribute('aria-describedby')).toBe(span.id);
  });

  it('lazily inits echarts and pushes the option', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    expect(ec.init).toHaveBeenCalledTimes(1);
    expect(ec.setOption).toHaveBeenCalledWith(barOption, { notMerge: true });
  });

  it('pushes option updates to the live instance via setOption', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    ec.setOption.mockClear();

    const next: EChartsOption = { series: [{ type: 'pie', data: [{ value: 5, name: 'X' }] }] };
    fixture.componentInstance.option.set(next);
    fixture.detectChanges();
    expect(ec.setOption).toHaveBeenCalledWith(next, { notMerge: true });
  });

  it('disposes the instance on destroy', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.destroy();
    expect(ec.dispose).toHaveBeenCalledTimes(1);
  });
});
