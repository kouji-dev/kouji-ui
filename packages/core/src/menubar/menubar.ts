import {
  Directive,
  Injector,
  booleanAttribute,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  KJ_LIST_FOCUS_MODE,
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListItem,
  KjListNavigator,
  KjTypeAhead,
  type KjCompareFn,
  type KjListFocusMode,
  type KjListNavigatorConfig,
} from '../primitives/list';
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
 * - Forces `KJ_LIST_FOCUS_MODE = 'roving'` (host-directive inputs cannot
 *   be defaulted from a composing directive — same workaround as
 *   `KjDropdownMenuContent`). This makes `KjListItem.tabIndex` track the
 *   navigator's active id.
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
    {
      provide: KJ_LIST_FOCUS_MODE,
      useFactory: () => signal<KjListFocusMode>('roving'),
    },
    KjTypeAhead,
  ],
  host: {
    'role': 'menubar',
    'aria-orientation': 'horizontal',
    '[attr.aria-label]': 'kjAriaLabel() || null',
    '(keydown)': '_onKeydown($event)',
    '(focusin)': '_onFocusin($event)',
  },
})
export class KjMenubar implements KjMenubarContext, KjListNavigatorConfig {
  /** When `true`, ArrowRight at the last item wraps to the first (and vice versa). */
  readonly kjLoop = input(false, { transform: booleanAttribute });
  readonly loop = this.kjLoop;

  /**
   * Deprecated. The pre-primitives bar shipped a "roll-over" hover auto-disclose
   * mode here; with the new composition, hover is opt-in per consumer (e.g. by
   * listening to `pointerenter` on `[kjMenubarItem]`). Kept as a no-op input
   * so existing template bindings don't break — remove in a major bump.
   * @deprecated
   */
  readonly kjAutoDisclose = input(true, { transform: booleanAttribute });

  /**
   * Deprecated. Roll-over dwell delay used by the old auto-disclose path —
   * unused in the primitives-based menubar. Kept as a no-op input to avoid
   * breaking existing template bindings.
   * @deprecated
   */
  readonly kjAutoDiscloseDelayMs = input(0, { transform: numberAttribute });

  /** Optional accessible name forwarded to the host as `aria-label`. */
  readonly kjAriaLabel = input<string | null>(null);

  /** Emits the bar item's id when its popup opens, or `null` when all are closed. */
  readonly kjOpenChange = output<string | null>();

  // ── KjListNavigatorConfig ────────────────────────────────────────────

  /** All `KjListItem`s composed by `KjMenubarItem` children. */
  readonly items = contentChildren(KjListItem, { descendants: true });
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
      case 'ArrowDown': {
        // APG menubar: ArrowDown on a top-level item opens its submenu.
        const id = nav.activeId();
        if (!id) return;
        const ctx = this._items().find((c) => c.el.id === id);
        if (!ctx || ctx.disabled()) return;
        event.preventDefault();
        ctx.openPopup();
        return;
      }
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
    // The roving focus-follow effect (mounted in the constructor) also
    // does this, but with `vi.useFakeTimers({ toFake: ['queueMicrotask'] })`
    // active in the spec the effect can be deferred past the test's
    // assertion — drive focus here so keyboard navigation never depends
    // on microtask scheduling.
    nav.activeItem()?._host()?.focus();
  }

  /**
   * Keep the navigator's active id aligned with the actually-focused bar
   * item (e.g. user clicked on a different item, or Tabbed in). `focusin`
   * bubbles up to the menubar host, so we resolve which item caught
   * focus by walking up from the event target.
   */
  protected _onFocusin(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const nav = this._nav();
    if (!nav) return;
    const item = this.items().find((i) => i._host() === target);
    if (item) nav.setActive(item.id);
  }

  // ── Navigator resolution + roving effects ────────────────────────────

  private readonly _injector = inject(Injector);
  private _navCache: KjListNavigator | null | undefined = undefined;
  private _nav(): KjListNavigator | null {
    if (this._navCache !== undefined) return this._navCache;
    this._navCache = this._injector.get(KjListNavigator, null, { self: true });
    return this._navCache;
  }

  constructor() {
    // Roving seed: set the navigator's active id to the first non-disabled
    // item so its `tabindex=0` makes the bar reachable by Tab on first
    // render (WAI-ARIA APG). Same pattern as `KjDropdownMenuContent`,
    // needed because `KjListNavigator`'s built-in seed gates on its
    // `kjFocusMode()` input (which defaults to `'activedescendant'` and
    // can't be defaulted from a composing directive).
    effect(() => {
      const nav = this._nav();
      if (!nav) return;
      const list = this.items();
      if (nav.activeId() !== null) return;
      const first = list.find((i) => !i.disabled());
      if (first) untracked(() => nav.setActive(first.id));
    });

    // Roving focus follow: mirror the navigator's `activeItem()` into DOM
    // focus. Same rationale as the seed — `KjListNavigator`'s built-in
    // focus-follow gates on its own `kjFocusMode()`.
    effect(() => {
      const nav = this._nav();
      if (!nav) return;
      const item = nav.activeItem();
      if (!item) return;
      const host = item._host();
      if (host && typeof document !== 'undefined' && document.activeElement !== host) {
        untracked(() => host.focus());
      }
    });
  }
}
