import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';
import { KjChart } from './chart';
import { KjChartTableFallback } from './chart-table-fallback';

expect.extend(toHaveNoViolations);

/** A minimal ECharts instance double for the mocked module. */
function makeChartDouble(overrides: Record<string, unknown> = {}) {
  return {
    setOption: vi.fn(),
    resize: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    dispose: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    getOption: vi.fn(),
    dispatchAction: vi.fn(),
    ...overrides,
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

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
      private targets: Element[] = [];
      constructor(cb: ResizeObserverCallback) {
        // The shared observer dispatches per ENTRY, so the double has to
        // deliver one per observed element, the way a browser does.
        roCb = () =>
          cb(
            this.targets.map((target) => ({ target })) as unknown as ResizeObserverEntry[],
            this as unknown as ResizeObserver,
          );
      }
      observe(el: Element) { this.targets.push(el); }
      unobserve(el: Element) { this.targets = this.targets.filter((t) => t !== el); }
      disconnect() { this.targets = []; }
    } as unknown as typeof ResizeObserver;

    const resizeSpy = vi.fn();
    vi.doMock('echarts', () => ({ init: () => makeChartDouble({ resize: resizeSpy }) }));

    const { KjChart: Fresh } = await import('./chart');
    await render(`<div kjChart [kjChartOption]="{}" kjChartLabel="x"></div>`, { imports: [Fresh] });
    await flush();

    roCb?.();
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    expect(resizeSpy).toHaveBeenCalledTimes(1);

    globalThis.ResizeObserver = OriginalRO;
    vi.doUnmock('echarts');
  });

  it('shares ONE ResizeObserver and ONE theme MutationObserver across charts', async () => {
    let observers = 0;
    let observed = () => 0;
    const OriginalRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      private targets: Element[] = [];
      constructor(_cb: ResizeObserverCallback) {
        observers++;
        observed = () => this.targets.length;
      }
      observe(el: Element) { this.targets.push(el); }
      unobserve(el: Element) { this.targets = this.targets.filter((t) => t !== el); }
      disconnect() { this.targets = []; }
    } as unknown as typeof ResizeObserver;

    const RealMO = globalThis.MutationObserver;
    let themeObservations = 0;
    globalThis.MutationObserver = class extends RealMO {
      // Count only theme observations on <html>: other services legitimately
      // observe other things.
      override observe(target: Node, init?: MutationObserverInit) {
        if (target === document.documentElement && init?.attributeFilter?.includes('data-theme')) {
          themeObservations++;
        }
        super.observe(target, init);
      }
    };

    vi.doMock('echarts', () => ({ init: () => makeChartDouble() }));

    const { KjChart: Fresh } = await import('./chart');
    await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="a"></div>
       <div kjChart [kjChartOption]="{}" kjChartLabel="b"></div>
       <div kjChart [kjChartOption]="{}" kjChartLabel="c"></div>`,
      { imports: [Fresh] },
    );
    await flush();

    // Three charts used to mean three ResizeObservers and three
    // MutationObservers on <html>; now they ride the shared root services.
    // (The per-element fan-out itself is pinned in
    // primitives/interaction/resize-observer.spec.ts.)
    expect(observers).toBe(1);
    expect(themeObservations).toBe(1);
    // Every chart host still rides the one observer.
    expect(observed()).toBe(3);

    globalThis.ResizeObserver = OriginalRO;
    globalThis.MutationObserver = RealMO;
    vi.doUnmock('echarts');
  });

  it('disables animation when prefers-reduced-motion: reduce matches', async () => {
    const setOptionSpy = vi.fn();
    vi.doMock('echarts', () => ({ init: () => makeChartDouble({ setOption: setOptionSpy }) }));

    const originalMM = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('reduce'),
      media: q, onchange: null, addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    const { KjChart: Fresh } = await import('./chart');
    await render(
      `<div kjChart [kjChartOption]="{ animation: true }" kjChartLabel="x"></div>`,
      { imports: [Fresh] },
    );
    await flush();

    const arg = setOptionSpy.mock.calls[0]?.[0];
    expect(arg).toBeDefined();
    expect(arg.animation).toBe(false);
    expect(arg.animationDuration).toBe(0);

    window.matchMedia = originalMM;
    vi.doUnmock('echarts');
  });

  it('re-applies setOption with refreshed palette when <html> attributes change', async () => {
    // Capture the MutationObserver callback the directive installs (jsdom's MO
    // delivery is unreliable, so we drive it directly — same pattern as the
    // ResizeObserver test above).
    let moCb: (() => void) | undefined;
    const OriginalMO = globalThis.MutationObserver;
    globalThis.MutationObserver = class {
      private readonly cb: MutationCallback;
      constructor(cb: MutationCallback) { this.cb = cb; }
      observe(target: Node) {
        // Only the directive observes <html>; ignore any Angular-internal MOs.
        if (target === document.documentElement) {
          moCb = () => this.cb([], this as unknown as MutationObserver);
        }
      }
      disconnect() {}
      takeRecords() { return []; }
    } as unknown as typeof MutationObserver;

    const setOptionSpy = vi.fn();
    vi.doMock('echarts', () => ({ init: () => makeChartDouble({ setOption: setOptionSpy }) }));

    const { KjChart: Fresh } = await import('./chart');
    await render(`<div kjChart [kjChartOption]="{}" kjChartLabel="x"></div>`, { imports: [Fresh] });
    await flush();

    const callsBefore = setOptionSpy.mock.calls.length;
    moCb?.();
    expect(setOptionSpy.mock.calls.length).toBeGreaterThan(callsBefore);

    globalThis.MutationObserver = OriginalMO;
    vi.doUnmock('echarts');
  });

  it('does not re-apply the option on an unrelated change-detection cycle', async () => {
    // perf F-1: the option used to be pushed from `afterEveryRender`, which runs
    // after EVERY application tick — a keystroke in an unrelated input re-ran
    // `getComputedStyle` plus ECharts' full option merge for every chart.
    const setOptionSpy = vi.fn();
    vi.doMock('echarts', () => ({ init: () => makeChartDouble({ setOption: setOptionSpy }) }));

    // A sibling binding that has nothing to do with the chart: changing it is
    // what makes the tick a real change-detection cycle.
    const unrelated = signal(0);
    const { KjChart: Fresh } = await import('./chart');
    await render(
      `<span>{{ unrelated() }}</span><div kjChart [kjChartOption]="{}" kjChartLabel="x"></div>`,
      { imports: [Fresh], componentProperties: { unrelated } },
    );
    await flush();

    const appRef = TestBed.inject(ApplicationRef);
    appRef.tick();
    const applied = setOptionSpy.mock.calls.length;
    expect(applied).toBeGreaterThan(0);

    unrelated.set(1);
    appRef.tick();
    unrelated.set(2);
    appRef.tick();
    expect(setOptionSpy.mock.calls.length).toBe(applied);

    vi.doUnmock('echarts');
  });

  it('re-applies the option when [kjChartOption] changes', async () => {
    const setOptionSpy = vi.fn();
    vi.doMock('echarts', () => ({ init: () => makeChartDouble({ setOption: setOptionSpy }) }));

    const { KjChart: Fresh } = await import('./chart');
    const { rerender } = await render(
      `<div kjChart [kjChartOption]="option" kjChartLabel="x"></div>`,
      { imports: [Fresh], componentProperties: { option: { animationDuration: 10 } } },
    );
    await flush();
    setOptionSpy.mockClear();

    await rerender({ componentProperties: { option: { animationDuration: 20 } } });
    await flush();
    expect(setOptionSpy).toHaveBeenCalled();
    expect(setOptionSpy.mock.calls.at(-1)?.[0].animationDuration).toBe(20);

    vi.doUnmock('echarts');
  });

  it('calls showLoading/hideLoading when [kjChartLoading] toggles', async () => {
    const show = vi.fn(), hide = vi.fn();
    vi.doMock('echarts', () => ({ init: () => makeChartDouble({ showLoading: show, hideLoading: hide }) }));

    const { KjChart: Fresh } = await import('./chart');
    const { rerender } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="x" [kjChartLoading]="loading"></div>`,
      { imports: [Fresh], componentProperties: { loading: false } },
    );
    await flush();

    await rerender({ componentProperties: { loading: true } });
    await flush();
    expect(show).toHaveBeenCalled();

    await rerender({ componentProperties: { loading: false } });
    await flush();
    expect(hide).toHaveBeenCalled();

    vi.doUnmock('echarts');
  });

  it('emits kjChartReady with the ECharts instance', async () => {
    const instance = makeChartDouble();
    vi.doMock('echarts', () => ({ init: () => instance }));

    const ready = vi.fn();
    const { KjChart: Fresh } = await import('./chart');
    await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="x" (kjChartReady)="onReady($event)"></div>`,
      { imports: [Fresh], componentProperties: { onReady: ready } },
    );
    await flush();
    expect(ready).toHaveBeenCalledWith(instance);
    vi.doUnmock('echarts');
  });

  it('emits (kjChartClick) when the ECharts "click" handler fires', async () => {
    let clickHandler: ((e: unknown) => void) | undefined;
    vi.doMock('echarts', () => ({
      init: () => makeChartDouble({
        on: (evt: string, cb: (e: unknown) => void) => { if (evt === 'click') clickHandler = cb; },
      }),
    }));

    const click = vi.fn();
    const { KjChart: Fresh } = await import('./chart');
    await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="x" (kjChartClick)="onClick($event)"></div>`,
      { imports: [Fresh], componentProperties: { onClick: click } },
    );
    await flush();
    clickHandler?.({ value: 42 });
    expect(click).toHaveBeenCalledWith({ value: 42 });
    vi.doUnmock('echarts');
  });

  it('emits (kjChartLegendSelect) when ECharts "legendselectchanged" handler fires', async () => {
    let legendHandler: ((e: unknown) => void) | undefined;
    vi.doMock('echarts', () => ({
      init: () => makeChartDouble({
        on: (evt: string, cb: (e: unknown) => void) => { if (evt === 'legendselectchanged') legendHandler = cb; },
      }),
    }));

    const legend = vi.fn();
    const { KjChart: Fresh } = await import('./chart');
    await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="x" (kjChartLegendSelect)="onLegend($event)"></div>`,
      { imports: [Fresh], componentProperties: { onLegend: legend } },
    );
    await flush();
    legendHandler?.({ name: 'Series A' });
    expect(legend).toHaveBeenCalledWith({ name: 'Series A' });
    vi.doUnmock('echarts');
  });

  it('emits kjChartReady after the first setOption (ready-with-data)', async () => {
    const order: string[] = [];
    const instance = makeChartDouble({ setOption: vi.fn(() => order.push('setOption')) });
    vi.doMock('echarts', () => ({ init: () => instance }));

    const ready = vi.fn(() => order.push('ready'));
    const { KjChart: Fresh } = await import('./chart');
    await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="x" (kjChartReady)="r($event)"></div>`,
      { imports: [Fresh], componentProperties: { r: ready } },
    );
    await flush();
    expect(order.indexOf('setOption')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('ready')).toBeGreaterThan(order.indexOf('setOption'));
    vi.doUnmock('echarts');
  });

  it('forwards kjChartOn events via (kjChartEvent) and rebinds when kjChartOn changes', async () => {
    const handlers: Record<string, (e: unknown) => void> = {};
    const offSpy = vi.fn();
    vi.doMock('echarts', () => ({
      init: () => makeChartDouble({
        on: (evt: string, cb: (e: unknown) => void) => { handlers[evt] = cb; },
        off: offSpy,
      }),
    }));

    const onEvent = vi.fn();
    const { KjChart: Fresh } = await import('./chart');
    const { rerender } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="x" [kjChartOn]="names" (kjChartEvent)="onEvent($event)"></div>`,
      { imports: [Fresh], componentProperties: { names: ['datazoom'], onEvent } },
    );
    await flush();

    handlers['datazoom']?.({ start: 10 });
    expect(onEvent).toHaveBeenCalledWith({ type: 'datazoom', params: { start: 10 } });

    // Changing the list unbinds the old handler and binds the new one.
    await rerender({ componentProperties: { names: ['brush'], onEvent } });
    await flush();
    expect(offSpy).toHaveBeenCalledWith('datazoom', expect.any(Function));

    handlers['brush']?.({ areas: [] });
    expect(onEvent).toHaveBeenCalledWith({ type: 'brush', params: { areas: [] } });
    vi.doUnmock('echarts');
  });

  it('uses the provideECharts loader instead of the full import when provided', async () => {
    const initSpy = vi.fn(() => makeChartDouble());
    const loader = vi.fn(() => ({ init: initSpy }));

    // Intentionally do NOT mock 'echarts': with a loader present the fallback
    // import must never run.
    const { KjChart: Fresh } = await import('./chart');
    const { provideECharts } = await import('./echarts');
    await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="x"></div>`,
      { imports: [Fresh], providers: [provideECharts(loader as never)] },
    );
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('wires aria-describedby to a visually-hidden description div when kjChartDescription is set', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"
            kjChartDescription="Q3 revenue across 5 regions"></div>`,
      { imports: [KjChart] },
    );
    const host = container.querySelector('[kjChart]') as HTMLElement;
    const id = host.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = host.querySelector(`#${id}`);
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toContain('Q3 revenue across 5 regions');
    expect((desc as HTMLElement).style.position).toBe('absolute');
  });

  it('omits aria-describedby when kjChartDescription is empty', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"></div>`,
      { imports: [KjChart] },
    );
    const host = container.querySelector('[kjChart]') as HTMLElement;
    expect(host.hasAttribute('aria-describedby')).toBe(false);
  });

  it('projects *kjChartTableFallback as a table outside the role="img" host', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales">
         <ng-container *kjChartTableFallback>
           <table data-testid="fb"><tbody><tr><td>x</td></tr></tbody></table>
         </ng-container>
       </div>`,
      { imports: [KjChart, KjChartTableFallback] },
    );
    const tbl = container.querySelector('[data-testid="fb"]');
    expect(tbl).not.toBeNull();
    expect(tbl!.closest('[role="img"]')).toBeNull();
  });

  it('passes axe audit with description + table fallback', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"
            kjChartDescription="Monthly revenue by region">
         <ng-container *kjChartTableFallback>
           <table><caption>Revenue</caption>
             <thead><tr><th scope="col">Region</th><th scope="col">Revenue</th></tr></thead>
             <tbody><tr><th scope="row">EU</th><td>1.2M</td></tr></tbody></table>
         </ng-container>
       </div>`,
      { imports: [KjChart, KjChartTableFallback] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
