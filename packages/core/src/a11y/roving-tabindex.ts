import {
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  InjectionToken,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { isElementVisible } from './focus-trap';

/** Axis the arrow keys move along inside a `[kjRovingTabindex]` group. */
export type KjRovingOrientation = 'horizontal' | 'vertical' | 'both';

/** Context token for roving tabindex coordination. */
export const KJ_ROVING_TABINDEX = new InjectionToken<KjRovingTabindex>(
  'KjRovingTabindex',
);

/**
 * Default orientation a composing container pins for the `KjRovingTabindex`
 * it hosts, as a getter so it can follow the container's own orientation
 * signal. A `kjRovingOrientation` binding in a template still wins. Resolved
 * on the primitive's own element only, so a nested group never inherits it.
 *
 * @example
 * ```ts
 * providers: [{ provide: KJ_ROVING_ORIENTATION_DEFAULT, useFactory: () => injectParent(KJ_TABS, { child: 'KjTabList', parent: '[kjTabs]' }).orientation }]
 * ```
 * @doc-category Core/Accessibility
 */
export const KJ_ROVING_ORIENTATION_DEFAULT = new InjectionToken<() => KjRovingOrientation>(
  'KJ_ROVING_ORIENTATION_DEFAULT',
);

/**
 * Marks an individual item within a `[kjRovingTabindex]` container.
 * Its `tabindex` is managed automatically by the parent directive.
 *
 * An item is skipped by arrow-key navigation, and never becomes the tab stop
 * on its own, while `kjRovingItemDisabled` is true, while its host is natively
 * `disabled` or carries `aria-disabled="true"`, or while it is hidden.
 *
 * @example
 * ```html
 * <button kjRovingTabindexItem>Item</button>
 * <button kjRovingTabindexItem [kjRovingActive]="isSelected()">Selected item</button>
 * ```
 * @doc-category Core/Accessibility
 * @doc
 * @doc-name a11y
 */
@Directive({
  selector: '[kjRovingTabindexItem]',
  standalone: true,
  host: {
    '[attr.tabindex]': 'active() ? "0" : "-1"',
  },
})
export class KjRovingTabindexItem {
  /** @internal */
  readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly active = signal(false);

  /** Excludes the item from arrow-key navigation. Default `false`. */
  readonly kjRovingItemDisabled = input(false, { transform: booleanAttribute });

  /**
   * Makes this item the group's tab stop when it turns `true` — bind the
   * selected state so Tab lands on the selected item, per the APG. Default `false`.
   */
  readonly kjRovingActive = input(false, { transform: booleanAttribute });

  constructor() {
    // Registration is by DI, NOT by a content query on the container: a styled
    // wrapper (`<kj-tab>`) renders its item inside its OWN view, and a content
    // query cannot cross that boundary. Querying left every item at
    // tabindex="-1" whenever the wrappers were used — i.e. in every app — so
    // the tab strip could not be reached by keyboard at all.
    const parent = inject(KJ_ROVING_TABINDEX, { optional: true });
    if (!parent) return;
    parent.register(this);
    inject(DestroyRef).onDestroy(() => parent.unregister(this));
    effect(() => {
      if (this.kjRovingActive()) parent.setActive(this);
    });
  }

  /** @internal Whether arrow keys may land on this item right now. */
  isNavigable(): boolean {
    if (this.kjRovingItemDisabled()) return false;
    const el = this.el.nativeElement;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    if ((el as HTMLButtonElement).disabled === true) return false;
    try {
      if (el.matches(':disabled')) return false;
    } catch {
      /* selector unsupported */
    }
    return isElementVisible(el);
  }
}

/**
 * Implements the roving tabindex pattern for composite widgets such as toolbars and tab lists.
 * Only one item has `tabindex="0"` at a time; arrow keys move focus between items.
 *
 * The tab stop starts on the first navigable item and follows focus. Seed it
 * to the selected item with `setActive()` or the item's `kjRovingActive`
 * input. When the active item is removed, the tab stop moves to its nearest
 * remaining neighbour — and so does focus, if the removed item had it.
 *
 * Under a horizontal axis, ArrowLeft / ArrowRight are swapped when the
 * nearest `dir` attribute resolves to `rtl`.
 *
 * @example
 * ```html
 * <div kjRovingTabindex role="toolbar" aria-label="Formatting">
 *   <button kjRovingTabindexItem>Bold</button>
 *   <button kjRovingTabindexItem>Italic</button>
 * </div>
 * ```
 * @doc-category Core/Accessibility
 * @doc
 * @doc-name a11y
 */
@Directive({
  selector: '[kjRovingTabindex]',
  standalone: true,
  providers: [{ provide: KJ_ROVING_TABINDEX, useExisting: forwardRef(() => KjRovingTabindex) }],
  host: {
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class KjRovingTabindex {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly doc = inject(DOCUMENT);
  private readonly orientationDefault = inject(KJ_ROVING_ORIENTATION_DEFAULT, {
    self: true,
    optional: true,
  });

  // Registration mutates a plain array and bumps a version: n items mounting
  // cost O(n), and the DOM-order sort below runs once per read, not per item.
  private readonly registered: KjRovingTabindexItem[] = [];
  private readonly version = signal(0);
  /** Items in DOM order — registration order follows creation, which a
   *  re-order (`@for` with a changing track) does not preserve. */
  private readonly items = computed(
    () => {
      this.version();
      return [...this.registered].sort((a, b) =>
        a.el.nativeElement.compareDocumentPosition(b.el.nativeElement) &
        Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      );
    },
    { equal: (a, b) => a.length === b.length && a.every((item, i) => item === b[i]) },
  );
  private readonly activeItem = signal<KjRovingTabindexItem | null>(null);
  /** Where the active item sat before it was removed — the clamp target. */
  private lastActiveIndex = 0;
  /** Focus is inside the group; stays true while the focused item is being removed. */
  private focusWithin = false;

  /**
   * Restricts arrow-key navigation to a single axis.
   * - `'horizontal'`: only ArrowLeft / ArrowRight move focus.
   * - `'vertical'`: only ArrowUp / ArrowDown move focus.
   * - `'both'`: all four arrow keys move focus.
   *
   * Unset, the axis comes from `KJ_ROVING_ORIENTATION_DEFAULT` on the same
   * element, else `'both'`.
   */
  readonly kjRovingOrientation = input<KjRovingOrientation | undefined>(undefined);

  /** Effective axis: the `kjRovingOrientation` binding, else the pinned default, else `'both'`. */
  readonly orientation = computed<KjRovingOrientation>(
    () => this.kjRovingOrientation() ?? this.orientationDefault?.() ?? 'both',
  );

  constructor() {
    effect(() => {
      const all = this.items();
      const current = this.activeItem();
      let next = current && all.includes(current) ? current : null;
      if (!next && all.length) {
        const idx = Math.min(this.lastActiveIndex, all.length - 1);
        next = all[untracked(() => nearestNavigable(all, idx))];
        untracked(() => this.activeItem.set(next));
        if (current) this.refocusAfterRemoval(next!);
      }
      all.forEach((item, i) => {
        item.active.set(item === next);
        if (item === next) this.lastActiveIndex = i;
      });
    });
  }

  /** @internal */
  register(item: KjRovingTabindexItem): void {
    this.registered.push(item);
    this.version.update((v) => v + 1);
  }

  /** @internal */
  unregister(item: KjRovingTabindexItem): void {
    const idx = this.registered.indexOf(item);
    if (idx === -1) return;
    this.registered.splice(idx, 1);
    this.version.update((v) => v + 1);
  }

  /**
   * Makes `target` the group's tab stop without moving focus. Accepts the item
   * directive, its element, or any ancestor of exactly one item (a row
   * wrapping its link). Unknown targets are ignored.
   * @param target The item, its host element, or an ancestor element.
   */
  setActive(target: KjRovingTabindexItem | Element): void {
    const item =
      target instanceof KjRovingTabindexItem
        ? target
        : this.items().find((candidate) => {
            const el = candidate.el.nativeElement;
            return el === target || target.contains(el) || el.contains(target);
          });
    if (!item || !this.registered.includes(item)) return;
    this.activeItem.set(item);
  }

  /** @internal — syncs the tab stop when focus moves into an item programmatically */
  onFocusIn(event: FocusEvent): void {
    this.focusWithin = true;
    const item = this.itemFor(event.target);
    if (item) this.activeItem.set(item);
  }

  /** @internal */
  onFocusOut(event: FocusEvent): void {
    const to = event.relatedTarget as Node | null;
    // Chrome fires focusout when the focused element is removed from the
    // DOM (Firefox does not); a disconnected target means focus was inside
    // and is about to be lost, which is exactly the case the clamp repairs.
    this.focusWithin = to
      ? this.host.nativeElement.contains(to)
      : !(event.target as Node | null)?.isConnected;
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    const all = this.items();
    const count = all.length;
    if (!count) return;

    const orientation = this.orientation();
    const horizontal = orientation !== 'vertical';
    const vertical = orientation !== 'horizontal';
    const current = this.indexOf(this.itemFor(event.target) ?? this.activeItem());

    let from = current;
    let step: 1 | -1;
    switch (event.key) {
      case 'ArrowRight':
        if (!horizontal) return;
        step = this.isRtl() ? -1 : 1;
        break;
      case 'ArrowLeft':
        if (!horizontal) return;
        step = this.isRtl() ? 1 : -1;
        break;
      case 'ArrowDown':
        if (!vertical) return;
        step = 1;
        break;
      case 'ArrowUp':
        if (!vertical) return;
        step = -1;
        break;
      case 'Home':
        from = -1;
        step = 1;
        break;
      case 'End':
        from = count;
        step = -1;
        break;
      default:
        return;
    }

    const next = nextNavigable(all, from, step);
    if (next === -1) return;
    event.preventDefault();
    const item = all[next];
    this.activeItem.set(item);
    this.lastActiveIndex = next;
    item.el.nativeElement.focus();
  }

  private isRtl(): boolean {
    const dirHost = this.host.nativeElement.closest('[dir]');
    return dirHost?.getAttribute('dir')?.toLowerCase() === 'rtl';
  }

  private itemFor(target: EventTarget | null): KjRovingTabindexItem | null {
    if (!(target instanceof Node)) return null;
    return (
      this.items().find(
        (item) => item.el.nativeElement === target || item.el.nativeElement.contains(target),
      ) ?? null
    );
  }

  private indexOf(item: KjRovingTabindexItem | null): number {
    return item ? this.items().indexOf(item) : -1;
  }

  private refocusAfterRemoval(next: KjRovingTabindexItem): void {
    if (!this.focusWithin) return;
    const active = this.doc.activeElement;
    if (active && active !== this.doc.body && this.host.nativeElement.contains(active)) return;
    next.el.nativeElement.focus();
  }
}

/** Index of the first navigable item after `from` (wrapping) in direction `step`, or -1. */
function nextNavigable(
  all: readonly KjRovingTabindexItem[],
  from: number,
  step: 1 | -1,
): number {
  const count = all.length;
  for (let i = 1; i <= count; i++) {
    const idx = (((from + step * i) % count) + count) % count;
    if (all[idx].isNavigable()) return idx;
  }
  return -1;
}

/** `idx` if navigable, else the closest navigable index after it, else before it, else `idx`. */
function nearestNavigable(all: readonly KjRovingTabindexItem[], idx: number): number {
  for (let i = idx; i < all.length; i++) if (all[i].isNavigable()) return i;
  for (let i = idx - 1; i >= 0; i--) if (all[i].isNavigable()) return i;
  return idx;
}
