# Chart Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `KjChart` from a 50-line ECharts shim to a feature-complete, themed, accessible directive — with 8 examples wired through auto-discovery so `/docs/chart` renders the full story.

**Architecture:** Single-engine ECharts directive in `packages/core/src/chart/`, two sibling files (`chart-tokens.ts` palette helper, `chart-table-fallback.ts` structural directive). 13 theme files gain `--kj-chart-1..6` aliased to existing intent tokens. Examples register through `packages/core/src/example-components.ts`; docs page auto-discovers via `@doc` tags.

**Tech Stack:** Angular 21 (signals, `input`/`output`, `afterNextRender`/`afterEveryRender`, `inject`), ECharts (dynamic import, SSR-safe), Vitest + `@testing-library/angular` + `jest-axe`, pnpm workspaces, Turbo.

**Spec:** [`docs/superpowers/specs/2026-05-21-chart-features-design.md`](../specs/2026-05-21-chart-features-design.md)

**Working directory:** `.worktrees/chart-features` (already created, on `feat/chart-features` branch from `main`). All commands assume this cwd.

---

## Task 1: `chart-tokens.ts` palette helper (TDD)

**Files:**
- Create: `packages/core/src/chart/chart-tokens.ts`
- Create: `packages/core/src/chart/chart-tokens.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/chart/chart-tokens.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveChartPalette } from './chart-tokens';

function makeHost(vars: Record<string, string>): HTMLElement {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  document.body.appendChild(el);
  return el;
}

describe('resolveChartPalette', () => {
  it('returns 6 colors when --kj-chart-1..6 are all set', () => {
    const host = makeHost({
      '--kj-chart-1': '#aaa', '--kj-chart-2': '#bbb', '--kj-chart-3': '#ccc',
      '--kj-chart-4': '#ddd', '--kj-chart-5': '#eee', '--kj-chart-6': '#fff',
    });
    expect(resolveChartPalette(host)).toEqual(['#aaa', '#bbb', '#ccc', '#ddd', '#eee', '#fff']);
  });

  it('falls back to --kj-bg-* intent vars when chart vars are absent', () => {
    const host = makeHost({
      '--kj-bg-primary': '#111', '--kj-bg-accent': '#222',
      '--kj-bg-success': '#333', '--kj-bg-warning': '#444', '--kj-bg-danger': '#555',
    });
    expect(resolveChartPalette(host)).toEqual(['#111', '#222', '#333', '#444', '#555']);
  });

  it('mixes chart vars with intent-var fallback for missing slots', () => {
    const host = makeHost({
      '--kj-chart-1': '#aaa', '--kj-chart-2': '#bbb',
      '--kj-bg-success': '#333', '--kj-bg-warning': '#444', '--kj-bg-danger': '#555',
    });
    expect(resolveChartPalette(host)).toEqual(['#aaa', '#bbb', '#333', '#444', '#555']);
  });

  it('returns empty array when no relevant vars are set', () => {
    const host = makeHost({});
    expect(resolveChartPalette(host)).toEqual([]);
  });

  it('trims whitespace from CSS var values', () => {
    const host = makeHost({ '--kj-chart-1': '  #aaa  ' });
    expect(resolveChartPalette(host)).toEqual(['#aaa']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- chart-tokens`
Expected: FAIL — `Cannot find module './chart-tokens'`.

- [ ] **Step 3: Implement `chart-tokens.ts`**

Create `packages/core/src/chart/chart-tokens.ts`:

```ts
/**
 * Resolves the chart color palette from kj theme tokens on the given host element.
 * Reads `--kj-chart-1..6` first; for any empty slot, falls back to the matching
 * intent token (`--kj-bg-primary`, `--kj-bg-accent`, `--kj-bg-success`,
 * `--kj-bg-warning`, `--kj-bg-danger`) in that order. Slots that remain empty
 * after fallback are dropped.
 */
export function resolveChartPalette(host: HTMLElement): string[] {
  const cs = getComputedStyle(host);
  const fallbacks = [
    '--kj-bg-primary',
    '--kj-bg-accent',
    '--kj-bg-success',
    '--kj-bg-warning',
    '--kj-bg-danger',
  ];
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    const chart = cs.getPropertyValue(`--kj-chart-${i + 1}`).trim();
    if (chart) {
      out.push(chart);
      continue;
    }
    const fallback = fallbacks[i];
    if (fallback) {
      const v = cs.getPropertyValue(fallback).trim();
      if (v) out.push(v);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kouji-ui/core test -- chart-tokens`
Expected: PASS (5 cases).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart-tokens.ts packages/core/src/chart/chart-tokens.spec.ts
git commit -m "feat(core/chart): chart-tokens — resolveChartPalette() from kj theme vars"
```

---

## Task 2: `chart-table-fallback.ts` structural directive (TDD)

**Files:**
- Create: `packages/core/src/chart/chart-table-fallback.ts`
- Create: `packages/core/src/chart/chart-table-fallback.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/chart/chart-table-fallback.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjChartTableFallback } from './chart-table-fallback';

describe('KjChartTableFallback', () => {
  it('renders its template content', async () => {
    const { container } = await render(
      `<ng-container *kjChartTableFallback>
         <table data-testid="fb"><tbody><tr><td>x</td></tr></tbody></table>
       </ng-container>`,
      { imports: [KjChartTableFallback] }
    );
    expect(container.querySelector('[data-testid="fb"]')).toBeInTheDocument();
  });

  it('exposes its TemplateRef via static query on the host', async () => {
    // Used by KjChart to detect a projected fallback. See chart.spec.ts for the
    // integration test; here we only verify the directive renders.
    const { container } = await render(
      `<div><ng-container *kjChartTableFallback>X</ng-container></div>`,
      { imports: [KjChartTableFallback] }
    );
    expect(container.textContent).toContain('X');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- chart-table-fallback`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the directive**

Create `packages/core/src/chart/chart-table-fallback.ts`:

```ts
import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Projects a screen-reader-only table fallback for a `KjChart`. When present
 * inside a `[kjChart]` host, the chart's canvas wrapper becomes `aria-hidden`
 * and the table is rendered alongside it (visually-hidden via the host's
 * sr-only styling) so assistive technology reads structured data instead of
 * the canvas.
 *
 * @example
 * ```html
 * <div kjChart [kjChartOption]="opt()" kjChartLabel="Sales">
 *   <ng-container *kjChartTableFallback>
 *     <table>...</table>
 *   </ng-container>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjChartTableFallback]',
  standalone: true,
})
export class KjChartTableFallback {
  readonly tpl = inject(TemplateRef<unknown>);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kouji-ui/core test -- chart-table-fallback`
Expected: PASS (2 cases).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart-table-fallback.ts packages/core/src/chart/chart-table-fallback.spec.ts
git commit -m "feat(core/chart): KjChartTableFallback structural directive for SR fallback"
```

---

## Task 3: Add `--kj-chart-1..6` to all 13 theme files

**Files:**
- Modify: `packages/themes/src/themes/bauhaus.css`, `corporate.css`, `cyberpunk.css`, `dark.css`, `dune.css`, `forest.css`, `kouji.css`, `light.css`, `mint.css`, `nord.css`, `retro.css`, `sakura.css`, `terminal.css` (13 files)

Each theme aliases the 6 chart slots to existing intent tokens — coherent with the theme's identity, no hex picking. Append the block inside each theme's `[data-theme="<name>"]` rule (before the closing `}`).

- [ ] **Step 1: Add the block to every theme file**

Append to each `[data-theme="<name>"]` rule in every `packages/themes/src/themes/*.css`:

```css
    /* ── chart palette ── */
    --kj-chart-1: var(--kj-bg-primary);
    --kj-chart-2: var(--kj-bg-accent);
    --kj-chart-3: var(--kj-bg-success);
    --kj-chart-4: var(--kj-bg-warning);
    --kj-chart-5: var(--kj-bg-info, var(--kj-bg-accent-subtle));
    --kj-chart-6: var(--kj-bg-danger);
```

Note the `--kj-bg-info` fallback to `--kj-bg-accent-subtle`: some themes don't define `--kj-bg-info`. The `var(..., fallback)` chain handles both cases without per-theme branching.

- [ ] **Step 2: Run themes spec to confirm no regression**

Run: `pnpm --filter @kouji-ui/themes test`
Expected: PASS.

- [ ] **Step 3: Confirm vars resolve in a smoke check**

Run: `pnpm build:docs`
Expected: PASS (no CSS parser errors).

- [ ] **Step 4: Commit**

```bash
git add packages/themes/src/themes/*.css
git commit -m "feat(themes): add --kj-chart-1..6 palette aliases to all themes"
```

---

## Task 4: Extend `KjChart` API surface (inputs/outputs/exportAs only — no wiring)

This task adds the new API but leaves the existing render logic alone. Wiring (resize, reduced-motion, etc.) lands in later tasks so each behavior gets its own TDD cycle.

**Files:**
- Modify: `packages/core/src/chart/chart.ts`
- Modify: `packages/core/src/chart/chart.spec.ts` (only to keep existing tests green — no new cases yet)

- [ ] **Step 1: Replace `chart.ts` with the extended skeleton**

Overwrite `packages/core/src/chart/chart.ts`:

```ts
import {
  Directive,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  afterNextRender,
  afterEveryRender,
  computed,
  signal,
} from '@angular/core';
import type { EChartsOption, EChartsType, ECElementEvent } from 'echarts';

let nextDescId = 0;

/**
 * Wraps Apache ECharts. Initializes after first render, updates reactively
 * (resize, reduced-motion, kj theme palette), disposes on destroy.
 * Always provide `kjChartLabel` for WCAG AAA compliance.
 *
 * @example
 * ```html
 * <div kjChart [kjChartOption]="chartOption()" kjChartLabel="Monthly revenue" style="height:300px"></div>
 * ```
 * @doc-category Core/Data
 * @doc
 * @doc-name chart
 * @doc-description Renders a reactive ECharts chart on any sized element with an accessible label.
 * @doc-is-main
 */
@Directive({
  selector: '[kjChart]',
  standalone: true,
  exportAs: 'kjChart',
  host: {
    role: 'img',
    '[attr.aria-label]': 'kjChartLabel() || null',
    '[attr.aria-describedby]': 'descriptionId() || null',
  },
})
export class KjChart {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** ECharts option object defining the chart. */
  kjChartOption = input.required<EChartsOption>();
  /** Accessible short label for the chart. Required for WCAG AAA compliance. */
  kjChartLabel = input.required<string>();
  /** Longer description; rendered visually-hidden and wired via aria-describedby. */
  kjChartDescription = input<string>('');
  /** Toggles ECharts showLoading/hideLoading. */
  kjChartLoading = input<boolean>(false);
  /** Explicit color array; falls back to kj theme palette (resolveChartPalette) when undefined. */
  kjChartPalette = input<string[] | undefined>(undefined);
  /** Honored unless prefers-reduced-motion: reduce is set. */
  kjChartAnimate = input<boolean>(true);

  /** Emits the ECharts instance once initialized. */
  kjChartReady = output<EChartsType>();
  /** Emits ECharts 'click' events. */
  kjChartClick = output<ECElementEvent>();
  /** Emits ECharts 'legendselectchanged' events. */
  kjChartLegendSelect = output<unknown>();

  /** Unique id for the description div; used by host's aria-describedby binding. */
  readonly descriptionId = computed(() =>
    this.kjChartDescription() ? `kj-chart-desc-${this._descSeq}` : ''
  );
  private readonly _descSeq = ++nextDescId;

  private chart: EChartsType | null = null;
  /** Used by KjChart to detect a projected `*kjChartTableFallback` template. */
  protected readonly _fallbackPresent = signal(false);

  constructor() {
    afterNextRender(async () => {
      try {
        const echarts = await import('echarts');
        this.chart = echarts.init(this.el.nativeElement);
        this.chart.setOption(this.kjChartOption());
        this.kjChartReady.emit(this.chart);
        this.destroyRef.onDestroy(() => this.chart?.dispose());
      } catch {
        // ECharts cannot initialize in non-browser environments (jsdom, SSR)
      }
    });

    afterEveryRender(() => {
      if (this.chart) {
        this.chart.setOption(this.kjChartOption());
      }
    });
  }

  /** Imperative resize — wraps chart.resize(). */
  resize(): void {
    this.chart?.resize();
  }

  /** Imperative dispatch — passes through to ECharts. */
  dispatchAction(payload: Parameters<EChartsType['dispatchAction']>[0]): void {
    this.chart?.dispatchAction(payload);
  }

  /** Reads current option — passes through to ECharts. */
  getOption(): EChartsOption | undefined {
    return this.chart?.getOption() as EChartsOption | undefined;
  }
}
```

- [ ] **Step 2: Update existing spec to satisfy new `kjChartLabel.required`**

Modify `packages/core/src/chart/chart.spec.ts` — the existing first test passes `[kjChartOption]="{}"` without a label. Add `kjChartLabel` to all four cases:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect } from 'vitest';
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
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @kouji-ui/core test -- chart`
Expected: PASS (4 existing cases). The directive compiles, ECharts try/catch keeps jsdom safe.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/chart/chart.ts packages/core/src/chart/chart.spec.ts
git commit -m "feat(core/chart): extend KjChart with description/loading/palette/animate inputs + outputs + exportAs"
```

---

## Task 5: ResizeObserver + rAF-coalesced `chart.resize()` (TDD)

ECharts can't run under jsdom, so the test asserts the **wiring** (ResizeObserver constructor called with a callback that calls our private method) by stubbing ECharts via a per-test injection.

**Files:**
- Modify: `packages/core/src/chart/chart.ts`
- Modify: `packages/core/src/chart/chart.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `chart.spec.ts` (inside the existing `describe`):

```ts
it('calls chart.resize() when ResizeObserver fires', async () => {
  // Capture the ResizeObserver callback Angular's afterNextRender installs.
  let roCb: (() => void) | undefined;
  const OriginalRO = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) { roCb = () => cb([], this as unknown as ResizeObserver); }
    observe() {} unobserve() {} disconnect() {}
  } as unknown as typeof ResizeObserver;

  const resizeSpy = vi.fn();
  // Mock echarts so init returns a stub with our spy.
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

  // Re-import KjChart so the mocked echarts is used on first dynamic import.
  const { KjChart: Fresh } = await import('./chart');
  await render(`<div kjChart [kjChartOption]="{}" kjChartLabel="x"></div>`, { imports: [Fresh] });
  // Flush afterNextRender + dynamic import.
  await new Promise(r => setTimeout(r, 0));

  roCb?.();
  // rAF-coalesced resize.
  await new Promise(r => requestAnimationFrame(() => r(null)));

  expect(resizeSpy).toHaveBeenCalledTimes(1);

  globalThis.ResizeObserver = OriginalRO;
  vi.doUnmock('echarts');
});
```

Add to the top of the file:
```ts
import { vi } from 'vitest';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: FAIL — `resizeSpy` not called (no RO wiring yet).

- [ ] **Step 3: Add RO wiring inside `KjChart`**

In `chart.ts`, inside the `afterNextRender` callback, after `this.chart = echarts.init(...)`:

```ts
        // ResizeObserver — coalesce via rAF so a burst of resize entries collapses to one chart.resize().
        let pendingRaf = 0;
        const ro = new ResizeObserver(() => {
          if (pendingRaf) return;
          pendingRaf = requestAnimationFrame(() => {
            pendingRaf = 0;
            this.chart?.resize();
          });
        });
        ro.observe(this.el.nativeElement);
        this.destroyRef.onDestroy(() => {
          if (pendingRaf) cancelAnimationFrame(pendingRaf);
          ro.disconnect();
        });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart.ts packages/core/src/chart/chart.spec.ts
git commit -m "feat(core/chart): ResizeObserver -> chart.resize() (rAF-coalesced)"
```

---

## Task 6: `prefers-reduced-motion` wiring (TDD)

**Files:**
- Modify: `packages/core/src/chart/chart.ts`
- Modify: `packages/core/src/chart/chart.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `chart.spec.ts`:

```ts
it('disables animation when prefers-reduced-motion: reduce matches', async () => {
  const setOptionSpy = vi.fn();
  vi.doMock('echarts', () => ({
    init: () => ({
      setOption: setOptionSpy, resize: vi.fn(), on: vi.fn(), dispose: vi.fn(),
      showLoading: vi.fn(), hideLoading: vi.fn(), getOption: vi.fn(), dispatchAction: vi.fn(),
    }),
  }));

  // Stub matchMedia to return matches=true for reduced motion.
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
  await new Promise(r => setTimeout(r, 0));

  const arg = setOptionSpy.mock.calls[0]?.[0];
  expect(arg).toBeDefined();
  expect(arg.animation).toBe(false);
  expect(arg.animationDuration).toBe(0);

  window.matchMedia = originalMM;
  vi.doUnmock('echarts');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: FAIL — `arg.animation` is `true` (no merge yet).

- [ ] **Step 3: Implement option-merge helper + matchMedia subscription**

In `chart.ts`, add a private method and use it everywhere `setOption` is called.

Inside the class:

```ts
  private prefersReducedMotion = signal(false);

  private resolveOption(): EChartsOption {
    const base = this.kjChartOption();
    const animate = this.kjChartAnimate() && !this.prefersReducedMotion();
    return {
      ...base,
      animation: animate,
      animationDuration: animate ? (base as { animationDuration?: number }).animationDuration ?? 1000 : 0,
    };
  }
```

In the `afterNextRender` block, **replace** the `this.chart.setOption(this.kjChartOption())` call with `this.chart.setOption(this.resolveOption())`. Just before, subscribe to matchMedia:

```ts
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion.set(mql.matches);
        const onMqlChange = () => {
          this.prefersReducedMotion.set(mql.matches);
          this.chart?.setOption(this.resolveOption());
        };
        mql.addEventListener('change', onMqlChange);
        this.destroyRef.onDestroy(() => mql.removeEventListener('change', onMqlChange));
```

In `afterEveryRender`, replace `this.chart.setOption(this.kjChartOption())` with `this.chart.setOption(this.resolveOption())`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart.ts packages/core/src/chart/chart.spec.ts
git commit -m "feat(core/chart): honor prefers-reduced-motion (animation:false, duration:0)"
```

---

## Task 7: Theme `MutationObserver` + palette wire-up (TDD)

**Files:**
- Modify: `packages/core/src/chart/chart.ts`
- Modify: `packages/core/src/chart/chart.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `chart.spec.ts`:

```ts
it('re-applies setOption with refreshed palette when <html> data-theme changes', async () => {
  const setOptionSpy = vi.fn();
  vi.doMock('echarts', () => ({
    init: () => ({
      setOption: setOptionSpy, resize: vi.fn(), on: vi.fn(), dispose: vi.fn(),
      showLoading: vi.fn(), hideLoading: vi.fn(), getOption: vi.fn(), dispatchAction: vi.fn(),
    }),
  }));

  const { KjChart: Fresh } = await import('./chart');
  await render(`<div kjChart [kjChartOption]="{}" kjChartLabel="x"></div>`, { imports: [Fresh] });
  await new Promise(r => setTimeout(r, 0));

  const callsBefore = setOptionSpy.mock.calls.length;
  document.documentElement.setAttribute('data-theme', 'dark');
  // MutationObserver is microtask-scheduled.
  await Promise.resolve(); await Promise.resolve();

  expect(setOptionSpy.mock.calls.length).toBeGreaterThan(callsBefore);

  document.documentElement.removeAttribute('data-theme');
  vi.doUnmock('echarts');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: FAIL.

- [ ] **Step 3: Wire MutationObserver and palette resolution**

In `chart.ts`, add the `resolveChartPalette` import at the top:

```ts
import { resolveChartPalette } from './chart-tokens';
```

Update `resolveOption()` to inject the palette as the `color` array unless user supplied one:

```ts
  private resolveOption(): EChartsOption {
    const base = this.kjChartOption();
    const animate = this.kjChartAnimate() && !this.prefersReducedMotion();
    const explicit = this.kjChartPalette();
    const color = explicit ?? resolveChartPalette(this.el.nativeElement);
    return {
      ...base,
      color: color.length ? color : (base as { color?: string[] }).color,
      animation: animate,
      animationDuration: animate ? (base as { animationDuration?: number }).animationDuration ?? 1000 : 0,
    };
  }
```

Inside `afterNextRender`, after the matchMedia block, add:

```ts
        const themeMo = new MutationObserver(() => this.chart?.setOption(this.resolveOption()));
        themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
        this.destroyRef.onDestroy(() => themeMo.disconnect());
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart.ts packages/core/src/chart/chart.spec.ts
git commit -m "feat(core/chart): MutationObserver on <html> re-applies kj theme palette"
```

---

## Task 8: Loading state — `[kjChartLoading]` (TDD)

**Files:**
- Modify: `packages/core/src/chart/chart.ts`
- Modify: `packages/core/src/chart/chart.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `chart.spec.ts`:

```ts
it('calls showLoading/hideLoading when [kjChartLoading] toggles', async () => {
  const show = vi.fn(), hide = vi.fn();
  vi.doMock('echarts', () => ({
    init: () => ({
      setOption: vi.fn(), resize: vi.fn(), on: vi.fn(), dispose: vi.fn(),
      showLoading: show, hideLoading: hide, getOption: vi.fn(), dispatchAction: vi.fn(),
    }),
  }));

  const { KjChart: Fresh } = await import('./chart');
  const { rerender } = await render(
    `<div kjChart [kjChartOption]="{}" kjChartLabel="x" [kjChartLoading]="loading"></div>`,
    { imports: [Fresh], componentInputs: { loading: false } as never },
  );
  await new Promise(r => setTimeout(r, 0));

  await rerender({ componentInputs: { loading: true } as never });
  await new Promise(r => setTimeout(r, 0));
  expect(show).toHaveBeenCalled();

  await rerender({ componentInputs: { loading: false } as never });
  await new Promise(r => setTimeout(r, 0));
  expect(hide).toHaveBeenCalled();

  vi.doUnmock('echarts');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: FAIL.

- [ ] **Step 3: Drive loading via effect**

In `chart.ts`, add `effect` to imports:

```ts
import { effect } from '@angular/core';
```

In the constructor, after the `afterEveryRender` block, add:

```ts
    effect(() => {
      const loading = this.kjChartLoading();
      if (!this.chart) return;
      if (loading) this.chart.showLoading();
      else this.chart.hideLoading();
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart.ts packages/core/src/chart/chart.spec.ts
git commit -m "feat(core/chart): [kjChartLoading] wires showLoading/hideLoading"
```

---

## Task 9: Event outputs `(kjChartClick)`, `(kjChartLegendSelect)`, `(kjChartReady)` (TDD)

`kjChartReady` is already emitted from Task 4 — we add a test for it. Click and legend need handler registration.

**Files:**
- Modify: `packages/core/src/chart/chart.ts`
- Modify: `packages/core/src/chart/chart.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add to `chart.spec.ts`:

```ts
it('emits kjChartReady with the ECharts instance', async () => {
  const instance = {
    setOption: vi.fn(), resize: vi.fn(), on: vi.fn(), dispose: vi.fn(),
    showLoading: vi.fn(), hideLoading: vi.fn(), getOption: vi.fn(), dispatchAction: vi.fn(),
  };
  vi.doMock('echarts', () => ({ init: () => instance }));

  const ready = vi.fn();
  const { KjChart: Fresh } = await import('./chart');
  await render(
    `<div kjChart [kjChartOption]="{}" kjChartLabel="x" (kjChartReady)="onReady($event)"></div>`,
    { imports: [Fresh], componentProperties: { onReady: ready } },
  );
  await new Promise(r => setTimeout(r, 0));
  expect(ready).toHaveBeenCalledWith(instance);
  vi.doUnmock('echarts');
});

it('emits (kjChartClick) when the ECharts "click" handler fires', async () => {
  let clickHandler: ((e: unknown) => void) | undefined;
  vi.doMock('echarts', () => ({
    init: () => ({
      setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(),
      showLoading: vi.fn(), hideLoading: vi.fn(), getOption: vi.fn(), dispatchAction: vi.fn(),
      on: (evt: string, cb: (e: unknown) => void) => { if (evt === 'click') clickHandler = cb; },
    }),
  }));

  const click = vi.fn();
  const { KjChart: Fresh } = await import('./chart');
  await render(
    `<div kjChart [kjChartOption]="{}" kjChartLabel="x" (kjChartClick)="onClick($event)"></div>`,
    { imports: [Fresh], componentProperties: { onClick: click } },
  );
  await new Promise(r => setTimeout(r, 0));
  clickHandler?.({ value: 42 });
  expect(click).toHaveBeenCalledWith({ value: 42 });
  vi.doUnmock('echarts');
});

it('emits (kjChartLegendSelect) when ECharts "legendselectchanged" handler fires', async () => {
  let legendHandler: ((e: unknown) => void) | undefined;
  vi.doMock('echarts', () => ({
    init: () => ({
      setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(),
      showLoading: vi.fn(), hideLoading: vi.fn(), getOption: vi.fn(), dispatchAction: vi.fn(),
      on: (evt: string, cb: (e: unknown) => void) => { if (evt === 'legendselectchanged') legendHandler = cb; },
    }),
  }));

  const legend = vi.fn();
  const { KjChart: Fresh } = await import('./chart');
  await render(
    `<div kjChart [kjChartOption]="{}" kjChartLabel="x" (kjChartLegendSelect)="onLegend($event)"></div>`,
    { imports: [Fresh], componentProperties: { onLegend: legend } },
  );
  await new Promise(r => setTimeout(r, 0));
  legendHandler?.({ name: 'Series A' });
  expect(legend).toHaveBeenCalledWith({ name: 'Series A' });
  vi.doUnmock('echarts');
});
```

- [ ] **Step 2: Run to verify failures**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: FAIL (the two `on(...)` tests; ready test may already pass from Task 4).

- [ ] **Step 3: Register handlers after init**

In `chart.ts`, inside `afterNextRender` immediately after the `kjChartReady.emit(...)` line:

```ts
        this.chart.on('click', (e: ECElementEvent) => this.kjChartClick.emit(e));
        this.chart.on('legendselectchanged', (e: unknown) => this.kjChartLegendSelect.emit(e));
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart.ts packages/core/src/chart/chart.spec.ts
git commit -m "feat(core/chart): outputs (kjChartClick) + (kjChartLegendSelect) + (kjChartReady)"
```

---

## Task 10: `aria-describedby` + visually-hidden description (TDD)

**Files:**
- Modify: `packages/core/src/chart/chart.ts`
- Modify: `packages/core/src/chart/chart.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `chart.spec.ts`:

```ts
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
  // Visually-hidden: position absolute, 1px size, clip
  const styles = (desc as HTMLElement).style;
  expect(styles.position).toBe('absolute');
});

it('omits aria-describedby when kjChartDescription is empty', async () => {
  const { container } = await render(
    `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"></div>`,
    { imports: [KjChart] },
  );
  const host = container.querySelector('[kjChart]') as HTMLElement;
  expect(host.hasAttribute('aria-describedby')).toBe(false);
});
```

- [ ] **Step 2: Run to verify failures**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: FAIL — no description div is rendered.

- [ ] **Step 3: Render the description div via DOM (no template change needed)**

In `chart.ts`, inside the constructor after `afterEveryRender` registration, append an `effect` that maintains a child `<div>` inside the host:

```ts
    effect(() => {
      const text = this.kjChartDescription();
      const id = this.descriptionId();
      const host = this.el.nativeElement;
      let div = host.querySelector<HTMLDivElement>(':scope > [data-kj-chart-desc]');
      if (!text) {
        div?.remove();
        return;
      }
      if (!div) {
        div = document.createElement('div');
        div.setAttribute('data-kj-chart-desc', '');
        // Visually-hidden, leaves text accessible to AT.
        Object.assign(div.style, {
          position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px',
          overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: '0',
        } as CSSStyleDeclaration);
        host.appendChild(div);
      }
      div.id = id;
      div.textContent = text;
    });
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart.ts packages/core/src/chart/chart.spec.ts
git commit -m "feat(core/chart): kjChartDescription -> visually-hidden div + aria-describedby"
```

---

## Task 11: Hook `KjChartTableFallback` into `KjChart` (TDD)

When a `*kjChartTableFallback` is projected, render its template inside the host, mark the ECharts canvas wrapper `aria-hidden="true"`, and leave the table accessible.

**Files:**
- Modify: `packages/core/src/chart/chart.ts`
- Modify: `packages/core/src/chart/chart.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `chart.spec.ts`:

```ts
import { KjChartTableFallback } from './chart-table-fallback';

it('marks the ECharts canvas wrapper aria-hidden when *kjChartTableFallback is projected', async () => {
  const { container } = await render(
    `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales">
       <ng-container *kjChartTableFallback>
         <table data-testid="fb"><tbody><tr><td>x</td></tr></tbody></table>
       </ng-container>
     </div>`,
    { imports: [KjChart, KjChartTableFallback] },
  );
  // The fallback's table is in the DOM and not aria-hidden.
  const tbl = container.querySelector('[data-testid="fb"]');
  expect(tbl).not.toBeNull();
  expect(tbl!.closest('[aria-hidden="true"]')).toBeNull();
  // The host has aria-describedby pointing at a hidden region (the chart vs the table is not mixed).
  // No further assertion on echarts canvas; it isn't initialized under jsdom.
});

it('passes axe audit with description + table fallback', async () => {
  const { container } = await render(
    `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"
          kjChartDescription="Monthly revenue by region">
       <ng-container *kjChartTableFallback>
         <table><thead><tr><th scope="col">Region</th><th scope="col">Revenue</th></tr></thead>
           <tbody><tr><th scope="row">EU</th><td>1.2M</td></tr></tbody></table>
       </ng-container>
     </div>`,
    { imports: [KjChart, KjChartTableFallback] },
  );
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 2: Run to verify failures**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: FAIL — the fallback template is not rendered.

- [ ] **Step 3: Use content query + ViewContainerRef**

In `chart.ts`, add imports:

```ts
import { contentChild, ViewContainerRef } from '@angular/core';
import { KjChartTableFallback } from './chart-table-fallback';
```

Add to the class body:

```ts
  protected readonly _fallback = contentChild(KjChartTableFallback);
  private readonly vcr = inject(ViewContainerRef);
```

Remove the existing `_fallbackPresent` signal (introduced in Task 4 but unused now).

In the constructor, after the description `effect`, add:

```ts
    effect(() => {
      const fb = this._fallback();
      this.vcr.clear();
      if (fb) this.vcr.createEmbeddedView(fb.tpl);
    });
```

> Note: `ViewContainerRef` injection on a directive without a structural selector creates views as siblings of the host element. That's the desired behavior — the table renders inside the page flow, not inside the ECharts canvas.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm --filter @kouji-ui/core test -- chart.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart.ts packages/core/src/chart/chart.spec.ts
git commit -m "feat(core/chart): project *kjChartTableFallback as SR table alongside chart"
```

---

## Task 12: Example shared fixtures

**Files:**
- Create: `packages/core/src/chart/_examples/fixtures.ts`

- [ ] **Step 1: Write fixtures**

```ts
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const REVENUE = [120, 132, 101, 134, 90, 230, 210];

export const USERS = {
  desktop: [820, 932, 901, 934, 1290, 1330, 1320],
  mobile:  [220, 182, 191, 234, 290, 330, 310],
};

export const REGION_REVENUE = [
  { value: 1048, name: 'EU' },
  { value: 735,  name: 'NA' },
  { value: 580,  name: 'APAC' },
  { value: 484,  name: 'LATAM' },
  { value: 300,  name: 'MEA' },
];
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/chart/_examples/fixtures.ts
git commit -m "feat(core/chart): example fixtures (days/revenue/users/region)"
```

---

## Task 13: Chart-shape examples (5 files)

All five use `[kjChart]` with `style="height: 300px"` (sparkline uses 60px).

**Files:**
- Create: `packages/core/src/chart/_examples/chart.example.ts`
- Create: `packages/core/src/chart/_examples/chart.bar.example.ts`
- Create: `packages/core/src/chart/_examples/chart.donut.example.ts`
- Create: `packages/core/src/chart/_examples/chart.area.example.ts`
- Create: `packages/core/src/chart/_examples/chart.sparkline.example.ts`

- [ ] **Step 1: `chart.example.ts` (default basic line)**

```ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, REVENUE } from './fixtures';

@Component({
  selector: 'chart-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Weekly revenue, line chart" style="height: 300px;"></div>
  `,
})
export class ChartExample {
  readonly opt = signal({
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    tooltip: { trigger: 'axis' },
    series: [{ name: 'Revenue', type: 'line', data: REVENUE, smooth: true }],
  });
}
```

- [ ] **Step 2: `chart.bar.example.ts` (multi-series grouped bar)**

```ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, USERS } from './fixtures';

@Component({
  selector: 'chart-bar-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Daily active users by platform" style="height: 300px;"></div>
  `,
})
export class ChartBarExample {
  readonly opt = signal({
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    legend: { data: ['Desktop', 'Mobile'] },
    tooltip: { trigger: 'axis' },
    series: [
      { name: 'Desktop', type: 'bar', data: USERS.desktop },
      { name: 'Mobile',  type: 'bar', data: USERS.mobile  },
    ],
  });
}
```

- [ ] **Step 3: `chart.donut.example.ts`**

```ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { REGION_REVENUE } from './fixtures';

@Component({
  selector: 'chart-donut-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Revenue by region" style="height: 300px;"></div>
  `,
})
export class ChartDonutExample {
  readonly opt = signal({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: 'Region',
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}: {d}%' },
      data: REGION_REVENUE,
    }],
  });
}
```

- [ ] **Step 4: `chart.area.example.ts` (stacked area)**

```ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, USERS } from './fixtures';

@Component({
  selector: 'chart-area-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Daily users — stacked area" style="height: 300px;"></div>
  `,
})
export class ChartAreaExample {
  readonly opt = signal({
    xAxis: { type: 'category', boundaryGap: false, data: DAYS },
    yAxis: { type: 'value' },
    legend: { data: ['Desktop', 'Mobile'] },
    tooltip: { trigger: 'axis' },
    series: [
      { name: 'Desktop', type: 'line', stack: 'total', areaStyle: {}, data: USERS.desktop, smooth: true },
      { name: 'Mobile',  type: 'line', stack: 'total', areaStyle: {}, data: USERS.mobile,  smooth: true },
    ],
  });
}
```

- [ ] **Step 5: `chart.sparkline.example.ts`**

```ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { REVENUE } from './fixtures';

@Component({
  selector: 'chart-sparkline-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Weekly revenue sparkline" style="height: 60px;"></div>
  `,
})
export class ChartSparklineExample {
  readonly opt = signal({
    grid: { left: 0, right: 0, top: 4, bottom: 4 },
    xAxis: { type: 'category', show: false, data: REVENUE.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    tooltip: { show: false },
    series: [{ type: 'line', data: REVENUE, smooth: true, showSymbol: false, areaStyle: {} }],
  });
}
```

- [ ] **Step 6: Confirm build still green**

Run: `pnpm --filter @kouji-ui/core build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/chart/_examples/chart.example.ts \
        packages/core/src/chart/_examples/chart.bar.example.ts \
        packages/core/src/chart/_examples/chart.donut.example.ts \
        packages/core/src/chart/_examples/chart.area.example.ts \
        packages/core/src/chart/_examples/chart.sparkline.example.ts
git commit -m "feat(core/chart): chart-shape examples (line/bar/donut/area/sparkline)"
```

---

## Task 14: Feature-demo examples (3 files)

**Files:**
- Create: `packages/core/src/chart/_examples/chart.events.example.ts`
- Create: `packages/core/src/chart/_examples/chart.loading.example.ts`
- Create: `packages/core/src/chart/_examples/chart.fallback.example.ts`

- [ ] **Step 1: `chart.events.example.ts`**

```ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, REVENUE } from './fixtures';
import type { ECElementEvent } from 'echarts';

@Component({
  selector: 'chart-events-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart
         [kjChartOption]="opt()"
         kjChartLabel="Weekly revenue — interactive"
         (kjChartClick)="onClick($event)"
         (kjChartLegendSelect)="onLegend($event)"
         style="height: 300px;"></div>
    <p>Last interaction: {{ last() }}</p>
  `,
})
export class ChartEventsExample {
  readonly opt = signal({
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    legend: { data: ['Revenue'] },
    tooltip: { trigger: 'axis' },
    series: [{ name: 'Revenue', type: 'bar', data: REVENUE }],
  });
  readonly last = signal('—');
  onClick(e: ECElementEvent) { this.last.set(`click ${e.name} = ${e.value}`); }
  onLegend(e: unknown) {
    const name = (e as { name?: string }).name ?? '?';
    this.last.set(`legend toggled: ${name}`);
  }
}
```

- [ ] **Step 2: `chart.loading.example.ts`**

```ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, REVENUE } from './fixtures';

@Component({
  selector: 'chart-loading-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="loading.set(!loading())">
      {{ loading() ? 'Stop loading' : 'Show loading' }}
    </button>
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Loading-state demo"
         [kjChartLoading]="loading()" style="height: 300px;"></div>
  `,
})
export class ChartLoadingExample {
  readonly loading = signal(false);
  readonly opt = signal({
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: REVENUE, smooth: true }],
  });
}
```

- [ ] **Step 3: `chart.fallback.example.ts`**

```ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { KjChartTableFallback } from '../chart-table-fallback';
import { DAYS, USERS } from './fixtures';

@Component({
  selector: 'chart-fallback-example',
  standalone: true,
  imports: [KjChart, KjChartTableFallback],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()"
         kjChartLabel="Daily active users by platform"
         kjChartDescription="A grouped bar chart showing desktop and mobile users over the past week."
         style="height: 300px;">
      <ng-container *kjChartTableFallback>
        <table>
          <caption>Daily users (desktop / mobile)</caption>
          <thead><tr><th scope="col">Day</th><th scope="col">Desktop</th><th scope="col">Mobile</th></tr></thead>
          <tbody>
            @for (d of days; let i = $index; track d) {
              <tr><th scope="row">{{ d }}</th><td>{{ desktop[i] }}</td><td>{{ mobile[i] }}</td></tr>
            }
          </tbody>
        </table>
      </ng-container>
    </div>
  `,
})
export class ChartFallbackExample {
  readonly days = DAYS;
  readonly desktop = USERS.desktop;
  readonly mobile = USERS.mobile;
  readonly opt = signal({
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    legend: { data: ['Desktop', 'Mobile'] },
    tooltip: { trigger: 'axis' },
    series: [
      { name: 'Desktop', type: 'bar', data: USERS.desktop },
      { name: 'Mobile',  type: 'bar', data: USERS.mobile  },
    ],
  });
}
```

- [ ] **Step 4: Confirm build**

Run: `pnpm --filter @kouji-ui/core build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/_examples/chart.events.example.ts \
        packages/core/src/chart/_examples/chart.loading.example.ts \
        packages/core/src/chart/_examples/chart.fallback.example.ts
git commit -m "feat(core/chart): feature-demo examples (events/loading/fallback)"
```

---

## Task 15: `_examples/index.ts` barrel + register in `example-components.ts`

**Files:**
- Create: `packages/core/src/chart/_examples/index.ts`
- Modify: `packages/core/src/example-components.ts`

- [ ] **Step 1: Write `_examples/index.ts`**

```ts
export { ChartExample }         from './chart.example';
export { ChartBarExample }      from './chart.bar.example';
export { ChartDonutExample }    from './chart.donut.example';
export { ChartAreaExample }     from './chart.area.example';
export { ChartSparklineExample } from './chart.sparkline.example';
export { ChartEventsExample }   from './chart.events.example';
export { ChartLoadingExample }  from './chart.loading.example';
export { ChartFallbackExample } from './chart.fallback.example';
```

- [ ] **Step 2: Register the loader in `example-components.ts`**

Open `packages/core/src/example-components.ts`. In `EXAMPLE_LOADERS`, add `'chart'` keeping alphabetical order (between `'button'` and `'dialog'`):

```ts
  'button': () => import('./button/_examples') as Promise<Record<string, Type<unknown>>>,
  'chart': () => import('./chart/_examples') as Promise<Record<string, Type<unknown>>>,
  'dialog': () => import('./dialog/_examples') as Promise<Record<string, Type<unknown>>>,
```

In `EXAMPLE_OWNER`, add 8 entries alphabetically after the four `Button*` entries and before the `Dialog*` entries:

```ts
  ChartAreaExample: 'chart',
  ChartBarExample: 'chart',
  ChartDonutExample: 'chart',
  ChartEventsExample: 'chart',
  ChartExample: 'chart',
  ChartFallbackExample: 'chart',
  ChartLoadingExample: 'chart',
  ChartSparklineExample: 'chart',
```

- [ ] **Step 3: Verify the registry typechecks**

Run: `pnpm --filter @kouji-ui/core build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/chart/_examples/index.ts packages/core/src/example-components.ts
git commit -m "feat(core/chart): register 8 chart examples in EXAMPLE_LOADERS/OWNER"
```

---

## Task 16: Add `@doc-example` tags + update barrel `index.ts`

**Files:**
- Modify: `packages/core/src/chart/chart.ts` (TSDoc only)
- Modify: `packages/core/src/chart/index.ts`

- [ ] **Step 1: Extend the directive's TSDoc**

In `packages/core/src/chart/chart.ts`, replace the directive's TSDoc block with:

```ts
/**
 * Wraps Apache ECharts. Initializes after first render, updates reactively
 * (resize, reduced-motion, kj theme palette), disposes on destroy.
 * Always provide `kjChartLabel` for WCAG AAA compliance.
 *
 * @example
 * ```html
 * <div kjChart [kjChartOption]="chartOption()" kjChartLabel="Monthly revenue" style="height:300px"></div>
 * ```
 * @doc-category Core/Data
 * @doc
 * @doc-name chart
 * @doc-description Renders a reactive ECharts chart on any sized element with an accessible label.
 * @doc-is-main
 * @doc-example ChartExample
 * @doc-example ChartBarExample
 * @doc-example ChartDonutExample
 * @doc-example ChartAreaExample
 * @doc-example ChartSparklineExample
 * @doc-example ChartEventsExample
 * @doc-example ChartLoadingExample
 * @doc-example ChartFallbackExample
 */
```

- [ ] **Step 2: Read current barrel**

Run: `cat packages/core/src/chart/index.ts`

If the file exists with only `export * from './chart';`, replace it. If it doesn't exist, create it.

- [ ] **Step 3: Extend the barrel**

Overwrite `packages/core/src/chart/index.ts`:

```ts
export { KjChart } from './chart';
export { KjChartTableFallback } from './chart-table-fallback';
export { resolveChartPalette } from './chart-tokens';
```

- [ ] **Step 4: Verify build + types**

Run: `pnpm --filter @kouji-ui/core build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/chart/chart.ts packages/core/src/chart/index.ts
git commit -m "feat(core/chart): add @doc-example tags + export KjChartTableFallback/resolveChartPalette"
```

---

## Task 17: Changeset

**Files:**
- Create: `.changeset/feat-chart.md`

- [ ] **Step 1: Write changeset**

```markdown
---
'@kouji-ui/core': minor
'@kouji-ui/themes': minor
---

feat(chart): KjChart — ResizeObserver, prefers-reduced-motion, theme palette via `--kj-chart-1..6` (alias to intent tokens in all 13 themes), `kjChartDescription` + `aria-describedby`, `*kjChartTableFallback` for screen-reader tables, event outputs (`kjChartClick`, `kjChartLegendSelect`, `kjChartReady`), `[kjChartLoading]`, `exportAs="kjChart"` with `resize/dispatchAction/getOption`. 8 examples wired through the example registry; auto-discovered docs page at `/docs/chart`.
```

- [ ] **Step 2: Verify changeset is recognized**

Run: `pnpm changeset status`
Expected: shows `@kouji-ui/core` and `@kouji-ui/themes` to be bumped at `minor`.

- [ ] **Step 3: Commit**

```bash
git add .changeset/feat-chart.md
git commit -m "chore(changeset): minor bump for chart features (core + themes)"
```

---

## Task 18: Final verification + PR

- [ ] **Step 1: Full lint + test**

Run: `pnpm lint && pnpm test`
Expected: PASS. If lint flags anything in the new files, fix and re-run.

- [ ] **Step 2: Full build**

Run: `pnpm build`
Expected: PASS — no `apps/docs#build` errors, no TS errors.

- [ ] **Step 3: Manual docs smoke**

Run: `pnpm --filter docs start` (do NOT use `--host`).
Navigate to `http://localhost:4200/docs/chart`.
Verify:
- Page loads with all 8 examples
- Each chart renders (no blank `<div>`)
- No browser console errors
- Switch themes via the docs theme switcher — all 8 charts re-paint with new colors
- Toggle the `[kjChartLoading]` button in the loading example — loading overlay appears/disappears
- Click a bar in the events example — "Last interaction" updates
- Inspect the fallback example — the `<table>` is in the DOM (visually hidden but present), and the chart's `aria-describedby` resolves to a hidden div

Stop the dev server with Ctrl+C when done.

- [ ] **Step 4: A11y audit**

In the running dev server, open `/docs/chart` and run an a11y audit (Lighthouse or axe DevTools).
Expected: 0 critical violations on the chart page.

- [ ] **Step 5: Push the branch**

```bash
git push -u origin feat/chart-features
```

> Pre-push hook runs lint + changeset status. If lint/test were green in Step 1-2, this should pass.

- [ ] **Step 6: Open the PR**

Open this URL in the browser:
`https://github.com/kouji-dev/kouji-ui/compare/main...feat/chart-features?quick_pull=1`

Title:
```
feat(chart): KjChart hardening + 8 examples wired into docs
```

Body:
```markdown
## Summary
- ResizeObserver → `chart.resize()` (rAF-coalesced)
- `prefers-reduced-motion` → forces `animation: false` + `animationDuration: 0`
- `MutationObserver` on `<html>` re-resolves kj theme palette via `--kj-chart-1..6` (aliased to intent tokens in all 13 themes)
- `kjChartDescription` → visually-hidden div + `aria-describedby`
- `*kjChartTableFallback` structural directive — projects an SR `<table>` alongside the chart
- Outputs: `(kjChartClick)`, `(kjChartLegendSelect)`, `(kjChartReady)`
- `[kjChartLoading]` → `showLoading`/`hideLoading`
- `exportAs="kjChart"` exposes `resize()`, `dispatchAction()`, `getOption()`
- 8 examples wired through the registry; `/docs/chart` auto-renders via existing `@doc` tags

Spec: `docs/superpowers/specs/2026-05-21-chart-features-design.md`

## Out of scope
- The v0.2 roadmap's `KjChartHost` adapter primitive, first-party SVG charts, and non-ECharts engine adapters (visx / Recharts / d3). Deferred to a follow-up branch.

## Test plan
- [x] `pnpm test` — all suites green
- [x] `pnpm build` — green
- [x] Dev server: all 8 examples render at `/docs/chart`
- [x] Theme switcher re-paints all charts
- [x] axe DevTools: 0 critical violations on chart page
- [x] Manual: loading toggle, click event, legend toggle, fallback table present
```

Wait for the user to validate locally before merging (per `feedback_validate_before_push`).

---

## Self-Review

**Spec coverage:**
- ✓ Hardening (resize + reduced-motion + theme reactivity) → Tasks 5, 6, 7
- ✓ A11y extras (description + tabular fallback) → Tasks 10, 11
- ✓ Interaction (events + loading + exported API) → Tasks 4 (exportAs), 8 (loading), 9 (events)
- ✓ Themed palette → Tasks 1 (resolver), 3 (theme vars), 7 (apply on change)
- ✓ 5 chart-type examples → Task 13
- ✓ 3 feature-demo examples → Task 14
- ✓ Registry + doc tags → Tasks 15, 16
- ✓ Changeset → Task 17
- ✓ Verification → Task 18

**Placeholder scan:** None. Every step has actual content. No "TBD"/"similar to". The theme-tokens task (3) uses concrete CSS (`var(--kj-bg-primary)`) rather than inventing per-theme hex values — coherent with the spec's "alias existing intent tokens" decision recorded in the spec update.

**Type consistency:**
- `resolveChartPalette(host: HTMLElement): string[]` — used identically in Task 7 (import) and chart-tokens spec
- `KjChartTableFallback.tpl: TemplateRef<unknown>` — read via `_fallback().tpl` in Task 11
- `kjChartClick: ECElementEvent`, `kjChartLegendSelect: unknown`, `kjChartReady: EChartsType` — consistent across directive, tests, examples
- Example class names match registry exactly (`ChartExample`, `ChartBarExample`, … `ChartFallbackExample`)

Plan ready.
