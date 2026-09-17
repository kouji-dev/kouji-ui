import {
  DestroyRef,
  Directive,
  ElementRef,
  ErrorHandler,
  PendingTasks,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import type { Virtualizer } from '@tanstack/virtual-core';
import { loadVirtualCore, type KjVirtualCore } from './virtual-core.loader';

/**
 * Attribute a sibling element immediately after a measured row may carry so
 * its height is folded into that row's measurement — the expansion row of a
 * master / detail table.
 */
export const KJ_VIRTUAL_EXTRA_ATTR = 'data-kj-virtual-extra';

/**
 * A windowed row as exposed by `KjTableVirtual.virtualRows()`: the shape of
 * `@tanstack/virtual-core`'s `VirtualItem`, declared here so the public
 * typings do not depend on that optional peer.
 */
export interface KjVirtualRow {
  /** Index of the row in the dataset. */
  readonly index: number;
  /** Stable key for `@for` tracking. */
  readonly key: string | number | bigint;
  /** Offset of the row's top edge from the start of the virtual content, in px. */
  readonly start: number;
  /** Offset of the row's bottom edge, in px. */
  readonly end: number;
  /** Measured (or estimated) height, in px. */
  readonly size: number;
  /** Lane index (always 0 for a single-column list). */
  readonly lane: number;
}

/**
 * Mounts a `@tanstack/virtual-core` `Virtualizer` on the host element (the
 * scroll container — typically a wrapper around the table or a tbody-level
 * scroll viewport) and exposes the windowed row list plus top/bottom spacer
 * sizes as signals.
 *
 * Consumers (the styled `<kj-table>` root) read `virtualRows()`,
 * `paddingTop()`, `paddingBottom()` and `totalSize()` to render only the
 * visible window of rows and reserve scrollback/scrollahead space with
 * spacer elements.
 *
 * Rows are measured: every rendered row marked with `[kjTableVirtualItem]`
 * hands its element to `measureItem()`, which registers it with the
 * virtualizer's `ResizeObserver`, so wrapped text, density changes and custom
 * cell templates feed real heights back into the offsets. A sibling that
 * immediately follows a row and carries `data-kj-virtual-extra` (the
 * expansion row) is folded into that row's height. `kjEstimateSize` is only
 * the pre-measurement estimate.
 *
 * `@tanstack/virtual-core` is an optional peer dependency, imported as its own
 * chunk after the first render — only a table that virtualizes pays for it,
 * and an install that lacks it reports a clear error through `ErrorHandler`
 * while the seeded window keeps rendering. The load holds an Angular pending
 * task, so `ApplicationRef.isStable` waits for it. Until the virtualizer is
 * mounted — on the server, and for the first client paint — the first
 * `kjInitialRows` rows are exposed at the estimated size, so prerendered HTML
 * carries real rows instead of an empty body. The teardown returned by
 * `_didMount()` is wired through `DestroyRef`.
 *
 * @example
 * ```html
 * <div
 *   kjTableVirtual
 *   [kjCount]="rows().length"
 *   [kjEstimateSize]="36"
 *   [kjOverscan]="8"
 *   class="kj-table-virtual-scroll"
 *   #v="kjTableVirtual"
 * >
 *   <div [style.height.px]="v.totalSize()">
 *     <div [style.transform]="'translateY(' + v.paddingTop() + 'px)'">
 *       @for (vr of v.virtualRows(); track vr.key) {
 *         <div [kjTableVirtualItem]="vr.index" [kjVirtualOwner]="v"><!-- row vr.index --></div>
 *       }
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * Documented as part of the data table on the `table` page — not a standalone
 * docs entry.
 */
@Directive({
  selector: '[kjTableVirtual]',
  standalone: true,
  exportAs: 'kjTableVirtual',
})
export class KjTableVirtual {
  /** Total number of rows in the underlying dataset. */
  readonly kjCount = input.required<number>();
  /** Estimated px height of a single row, used before measurement. */
  readonly kjEstimateSize = input<number>(36);
  /** Extra rows rendered above and below the visible window. */
  readonly kjOverscan = input<number>(5);
  /** Rows exposed before the virtualizer mounts — the server-rendered window. Default 20. */
  readonly kjInitialRows = input<number>(20);

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly errorHandler = inject(ErrorHandler);

  private virtualizer: Virtualizer<HTMLElement, HTMLElement> | null = null;
  private destroyed = false;

  // Writable backing signals; exposed read-only via `asReadonly()` below.
  private readonly _mounted = signal(false);
  private readonly _virtualRows = signal<KjVirtualRow[]>([]);
  private readonly _totalSize = signal<number>(0);
  private readonly _paddingTop = signal<number>(0);
  private readonly _paddingBottom = signal<number>(0);

  /** Window exposed before the virtualizer attaches: the first `kjInitialRows` rows at the estimated size. */
  private readonly seeded = computed(() => {
    const count = Math.max(0, this.kjCount());
    const size = this.kjEstimateSize();
    const n = Math.max(0, Math.min(count, Math.floor(this.kjInitialRows())));
    const rows: KjVirtualRow[] = [];
    for (let i = 0; i < n; i++) {
      rows.push({ index: i, key: i, start: i * size, size, end: (i + 1) * size, lane: 0 });
    }
    return { rows, total: count * size, bottom: (count - n) * size };
  });

  /** `true` once the virtualizer is attached to the scroll container (client, after the first render). */
  readonly mounted = this._mounted.asReadonly();
  /** Windowed rows currently visible (plus overscan). */
  readonly virtualRows = computed<KjVirtualRow[]>(() =>
    this._mounted() ? this._virtualRows() : this.seeded().rows,
  );
  /** Total px size of the virtual content (used to size the inner spacer). */
  readonly totalSize = computed<number>(() =>
    this._mounted() ? this._totalSize() : this.seeded().total,
  );
  /** Top spacer height in px (offset of the first virtual row). */
  readonly paddingTop = computed<number>(() => (this._mounted() ? this._paddingTop() : 0));
  /** Bottom spacer height in px (totalSize − end of last virtual row). */
  readonly paddingBottom = computed<number>(() =>
    this._mounted() ? this._paddingBottom() : this.seeded().bottom,
  );

  constructor() {
    afterNextRender(() => {
      void this.mount();
    });
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });

    // Re-apply options when inputs change. The first run is a no-op because
    // `virtualizer` is null until `mount()` attaches after the first render.
    effect(() => {
      const count = this.kjCount();
      const estimate = this.kjEstimateSize();
      const overscan = this.kjOverscan();
      const v = this.virtualizer;
      if (!v) return;
      v.setOptions({
        ...v.options,
        count,
        estimateSize: () => estimate,
        overscan,
      });
      this.sync();
    });
  }

  /**
   * Measure a rendered row (an element carrying `data-index`) and keep it
   * observed for size changes. No-op before the virtualizer mounts.
   * @param el The row's host element.
   */
  measureItem(el: HTMLElement): void {
    this.virtualizer?.measureElement(el);
  }

  /**
   * Imports the peer (its own chunk) and attaches the virtualizer. Stability
   * waits for the import; a missing peer is reported, not thrown into the
   * render, so the seeded window keeps the table usable.
   */
  private async mount(): Promise<void> {
    const done = this.pendingTasks.add();
    try {
      const core = await loadVirtualCore();
      if (this.destroyed) return;
      this.attach(core);
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      done();
    }
  }

  private attach({ Virtualizer, elementScroll, observeElementOffset, observeElementRect }: KjVirtualCore): void {
    // The virtualizer needs the actual SCROLLABLE ancestor — not the `<tbody>`
    // host, which doesn't scroll in a normal table. We deterministically pick
    // the wrapper's `.kj-table-body` (always present, always the scroller in
    // our table structure) rather than probing computed `overflow-y` at mount
    // time — `getComputedStyle` occasionally returns the pre-flex-applied
    // values from `afterNextRender`, which made the walk miss the scroller
    // and fall back to the 0-height tbody, breaking virtualization entirely.
    // The computed-style walk stays as a secondary fallback for consumers who
    // ever embed `KjTableVirtual` outside a `kj-table`.
    const scrollEl =
      this.host.closest('.kj-table-body') as HTMLElement | null
      ?? this.findScrollAncestor()
      ?? this.host;
    const v = new Virtualizer<HTMLElement, HTMLElement>({
      count: this.kjCount(),
      getScrollElement: () => scrollEl,
      estimateSize: () => this.kjEstimateSize(),
      overscan: this.kjOverscan(),
      scrollToFn: elementScroll,
      observeElementOffset,
      observeElementRect,
      measureElement: (el, entry) => this.measureRow(el, entry),
      onChange: () => this.sync(),
    });
    this.virtualizer = v;
    const teardown = v._didMount();
    this.destroyRef.onDestroy(() => {
      teardown();
      this.virtualizer = null;
    });
    this.sync();
    this._mounted.set(true);
  }

  /**
   * Height of a row plus its `data-kj-virtual-extra` sibling, if any. A
   * zero reading (no layout yet) keeps the estimate so a row never collapses.
   */
  private measureRow(el: HTMLElement, entry: ResizeObserverEntry | undefined): number {
    const box = entry?.borderBoxSize?.[0];
    let size = box ? Math.round(box.blockSize) : el.offsetHeight;
    const next = el.nextElementSibling as HTMLElement | null;
    if (next?.hasAttribute(KJ_VIRTUAL_EXTRA_ATTR)) size += next.offsetHeight;
    return size > 0 ? size : this.kjEstimateSize();
  }

  /**
   * Walk the ancestor chain looking for the first element whose computed
   * `overflow-y` is `auto` or `scroll`. Returns `null` if none found (the
   * caller falls back to the host element).
   */
  private findScrollAncestor(): HTMLElement | null {
    let el: HTMLElement | null = this.host.parentElement;
    const doc = this.host.ownerDocument;
    const view = doc.defaultView;
    while (el && el !== doc.body) {
      const style = view?.getComputedStyle(el);
      if (!style) break;
      const oy = style.overflowY;
      if (oy === 'auto' || oy === 'scroll') return el;
      el = el.parentElement;
    }
    return null;
  }

  private sync(): void {
    const v = this.virtualizer;
    if (!v) return;
    v._willUpdate();
    const items = v.getVirtualItems();
    const total = v.getTotalSize();
    this._virtualRows.set(items);
    this._totalSize.set(total);
    if (items.length === 0) {
      this._paddingTop.set(0);
      this._paddingBottom.set(0);
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    this._paddingTop.set(first.start);
    this._paddingBottom.set(Math.max(0, total - (last.start + last.size)));
  }
}
