import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  booleanAttribute,
  contentChildren,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListItem,
  ownListItems,
  KjListNavigator,
  KjTypeAhead,
  type KjCompareFn,
  type KjListNavigatorConfig,
} from '../primitives/list';
import { KJ_LIST_FOCUS_MODE_DEFAULT } from '../primitives/list/navigator';
import {
  KJ_MENUBAR,
  type KjMenubarContext,
  type KjMenubarItemContext,
} from './menubar.context';

/**
 * The application menubar — `role="menubar"`, a horizontal row of top-level
 * menu disclosures (File / Edit / View / Help …). Each child
 * `[kjMenubarItem]` owns a submenu opened on activation.
 *
 * Composition:
 *
 * - Implements {@link KjListNavigatorConfig} (items + `afterSelect`) and
 *   provides itself via `KJ_LIST_NAVIGATOR_CONFIG`.
 * - Composes `KjListNavigator` via `hostDirectives` so the navigator's
 *   element-injector lives on the bar's host, giving `KjListItem`s under
 *   the bar a navigator to register with.
 * - Pins the composed navigator to the roving focus model via
 *   `KJ_LIST_FOCUS_MODE_DEFAULT`. The navigator then seeds the first
 *   enabled item as the bar's single Tab stop on first render — without
 *   moving focus — moves focus with every arrow-key navigation, and keeps
 *   its active id on whichever item the user focuses by pointer or Tab.
 * - Provides `KjTypeAhead` so the navigator routes printable characters
 *   to the matching bar item.
 * - The navigator's built-in keyboard handler defaults to vertical
 *   orientation. Since defaulting host-directive inputs is impossible
 *   from a composing directive, the menubar handles `ArrowLeft`,
 *   `ArrowRight`, `Home`, `End`, `Escape` itself, delegating to
 *   `KjListNavigator.moveBy / moveToFirst / moveToLast` — the navigator
 *   remains the single source of truth for active id + skip-disabled.
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name menubar
 * @doc-description Unstyled application menubar with horizontal arrow-key navigation and roving focus.
 * @doc-is-main
 */
@Directive({
  selector: '[kjMenubar]',
  standalone: true,
  exportAs: 'kjMenubar',
  hostDirectives: [KjListNavigator],
  providers: [
    { provide: KJ_MENUBAR, useExisting: KjMenubar },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => KjMenubar) },
    { provide: KJ_LIST_FOCUS_MODE_DEFAULT, useValue: 'roving' as const },
    KjTypeAhead,
  ],
  host: {
    'role': 'menubar',
    'aria-orientation': 'horizontal',
    '[attr.aria-label]': 'kjAriaLabel() || null',
    '(keydown)': '_onKeydown($event)',
  },
})
export class KjMenubar implements KjMenubarContext, KjListNavigatorConfig {
  /** When `true`, ArrowRight at the last item wraps to the first (and vice versa). */
  readonly kjLoop = input(false, { transform: booleanAttribute });
  readonly loop = this.kjLoop;

  /** Optional accessible name forwarded to the host as `aria-label`. */
  readonly kjAriaLabel = input<string | null>(null);

  /** Emits the bar item's id when its popup opens, or `null` when all are closed. */
  readonly kjOpenChange = output<string | null>();

  // ── KjListNavigatorConfig ────────────────────────────────────────────

  /**
   * Raw content query. `descendants: true` reaches straight through a
   * list composite nested inside this menubar, so it is never read
   * directly — `items` narrows it to this container's own scope.
   */
  private readonly allItems = contentChildren(KjListItem, { descendants: true });
  /**
   * All `KjListItem`s composed by `KjMenubarItem` children.
   *
   * Items owned by a list composite nested inside this one (a select
   * inside a palette, a menu inside a select) answer to that composite,
   * not to this one.
   */
  readonly items = ownListItems(this, this.allItems);
  /** No selection model on a menubar. Identity compare. */
  readonly compareBy = signal<KjCompareFn<unknown>>(Object.is as KjCompareFn<unknown>);

  /**
   * Required by `KjListNavigatorConfig`. The menubar has no selection
   * model and activation is wired item-side (`KjMenubarItem` subscribes
   * to its own composed `KjListItem.activate` and toggles its submenu)
   * because the bar's nav active id doesn't always identify the item
   * that was clicked (mouse click can fire before focusin). Kept as a
   * no-op stub to satisfy the contract.
   */
  afterSelect(_value: unknown, _closeRequested: boolean): void {
    /* no-op: each KjMenubarItem owns its own activation */
  }

  // ── KjMenubarContext ─────────────────────────────────────────────────

  private readonly _items = signal<KjMenubarItemContext[]>([]);
  /** @internal Used by `afterSelect` to resolve `KjListItem` ids back to bar items. */
  readonly _itemCtxs = this._items.asReadonly();

  private readonly _openItem = signal<KjMenubarItemContext | null>(null);
  readonly openItem = this._openItem.asReadonly();

  registerItem(item: KjMenubarItemContext): void {
    this._items.update((arr) => {
      if (arr.includes(item)) return arr;
      const next = [...arr, item];
      // Sort by DOM order so ArrowLeft / ArrowRight follow visual order
      // regardless of the order in which items happen to register.
      next.sort((a, b) => {
        const pos = a.el.compareDocumentPosition(b.el);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
      return next;
    });
  }

  unregisterItem(item: KjMenubarItemContext): void {
    this._items.update((arr) => arr.filter((i) => i !== item));
    if (this._openItem() === item) this._openItem.set(null);
  }

  notifyItemOpened(item: KjMenubarItemContext): void {
    const prev = this._openItem();
    if (prev && prev !== item) prev.closePopup();
    this._openItem.set(item);
    this.kjOpenChange.emit(item.el.id || null);
  }

  notifyItemClosed(item: KjMenubarItemContext): void {
    if (this._openItem() === item) {
      this._openItem.set(null);
      this.kjOpenChange.emit(null);
    }
  }

  // ── Keyboard ─────────────────────────────────────────────────────────

  /**
   * Horizontal navigation routes here because `KjListNavigator`'s
   * `kjOrientation` cannot be defaulted by a composing directive (it
   * stays at `'vertical'`, so its built-in ArrowLeft/Right would no-op).
   * `Home`, `End`, `Escape`, and `ArrowDown` (open submenu) are owned at
   * the menubar level too; `Enter` / `Space` reach the focused item's
   * `KjListItem._activate` directly and route through `afterSelect`.
   * Type-ahead is handled by the navigator via the provided `KjTypeAhead`
   * (printable keys → navigator's default handler matches haystacks).
   */
  protected _onKeydown(event: KeyboardEvent): void {
    const nav = this._nav();
    if (!nav) return;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this._move(nav, 1);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        this._move(nav, -1);
        return;
      case 'Home':
        event.preventDefault();
        nav.moveToFirst();
        nav.activeItem()?._host()?.focus();
        return;
      case 'End':
        event.preventDefault();
        nav.moveToLast();
        nav.activeItem()?._host()?.focus();
        return;
      // ArrowDown / ArrowUp are not handled here: the composed navigator's
      // bubble-phase listener on this same element runs first and would have
      // moved the bar's roving focus already. They are owned by the capture
      // listener installed in the constructor.
      case 'Escape': {
        const open = this._openItem();
        if (!open) return;
        event.preventDefault();
        event.stopPropagation();
        open.closePopup();
        return;
      }
    }
  }

  /**
   * Wrap-aware move. `KjListNavigator.moveBy` always uses its own `kjWrap`
   * (default `true`), and that input can't be defaulted by a composing
   * directive — so the menubar clamps before delegating when `kjLoop()`
   * is `false`.
   */
  private _move(nav: KjListNavigator, delta: 1 | -1): void {
    if (!this.kjLoop()) {
      const navigable = this.items().filter((i) => !i.disabled());
      if (!navigable.length) return;
      const idx = navigable.findIndex((i) => i.id === nav.activeId());
      if (delta > 0 && idx >= navigable.length - 1) return;
      if (delta < 0 && idx <= 0) return;
    }
    nav.moveBy(delta);
    // Synchronously mirror the navigator's new active id into DOM focus.
    // The navigator's roving focus-follow effect also does this, but with
    // `vi.useFakeTimers({ toFake: ['queueMicrotask'] })` active in the
    // spec the effect can be deferred past the test's assertion — drive
    // focus here so keyboard navigation never depends on microtask
    // scheduling.
    nav.activeItem()?._host()?.focus();
  }

  // ── Navigator resolution ─────────────────────────────────────────────

  /**
   * Resolved lazily: the navigator injects `KJ_LIST_NAVIGATOR_CONFIG`
   * (this directive) while it constructs, so injecting it back here at
   * construction would be an NG0200 cycle. The seed, focus-follow and
   * focusin sync all live in the navigator itself (roving mode).
   */
  private readonly _injector = inject(Injector);
  private _navCache: KjListNavigator | null | undefined = undefined;
  private _nav(): KjListNavigator | null {
    if (this._navCache !== undefined) return this._navCache;
    this._navCache = this._injector.get(KjListNavigator, null, { self: true });
    return this._navCache;
  }

  // ── Submenu disclosure keys ──────────────────────────────────────────

  constructor() {
    // ArrowDown / ArrowUp must never reach the composed `KjListNavigator`.
    // Its `kjOrientation` is `'vertical'` — a host-directive input a
    // composing directive cannot default — so its own handler treats them as
    // bar movement and (with `kjWrap` on by default) jumps focus to another
    // item. The bar then opened *that* item's submenu, which is a context
    // change the user never asked for.
    //
    // A capture listener on the bar element runs before every bubble-phase
    // host listener on this same element, including the navigator's, and
    // `stopPropagation()` from the capture phase ends the dispatch for the
    // whole tree. The submenu panel is portalled out of the bar, so its own
    // arrow keys are unaffected.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const onDiscloseKey = (event: KeyboardEvent): void => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (event.defaultPrevented) return;
      const target = event.target as Node | null;
      if (!target) return;
      const ctx = this._items().find((c) => c.el === target || c.el.contains(target));
      if (!ctx || ctx.disabled()) return;
      event.preventDefault();
      event.stopPropagation();
      ctx.openPopup();
    };
    host.addEventListener('keydown', onDiscloseKey, true);
    inject(DestroyRef).onDestroy(() => {
      host.removeEventListener('keydown', onDiscloseKey, true);
    });
  }
}
