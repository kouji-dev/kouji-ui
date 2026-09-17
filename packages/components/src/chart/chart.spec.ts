import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EChartsOption } from 'echarts';
import { provideECharts } from '@kouji-ui/core';
import { KjChartComponent } from './chart';

// Stub echarts: jsdom has no real canvas backend, so `init` returns a fake
// instance whose methods we can assert on. `vi.hoisted` lets the mock factory
// (hoisted above imports) share these spies with the test body.
const ec = vi.hoisted(() => {
  const setOption = vi.fn();
  const dispose = vi.fn();
  const resize = vi.fn();
  const init = vi.fn((_dom: HTMLElement, _theme?: string | object | null) => ({
    setOption,
    dispose,
    resize,
  }));
  return { setOption, dispose, resize, init };
});
vi.mock('echarts', () => ({ init: ec.init }));

// jsdom has no ResizeObserver; the chart observes its host through the shared
// `KjResizeObserver` (perf F-5), so this stub is what that service constructs.
// Each instance records its targets and exposes `fire()` to deliver entries the
// way a browser would.
let resizeObservers: StubResizeObserver[] = [];
class StubResizeObserver {
  readonly targets = new Set<Element>();
  constructor(private readonly cb: (entries: { target: Element }[]) => void) {
    resizeObservers.push(this);
  }
  observe(el: Element): void {
    this.targets.add(el);
  }
  unobserve(el: Element): void {
    this.targets.delete(el);
  }
  disconnect(): void {
    this.targets.clear();
    resizeObservers = resizeObservers.filter((o) => o !== this);
  }
  fire(...targets: Element[]): void {
    this.cb(targets.map((target) => ({ target })));
  }
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
  template: `<kj-chart
    [option]="option()"
    [height]="height"
    [ariaLabel]="label"
    [caption]="caption"
    [theme]="theme()"
  />`,
})
class HostComponent {
  readonly option = signal<EChartsOption | undefined>(barOption);
  readonly theme = signal<string | undefined>(undefined);
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
    ec.resize.mockClear();
    resizeObservers = [];
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

  it('boots from a provideECharts loader instead of importing the full build', async () => {
    // lazy F-3: registering a tree-shaken build and then reaching for the styled
    // <kj-chart> used to ship both it and a lazy chunk with the full module.
    const init = vi.fn(() => ({ setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn() }));
    const loader = vi.fn(() => ({ init }));
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideECharts(loader as never)],
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(1);
    // The fallback `import('echarts')` must not have run.
    expect(ec.init).not.toHaveBeenCalled();
  });

  it('rides the shared KjResizeObserver and coalesces a burst into one resize', async () => {
    // perf F-5 / F-19: `ECharts.resize()` is a full relayout + redraw, and
    // dragging a window edge delivers entries every frame. The component no
    // longer builds its own observer — a dashboard of twenty charts shares the
    // one the root service owns.
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();

    expect(resizeObservers).toHaveLength(1);
    const host = fixture.nativeElement.querySelector('kj-chart') as HTMLElement;
    expect(resizeObservers[0]!.targets.has(host)).toBe(true);

    // Spy only now: Angular's own scheduler also uses rAF during startup.
    const frames: FrameRequestCallback[] = [];
    const raf = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        frames.push(cb);
        return frames.length;
      });

    resizeObservers[0]!.fire(host);
    resizeObservers[0]!.fire(host);
    resizeObservers[0]!.fire(host);
    expect(ec.resize).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);

    frames[0]!(0);
    expect(ec.resize).toHaveBeenCalledTimes(1);

    raf.mockRestore();
  });

  it('replaces the instance when the theme changes', async () => {
    // ECharts takes the theme at init, so the input was silently non-reactive.
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.theme.set('dark');
    fixture.detectChanges();
    await flush();
    expect(ec.init).toHaveBeenCalledTimes(1);
    expect(ec.init.mock.calls[0]?.[1]).toBe('dark');

    fixture.componentInstance.theme.set('light');
    fixture.detectChanges();
    await flush();
    expect(ec.dispose).toHaveBeenCalledTimes(1);
    expect(ec.init).toHaveBeenCalledTimes(2);
    expect(ec.init.mock.calls[1]?.[1]).toBe('light');
  });

  it('disposes the instance on destroy', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.destroy();
    expect(ec.dispose).toHaveBeenCalledTimes(1);
  });
});
