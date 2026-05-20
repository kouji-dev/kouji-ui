import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type VirtualItem,
} from '@tanstack/virtual-core';

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
 * The virtualizer is mounted after the first render so the host element is
 * laid out before `observeElementRect` / `observeElementOffset` attach. The
 * teardown returned by `_didMount()` is wired through `DestroyRef`.
 *
 * @example
 * ```html
 * <div
 *   KjTableVirtual
 *   [kjCount]="rows().length"
 *   [kjEstimateSize]="36"
 *   [kjOverscan]="8"
 *   class="kj-table-virtual-scroll"
 *   #v="KjTableVirtual"
 * >
 *   <div [style.height.px]="v.totalSize()">
 *     <div [style.transform]="'translateY(' + v.paddingTop() + 'px)'">
 *       @for (vr of v.virtualRows(); track vr.key) {
 *         <!-- render row at index vr.index -->
 *       }
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * @doc-category Components/Data
 * @doc
 * @doc-name table-virtual
 * @doc-description Row virtualization adapter on @tanstack/virtual-core. Exposes virtualRows / paddingTop / paddingBottom / totalSize signals for the styled data table.
 */
@Directive({
  selector: '[KjTableVirtual]',
  standalone: true,
  exportAs: 'KjTableVirtual',
})
export class KjTableVirtual {
  /** Total number of rows in the underlying dataset. */
  readonly kjCount = input.required<number>();
  /** Estimated px height of a single row, used before measurement. */
  readonly kjEstimateSize = input<number>(36);
  /** Extra rows rendered above and below the visible window. */
  readonly kjOverscan = input<number>(5);

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly destroyRef = inject(DestroyRef);

  private virtualizer: Virtualizer<HTMLElement, HTMLElement> | null = null;

  // Writable backing signals; exposed read-only via `asReadonly()` below.
  private readonly _virtualRows = signal<VirtualItem[]>([]);
  private readonly _totalSize = signal<number>(0);
  private readonly _paddingTop = signal<number>(0);
  private readonly _paddingBottom = signal<number>(0);

  /** Windowed `VirtualItem`s currently visible (plus overscan). */
  readonly virtualRows = this._virtualRows.asReadonly();
  /** Total px size of the virtual content (used to size the inner spacer). */
  readonly totalSize = this._totalSize.asReadonly();
  /** Top spacer height in px (offset of the first virtual row). */
  readonly paddingTop = this._paddingTop.asReadonly();
  /** Bottom spacer height in px (totalSize − end of last virtual row). */
  readonly paddingBottom = this._paddingBottom.asReadonly();

  constructor() {
    afterNextRender(() => this.mount());

    // Re-apply options when inputs change. The first run is a no-op because
    // `virtualizer` is null until `mount()` runs after the first render.
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

  private mount(): void {
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
      onChange: () => this.sync(),
    });
    this.virtualizer = v;
    const teardown = v._didMount();
    this.destroyRef.onDestroy(() => {
      teardown();
      this.virtualizer = null;
    });
    this.sync();
  }

  /**
   * Walk the ancestor chain looking for the first element whose computed
   * `overflow-y` is `auto` or `scroll`. Returns `null` if none found (the
   * caller falls back to the host element).
   */
  private findScrollAncestor(): HTMLElement | null {
    let el: HTMLElement | null = this.host.parentElement;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
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
