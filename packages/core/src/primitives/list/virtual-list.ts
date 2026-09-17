// packages/core/src/primitives/list/virtual-list.ts
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';

/** Attribute a windowed row carries so the engine can measure one of them. */
export const KJ_VIRTUAL_INDEX_ATTR = 'data-kj-virtual-index';

/** Fallback row height, in px, before anything has been measured. */
const DEFAULT_ITEM_SIZE = 36;

/**
 * Height of the first element under `el` that actually has a box. A row
 * marker is usually a `display: contents` wrapper (so it adds nothing to the
 * layout), and a themed row component's host is often another one, so the
 * measurement descends past them rather than reading a 0 and giving up.
 */
function boxHeight(el: HTMLElement | null): number {
  let node: HTMLElement | null = el;
  for (let depth = 0; node && depth < 4; depth++) {
    if (node.offsetHeight > 0) return node.offsetHeight;
    node = node.firstElementChild as HTMLElement | null;
  }
  return 0;
}

/**
 * The slice of a dataset a windowed list currently renders, plus the spacer
 * sizes that keep the scrollbar honest about the rows that are not there.
 *
 * @doc-category Core/Primitives
 */
export interface KjListWindow {
  /** First rendered index, inclusive. */
  readonly start: number;
  /** One past the last rendered index. `start === end` means nothing renders. */
  readonly end: number;
  /** Height in px to reserve above the first rendered row. */
  readonly paddingTop: number;
  /** Height in px to reserve below the last rendered row. */
  readonly paddingBottom: number;
  /** Height in px of the whole dataset. */
  readonly totalSize: number;
  /** Whether windowing is actually in effect (`false` renders the full list). */
  readonly windowed: boolean;
}

/**
 * Fixed-row windowing for a list-style popup — the combobox listbox and the
 * command-palette list. Hosted on the **scroll container**; the consumer
 * renders `items.slice(w.start, w.end)` and reserves `paddingTop` /
 * `paddingBottom`, so a 5 000-option list mounts one row per visible line
 * instead of 5 000 `KjListItem` directives with their element injectors.
 *
 * **Why not `@tanstack/virtual-core`.** The table's virtualizer
 * (`KjTableVirtual`) measures every row, because table rows wrap text and
 * carry expansion rows of their own. Listbox rows are uniform by
 * construction — one row, one line, one height — so the window is exact
 * arithmetic over a single measured row height. That keeps
 * `@kouji-ui/core` free of an optional peer dependency and keeps the engine
 * synchronous, which is what lets keyboard navigation move the window and
 * read back the new range in the same turn.
 *
 * **Row height** comes from `kjVirtualItemSize` when given, else from
 * measuring the first rendered row (so a density change is picked up), else
 * from a 36px fallback. Rows must carry {@link KJ_VIRTUAL_INDEX_ATTR} for
 * the measurement to find one.
 *
 * **Before measurement** — on the server and for the first client paint —
 * the first `kjVirtualInitialRows` rows are exposed at the fallback size, so
 * prerendered HTML carries real rows rather than an empty listbox.
 *
 * Pair with {@link KjListVirtualSource} so `KjListNavigator` keeps walking
 * the whole dataset by index while only a window of rows exists.
 *
 * @example
 * ```html
 * <div kjListVirtual #w="kjListVirtual" [kjVirtualCount]="rows().length" class="scroller">
 *   <div [style.height.px]="w.window().totalSize">
 *     <div [style.transform]="'translateY(' + w.window().paddingTop + 'px)'">
 *       @for (row of windowed(); track row.id) { <div [attr.data-kj-virtual-index]="row.i">…</div> }
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * @doc-category Core/Primitives
 */
@Directive({
  selector: '[kjListVirtual]',
  exportAs: 'kjListVirtual',
  standalone: true,
})
export class KjListVirtual {
  /** Number of rows in the full dataset (after any consumer-side filtering). */
  readonly kjVirtualCount = input<number, unknown>(0, { transform: numberAttribute });
  /** Row height in px. `0` (the default) measures the first rendered row instead. */
  readonly kjVirtualItemSize = input<number, unknown>(0, { transform: numberAttribute });
  /** Extra rows rendered above and below the visible window. */
  readonly kjVirtualOverscan = input<number, unknown>(6, { transform: numberAttribute });
  /** Turn windowing off — the window then spans the whole dataset. */
  readonly kjVirtualEnabled = input(true, { transform: booleanAttribute });
  /** Rows exposed before the viewport is measured (server + first paint). */
  readonly kjVirtualInitialRows = input<number, unknown>(20, { transform: numberAttribute });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Scroll offset the window is computed from. Owned here rather than read
   * back from the DOM on demand: `scrollToIndex` writes it first and pushes
   * it to the element second, so a keyboard move can render the row it just
   * activated within the same change-detection turn.
   */
  private readonly _scrollTop = signal(0);
  private readonly _viewport = signal(0);
  private readonly _measured = signal(0);
  private readonly _mounted = signal(false);

  /** `true` once the viewport has been measured on the client. */
  readonly mounted = this._mounted.asReadonly();

  /** Effective row height in px: explicit input, else measured, else 36. */
  readonly itemSize = computed(
    () => this.kjVirtualItemSize() || this._measured() || DEFAULT_ITEM_SIZE,
  );

  /**
   * The rows to render right now, with the spacer sizes that stand in for
   * the rest. `windowed: false` means the consumer should render everything
   * (windowing disabled, or an empty dataset).
   */
  readonly window = computed<KjListWindow>(() => {
    const count = Math.max(0, Math.floor(this.kjVirtualCount()));
    if (!this.kjVirtualEnabled() || count === 0) {
      return { start: 0, end: count, paddingTop: 0, paddingBottom: 0, totalSize: 0, windowed: false };
    }
    const size = this.itemSize();
    const total = count * size;

    if (!this._mounted()) {
      const n = Math.max(0, Math.min(count, Math.floor(this.kjVirtualInitialRows())));
      return {
        start: 0,
        end: n,
        paddingTop: 0,
        paddingBottom: (count - n) * size,
        totalSize: total,
        windowed: true,
      };
    }

    const overscan = Math.max(0, Math.floor(this.kjVirtualOverscan()));
    // A viewport that measures zero — jsdom, `display: none`, a panel that
    // has not been laid out yet — would otherwise render nothing at all.
    const viewport = this._viewport() > 0
      ? this._viewport()
      : Math.max(1, Math.floor(this.kjVirtualInitialRows())) * size;
    const offset = Math.min(Math.max(0, this._scrollTop()), Math.max(0, total - viewport));
    const start = Math.max(0, Math.floor(offset / size) - overscan);
    const end = Math.min(count, Math.ceil((offset + viewport) / size) + overscan);
    return {
      start,
      end,
      paddingTop: start * size,
      paddingBottom: Math.max(0, total - end * size),
      totalSize: total,
      windowed: true,
    };
  });

  constructor() {
    afterNextRender(() => this.attach());

    // Row height: measure one rendered row per render pass. Cheap (one
    // `offsetHeight` read on an element the browser has already laid out)
    // and it follows density / font-size changes without a per-row observer.
    afterRenderEffect(() => {
      if (!this._mounted()) return;
      // Re-measure whenever the window moved — a fresh row may be a
      // different height after a density change.
      this.window();
      const row = this.el.nativeElement.querySelector<HTMLElement>(`[${KJ_VIRTUAL_INDEX_ATTR}]`);
      const h = boxHeight(row);
      if (h > 0 && h !== this._measured()) this._measured.set(h);
    });
  }

  /**
   * Bring `index` into the rendered window, scrolling the container the
   * shortest distance that makes the row visible. Called by a
   * {@link KjListVirtualSource} after every keyboard move, so the active row
   * always exists in the DOM and `aria-activedescendant` never points at a
   * missing id.
   */
  scrollToIndex(index: number): void {
    const count = Math.max(0, Math.floor(this.kjVirtualCount()));
    if (count === 0) return;
    const i = Math.min(Math.max(0, Math.floor(index)), count - 1);
    const size = this.itemSize();
    const viewport = this._viewport() > 0
      ? this._viewport()
      : Math.max(1, Math.floor(this.kjVirtualInitialRows())) * size;
    const top = i * size;
    const bottom = top + size;
    const current = this._scrollTop();
    let next = current;
    if (top < current) next = top;
    else if (bottom > current + viewport) next = bottom - viewport;
    next = Math.min(Math.max(0, next), Math.max(0, count * size - viewport));
    if (next === current) return;
    this._scrollTop.set(next);
    if (this.isBrowser) this.el.nativeElement.scrollTop = next;
  }

  /** Reset the window to the top — what a new query does. */
  scrollToStart(): void {
    if (this._scrollTop() === 0) return;
    this._scrollTop.set(0);
    if (this.isBrowser) this.el.nativeElement.scrollTop = 0;
  }

  private attach(): void {
    if (!this.isBrowser) return;
    const host = this.el.nativeElement;
    const view = host.ownerDocument?.defaultView ?? this.document.defaultView;
    this._viewport.set(host.clientHeight);
    this._scrollTop.set(host.scrollTop);
    this._mounted.set(true);

    // Scroll is coalesced to one read per frame: the listener only records
    // that a frame is pending, and the frame does the single DOM read.
    let frame = 0;
    const onScroll = (): void => {
      if (frame) return;
      frame = view?.requestAnimationFrame(() => {
        frame = 0;
        this._scrollTop.set(host.scrollTop);
      }) ?? 0;
      if (!frame) this._scrollTop.set(host.scrollTop);
    };
    host.addEventListener('scroll', onScroll, { passive: true });

    const RO = view?.ResizeObserver;
    const ro = RO ? new RO(() => this._viewport.set(host.clientHeight)) : null;
    ro?.observe(host);

    this.destroyRef.onDestroy(() => {
      host.removeEventListener('scroll', onScroll);
      if (frame) view?.cancelAnimationFrame(frame);
      ro?.disconnect();
    });
  }
}
