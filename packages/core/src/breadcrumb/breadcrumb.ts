import {
  Directive,
  Signal,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  signal,
} from '@angular/core';
import { KjSize, bindPresets } from '../presets';
import { KJ_BREADCRUMB_CONFIG } from './config';
import {
  KJ_BREADCRUMB,
  KjBreadcrumbContext,
  KjBreadcrumbItemContext,
} from './breadcrumb.context';

/** @internal Internal entry stored in the items signal. */
interface KjBreadcrumbItemEntry {
  indexSignal: ReturnType<typeof signal<number>>;
  context?: KjBreadcrumbItemContext;
}

/**
 * Root of the Breadcrumb directive family. Owns the `<nav>` landmark, the
 * `aria-label`, the registered-items model, the truncation algorithm, and
 * the "exactly one current crumb, last in document order" invariant.
 *
 * Applied to a `<nav>` element. The selector restriction
 * (`nav[kjBreadcrumb]`) keeps the landmark's host element honest — attaching
 * `kjBreadcrumb` to a `<div>` will simply not match.
 *
 * @example
 * ```html
 * <nav kjBreadcrumb>
 *   <ol kjBreadcrumbList>
 *     <li kjBreadcrumbItem><a kjBreadcrumbLink href="/">Home</a></li>
 *     <li kjBreadcrumbItem><a kjBreadcrumbLink href="/library">Library</a></li>
 *     <li kjBreadcrumbItem><span kjBreadcrumbCurrent>Data</span></li>
 *   </ol>
 * </nav>
 * ```
 *
 * @category Core/Navigation
 */
@Directive({
  selector: '[kjBreadcrumb]',
  standalone: true,
  exportAs: 'kjBreadcrumb',
  hostDirectives: [{ directive: KjSize, inputs: ['kjSize'] }],
  providers: [
    { provide: KJ_BREADCRUMB, useExisting: KjBreadcrumb },
    ...bindPresets(KJ_BREADCRUMB_CONFIG),
  ],
  host: {
    '[attr.aria-label]': 'effectiveAriaLabel()',
    '[attr.data-overflow]': 'kjOverflow()',
    '[style.--kj-breadcrumb-separator-content]': 'separatorCss()',
  },
})
export class KjBreadcrumb implements KjBreadcrumbContext {
  /** @internal */
  readonly config = inject(KJ_BREADCRUMB_CONFIG);

  /** Override for the `<nav>` `aria-label`. Defaults to `"Breadcrumb"`. */
  readonly kjAriaLabel = input<string | undefined>(undefined);

  /**
   * Separator glyph rendered by the CSS pseudo-element on each non-first
   * item. Defaults to `'/'`. When the consumer renders explicit
   * `<li kjBreadcrumbSeparator>` cells, the auto separator is suppressed.
   */
  readonly kjSeparator = input<string | undefined>(undefined);

  /**
   * Maximum number of items to render before truncation. Default `4`. Set
   * to `0` (or `Infinity`) to disable truncation regardless of item count.
   */
  readonly kjMaxItems = input<number>(this.config.defaults.maxItems);

  /**
   * Overflow strategy when item count exceeds `kjMaxItems`.
   *
   * - `'truncate'` (default): the ellipsis cell renders as plain `<span>`.
   * - `'menu'`: the ellipsis becomes a `<button>` (consumers wire a
   *   `KjDropdownMenu` to expose the hidden crumbs).
   * - `'none'`: no truncation; all crumbs render.
   */
  readonly kjOverflow = input<'truncate' | 'menu' | 'none'>(this.config.defaults.overflow);

  // ── Registered children (item / current / separator counts) ─────────────
  private readonly _items = signal<readonly KjBreadcrumbItemEntry[]>([]);
  private readonly _currents = signal<number>(0);
  private readonly _separators = signal<number>(0);

  /** Read-only count of registered items. */
  readonly itemCount: Signal<number> = computed(() => this._items().length);

  /** Read-only count of registered explicit `KjBreadcrumbCurrent` cells. */
  readonly currentCount: Signal<number> = computed(() => this._currents());

  /** Whether the consumer has rendered explicit separator cells. */
  readonly hasExplicitSeparators: Signal<boolean> = computed(() => this._separators() > 0);

  /** The configured separator glyph (input wins over config default). */
  readonly separator: Signal<string | undefined> = computed(() => this.kjSeparator());

  /** Effective `kjMaxItems` exposed to descendants. */
  readonly maxItems: Signal<number> = computed(() => this.kjMaxItems());

  /** Effective overflow mode exposed to descendants. */
  readonly overflow: Signal<'truncate' | 'menu' | 'none'> = computed(() => this.kjOverflow());

  /** Indices that should render visibly. */
  readonly visibleIndices: Signal<readonly number[]> = computed(() => {
    const total = this._items().length;
    const max = this.kjMaxItems();
    if (total === 0) return [];
    if (this.kjOverflow() === 'none' || max <= 0 || !Number.isFinite(max) || total <= max) {
      return Array.from({ length: total }, (_, i) => i);
    }
    // First crumb + last (max - 2) crumbs visible (the rest collapse).
    const tailCount = Math.max(0, max - 2);
    const visible: number[] = [0];
    for (let i = total - tailCount; i < total; i++) {
      if (i > 0) visible.push(i);
    }
    return visible;
  });

  /** Indices hidden by truncation. */
  readonly hiddenIndices: Signal<readonly number[]> = computed(() => {
    const total = this._items().length;
    const visible = new Set(this.visibleIndices());
    const hidden: number[] = [];
    for (let i = 0; i < total; i++) {
      if (!visible.has(i)) hidden.push(i);
    }
    return hidden;
  });

  /**
   * The `aria-label` actually applied to the `<nav>`. When truncation is
   * active and overflow mode is `'truncate'`, the count of hidden items is
   * appended so AT users learn the truncation occurred.
   */
  protected readonly effectiveAriaLabel = computed(() => {
    const explicit = this.kjAriaLabel();
    const hidden = this.hiddenIndices().length;
    if (explicit) return explicit;
    if (hidden > 0 && this.kjOverflow() === 'truncate') {
      return this.config.truncatedAriaLabel(this.visibleIndices().length, hidden);
    }
    return this.config.defaults.ariaLabel;
  });

  /** CSS custom-property value for the separator (so the `::before` reads it). */
  protected readonly separatorCss = computed(() => {
    const sep = this.kjSeparator();
    return sep === undefined ? null : `'${sep.replace(/'/gu, "\\'")}'`;
  });

  constructor() {
    if (isDevMode()) {
      effect(() => {
        const total = this._items().length;
        const currents = this._currents();
        if (total === 0) return;
        if (currents > 1) {
          console.warn(
            `[kj] KjBreadcrumb: ${currents} KjBreadcrumbCurrent instances registered; expected 0 or 1. The first wins.`,
          );
        }
      });
    }
  }

  /** @internal */
  registerItem(): KjBreadcrumbItemContext {
    const indexSignal = signal<number>(this._items().length);
    const entry: KjBreadcrumbItemEntry = { indexSignal };
    this._items.update((arr) => [...arr, entry]);
    this._items().forEach((it, i) => it.indexSignal.set(i));

    const ctx: KjBreadcrumbItemContext = {
      index: indexSignal.asReadonly(),
      current: computed(() => this.computeItemCurrent(indexSignal())),
      hidden: computed(() => this.hiddenIndices().includes(indexSignal())),
    };
    entry.context = ctx;
    return ctx;
  }

  /** @internal */
  unregisterItem(item: KjBreadcrumbItemContext): void {
    this._items.update((arr) => arr.filter((e) => e.context !== item));
    this._items().forEach((it, i) => it.indexSignal.set(i));
  }

  /** @internal */
  registerCurrent(): void {
    this._currents.update((n) => n + 1);
  }

  /** @internal */
  unregisterCurrent(): void {
    this._currents.update((n) => Math.max(0, n - 1));
  }

  /** @internal */
  registerSeparator(): void {
    this._separators.update((n) => n + 1);
  }

  /** @internal */
  unregisterSeparator(): void {
    this._separators.update((n) => Math.max(0, n - 1));
  }

  /**
   * Auto-current rule: an item is current when it is the last item AND no
   * explicit `KjBreadcrumbCurrent` is registered anywhere in the tree.
   */
  private computeItemCurrent(index: number): boolean {
    const total = this._items().length;
    if (total === 0) return false;
    if (this._currents() > 0) return false;
    return index === total - 1;
  }
}
