import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  booleanAttribute,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  KJ_MENUBAR,
  type KjMenubarContext,
  type KjMenubarItemContext,
} from './menubar.context';

/**
 * The application menubar — `role="menubar"`, a horizontal row of top-level
 * menu disclosures (File / Edit / View / Help …). Each child
 * `[kjMenubarItem]` opens a vertical popup composed from the
 * `[kjDropdownMenu]` family.
 *
 * The bar is the **horizontal coordinator** — it owns:
 *
 * - The roving tabindex across registered bar items (only one is tabbable).
 * - The "auto-disclose" (roll-over) mode: once one popup is open, hovering
 *   an adjacent bar item transfers ownership without a click. Auto-disclose
 *   is gated behind `(pointer: fine)` so touch devices fall back to tap-only.
 * - Cross-bar keyboard navigation: `ArrowLeft` / `ArrowRight` move between
 *   bar items (with `dir="rtl"` flipping); `Home` / `End` jump to first /
 *   last; printable characters type-ahead jump.
 * - Cross-bar popup hand-off: `ArrowLeft` / `ArrowRight` from inside an
 *   open popup (on a leaf item that is *not* a sub-trigger) close the
 *   current popup, focus the previous / next bar item, and open *that*
 *   bar item's popup with focus on its first item.
 *
 * Submenus inside popups follow the dropdown menu's own contract — they
 * do not cross bars, because the focused item *has* a submenu to open.
 *
 * ```html
 * <nav kjMenubar aria-label="Application">
 *   <button kjMenubarItem [kjDropdownMenuTriggerFor]="fileMenu">File</button>
 *   <button kjMenubarItem [kjDropdownMenuTriggerFor]="editMenu">Edit</button>
 *   <button kjMenubarItem [kjDropdownMenuTriggerFor]="viewMenu">View</button>
 * </nav>
 *
 * <ng-template #fileMenu>
 *   <div kjDropdownMenu>
 *     <button kjDropdownMenuItem (kjSelect)="newFile()">New</button>
 *     <button kjDropdownMenuItem (kjSelect)="openFile()">Open</button>
 *   </div>
 * </ng-template>
 * ```
 *
 * Accessible name: the consumer is responsible for setting `aria-label` or
 * `aria-labelledby` on the host. A dev-mode warning is emitted when neither
 * is present. The recommended name for a canonical app menubar is
 * `aria-label="Application"`.
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name menubar
 * @doc-description Unstyled application menubar with horizontal arrow-key navigation and hover disclosure across menus.
 * @doc-is-main
 */
@Directive({
  selector: '[kjMenubar]',
  standalone: true,
  exportAs: 'kjMenubar',
  providers: [
    { provide: KJ_MENUBAR, useExisting: KjMenubar },
  ],
  host: {
    'role': 'menubar',
    'aria-orientation': 'horizontal',
    '[attr.aria-label]': 'kjAriaLabel() || null',
    '[attr.data-state]': 'autoDiscloseActive() ? "active" : "inactive"',
    '(keydown)': 'onHostKeydown($event)',
    '(focusout)': 'onHostFocusOut($event)',
  },
})
export class KjMenubar implements KjMenubarContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * When `true`, ArrowRight at the last bar item wraps to the first
   * (and ArrowLeft at the first wraps to the last).
   */
  readonly kjLoop = input(false, { transform: booleanAttribute });

  /**
   * When `true` (default), hovering a bar item while another's popup is
   * open transfers ownership (roll-over disclosure). When `false`, every
   * bar item is click-to-open. Auto-disclose is also gated by
   * `(pointer: fine)` — coarse pointers (touch) always require a tap.
   */
  readonly kjAutoDisclose = input(true, { transform: booleanAttribute });

  /**
   * Hover dwell before transferring popup ownership, in ms. Default `0`
   * (immediate, matching Radix). Useful values: 100–200 ms to suppress
   * accidental transfers when sweeping the cursor across the bar.
   */
  readonly kjAutoDiscloseDelayMs = input(0, { transform: numberAttribute });

  /** Optional accessible name forwarded to the host as `aria-label`. */
  readonly kjAriaLabel = input<string | null>(null);

  /**
   * Emits the `id` of the bar item whose popup just opened, or `null`
   * when the last popup closes. Convenient for analytics; not load-bearing.
   */
  readonly kjOpenChange = output<string | null>();

  // ── KjMenubarContext ──────────────────────────────────────────────

  private readonly _items = signal<KjMenubarItemContext[]>([]);
  /** @internal Read by tests. */
  readonly items = this._items.asReadonly();

  private readonly _openItem = signal<KjMenubarItemContext | null>(null);
  readonly openItem = this._openItem.asReadonly();

  private readonly _autoDiscloseActive = signal(false);
  readonly autoDiscloseActive = this._autoDiscloseActive.asReadonly();

  readonly loop = this.kjLoop;
  readonly autoDiscloseEnabled = this.kjAutoDisclose;
  readonly autoDiscloseDelayMs = this.kjAutoDiscloseDelayMs;

  /** Computed: roving-tabindex active index, in registered DOM order. */
  protected readonly activeIndex = signal(0);

  private rollOverTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRollOverItem: KjMenubarItemContext | null = null;

  constructor() {
    // Keep the active bar item in sync with the open one — opening item N
    // makes N the active member of the roving tabindex.
    effect(() => {
      const open = this._openItem();
      if (!open) return;
      const items = this._items();
      const idx = items.indexOf(open);
      if (idx >= 0) this.activeIndex.set(idx);
    });
  }

  // ── Item registration ────────────────────────────────────────────

  registerItem(item: KjMenubarItemContext): void {
    this._items.update((arr) => {
      if (arr.includes(item)) return arr;
      // Insert in DOM order so ArrowLeft / ArrowRight follow visual order.
      const next = [...arr, item];
      next.sort((a, b) => {
        const ap = a.el.compareDocumentPosition(b.el);
        if (ap & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (ap & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
      return next;
    });
    // Establish initial active index = first non-disabled.
    const items = this._items();
    if (items.length === 1) {
      const firstNonDisabled = items.findIndex((i) => !i.disabled());
      this.activeIndex.set(firstNonDisabled >= 0 ? firstNonDisabled : 0);
    }
  }

  unregisterItem(item: KjMenubarItemContext): void {
    this._items.update((arr) => arr.filter((i) => i !== item));
    if (this._openItem() === item) {
      this._openItem.set(null);
      this._autoDiscloseActive.set(false);
    }
  }

  /** @internal Used by `[kjMenubarItem]` to compute its `tabindex`. */
  isActive(item: KjMenubarItemContext): boolean {
    const items = this._items();
    const idx = items.indexOf(item);
    return idx === this.activeIndex();
  }

  // ── Open / close coordination ────────────────────────────────────

  notifyItemOpened(item: KjMenubarItemContext): void {
    const previous = this._openItem();
    if (previous && previous !== item) {
      // The previously-open item must close before the new one is recorded —
      // its own trigger may not have heard about the new opener yet.
      previous.closePopup();
    }
    this._openItem.set(item);
    this._autoDiscloseActive.set(true);
    this.kjOpenChange.emit(item.el.id || null);
  }

  notifyItemClosed(item: KjMenubarItemContext): void {
    if (this._openItem() === item) {
      this._openItem.set(null);
      // Emit null when the bar's last open popup closes.
      this.kjOpenChange.emit(null);
    }
  }

  // ── Roll-over disclosure (hover) ─────────────────────────────────

  notifyItemPointerEnter(item: KjMenubarItemContext): void {
    if (!this._autoDiscloseActive()) return;
    if (!this.kjAutoDisclose()) return;
    if (!this.isFinePointerEnvironment()) return;
    if (item.disabled()) return;
    const current = this._openItem();
    if (current === item) return;

    const delay = Math.max(0, this.kjAutoDiscloseDelayMs() | 0);
    this.cancelRollOver();
    this.pendingRollOverItem = item;

    const fire = (): void => {
      const target = this.pendingRollOverItem;
      this.pendingRollOverItem = null;
      this.rollOverTimer = null;
      if (!target) return;
      // Re-check that auto-disclose is still active — Esc / Tab / outside-click
      // could have flipped it off in the meantime.
      if (!this._autoDiscloseActive()) return;
      const previous = this._openItem();
      if (previous === target) return;
      // Hand-off: open the new one. notifyItemOpened closes the previous.
      target.openPopup('first');
    };

    if (delay === 0) {
      fire();
    } else {
      this.rollOverTimer = setTimeout(fire, delay);
    }
  }

  notifyItemPointerLeave(item: KjMenubarItemContext): void {
    if (this.pendingRollOverItem === item) {
      this.cancelRollOver();
    }
  }

  private cancelRollOver(): void {
    if (this.rollOverTimer !== null) {
      clearTimeout(this.rollOverTimer);
      this.rollOverTimer = null;
    }
    this.pendingRollOverItem = null;
  }

  private isFinePointerEnvironment(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    try {
      return window.matchMedia('(pointer: fine)').matches;
    } catch {
      return true;
    }
  }

  // ── Movement ─────────────────────────────────────────────────────

  moveFocus(
    from: KjMenubarItemContext,
    delta: 1 | -1,
    opts: { openPopup: boolean; focus: 'first' | 'last' | 'none' },
  ): void {
    const items = this._items();
    if (!items.length) return;
    const startIdx = items.indexOf(from);
    if (startIdx < 0) return;

    const wrap = this.kjLoop();
    const len = items.length;
    let idx = startIdx;
    for (let step = 0; step < len; step += 1) {
      idx += delta;
      if (idx < 0) {
        if (!wrap) return;
        idx = len - 1;
      } else if (idx >= len) {
        if (!wrap) return;
        idx = 0;
      }
      if (idx === startIdx) return;
      if (!items[idx].disabled()) break;
    }
    const target = items[idx];
    if (!target || target === from || target.disabled()) return;
    this.activeIndex.set(idx);

    if (opts.openPopup) {
      from.closePopup();
      target.openPopup(opts.focus);
    } else {
      target.focusItem();
    }
  }

  moveFocusToEdge(
    edge: 'first' | 'last',
    opts: { openPopup: boolean; focus: 'first' | 'last' | 'none' },
  ): void {
    const items = this._items();
    if (!items.length) return;
    const order = edge === 'first'
      ? items.map((_, i) => i)
      : items.map((_, i) => items.length - 1 - i);
    for (const i of order) {
      if (!items[i].disabled()) {
        this.activeIndex.set(i);
        const target = items[i];
        if (opts.openPopup) {
          const previous = this._openItem();
          if (previous && previous !== target) previous.closePopup();
          target.openPopup(opts.focus);
        } else {
          target.focusItem();
        }
        return;
      }
    }
  }

  typeAhead(from: KjMenubarItemContext, char: string): void {
    const items = this._items();
    if (!items.length) return;
    const lc = char.toLowerCase();
    const startIdx = items.indexOf(from);
    if (startIdx < 0) return;
    const len = items.length;
    // Search forward starting after `from`, then wrap.
    for (let step = 1; step <= len; step += 1) {
      const idx = (startIdx + step) % len;
      const item = items[idx];
      const text = (item.el.textContent ?? '').trim().toLowerCase();
      if (text.startsWith(lc)) {
        this.activeIndex.set(idx);
        item.focusItem();
        return;
      }
    }
  }

  // ── Host keydown: cross-bar arrow nav from inside an open popup ──

  /**
   * Capture-phase document handler: when the focused element is inside the
   * currently-open popup *and* the leaf item has no submenu pending, treat
   * ArrowLeft / ArrowRight as the cross-bar hand-off.
   */
  protected onHostKeydown(event: KeyboardEvent): void {
    // The bar's own host keydown picks up arrow keys when focus is on a
    // bar item (popup closed). The popup-open case is handled by a
    // capture-phase document listener installed on first open — see
    // installCrossBarKeyListener().
    const open = this._openItem();
    if (open) return;
    if (!this.containsTarget(event.target)) return;

    const key = event.key;
    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      const isRtl = this.resolveRtl();
      const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
      const delta: 1 | -1 = key === forward ? 1 : -1;
      const fromEl = event.target as HTMLElement;
      const items = this._items();
      const from = items.find((i) => i.el === fromEl);
      if (!from) return;
      event.preventDefault();
      this.moveFocus(from, delta, { openPopup: false, focus: 'none' });
      return;
    }
    if (key === 'Home') {
      event.preventDefault();
      this.moveFocusToEdge('first', { openPopup: false, focus: 'none' });
      return;
    }
    if (key === 'End') {
      event.preventDefault();
      this.moveFocusToEdge('last', { openPopup: false, focus: 'none' });
      return;
    }
    // Type-ahead on the bar.
    if (
      key.length === 1
      && !event.ctrlKey
      && !event.metaKey
      && !event.altKey
    ) {
      const fromEl = event.target as HTMLElement;
      const items = this._items();
      const from = items.find((i) => i.el === fromEl);
      if (!from) return;
      // Don't preventDefault — we don't want to swallow space on a button.
      this.typeAhead(from, key);
    }
  }

  protected onHostFocusOut(event: FocusEvent): void {
    // When focus leaves the bar (and not into the open popup), exit
    // auto-disclose mode. The check is conservative — we don't want to
    // exit while the user is still interacting with an open popup.
    const next = event.relatedTarget as HTMLElement | null;
    if (!next) return;
    const inBar = this.el.nativeElement.contains(next);
    if (inBar) return;
    const open = this._openItem();
    if (open && open.el.contains(next)) return;
    // The popup is portalled to <body>; check via the open item's panel id.
    if (open) {
      const panelId = open.el.getAttribute('aria-controls');
      if (panelId && next.closest(`#${panelId}`)) return;
    }
    // Focus moved outside: exit auto-disclose.
    this._autoDiscloseActive.set(false);
  }

  private resolveRtl(): boolean {
    const el = this.el.nativeElement;
    if (typeof getComputedStyle === 'function') {
      const direction = getComputedStyle(el).direction;
      if (direction === 'rtl') return true;
      if (direction === 'ltr') return false;
    }
    const dirHost = el.closest('[dir]') as HTMLElement | null;
    return dirHost?.dir.toLowerCase() === 'rtl';
  }

  private containsTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) return false;
    return this.el.nativeElement.contains(target);
  }

  /** @internal Read by tests / spec for the active-index of the roving group. */
  getActiveIndex(): number {
    return this.activeIndex();
  }

  /** @internal Resolve the panel element of the currently-open popup, if any. */
  private getOpenPanel(): HTMLElement | null {
    const open = this._openItem();
    if (!open) return null;
    const panelId = open.el.getAttribute('aria-controls');
    if (!panelId) return null;
    return document.getElementById(panelId);
  }

  /**
   * Cross-bar arrow handler: ArrowLeft / ArrowRight on a leaf popup item
   * (not a sub-trigger) closes the current popup, advances the active bar
   * item, and opens that bar item's popup.
   *
   * Installed as a capture-phase document keydown listener while the bar
   * has an open popup.
   */
  private _crossBarHandler: ((e: KeyboardEvent) => void) | null = null;

  // Install once on first open via an effect that watches openItem.
  // Doing it lazily keeps SSR hydration clean (no document listeners until
  // first interaction).
  private installCrossBarListenerEffect = effect(() => {
    if (!isPlatformBrowser(this.platformId)) return;
    const open = this._openItem();
    if (open) {
      this.installCrossBarListener();
    } else {
      this.uninstallCrossBarListener();
    }
  });

  private installCrossBarListener(): void {
    if (this._crossBarHandler) return;
    const handler = (event: KeyboardEvent) => this.onCrossBarKeydown(event);
    document.addEventListener('keydown', handler, true);
    this._crossBarHandler = handler;
  }

  private uninstallCrossBarListener(): void {
    if (!this._crossBarHandler) return;
    document.removeEventListener('keydown', this._crossBarHandler, true);
    this._crossBarHandler = null;
  }

  private onCrossBarKeydown(event: KeyboardEvent): void {
    const open = this._openItem();
    if (!open) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const panel = this.getOpenPanel();
    if (!panel) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    // Only fire when the event is inside the bar's own popup, not inside
    // a nested submenu. The submenu has its own panel element with its
    // own id; if `target.closest('[role=menu]')` resolves to a different
    // element than `panel`, we are in a sub-popup and bow out.
    const ownerMenu = target.closest('[role="menu"]');
    if (ownerMenu !== panel) return;

    // If the focused item is itself a sub-trigger (has aria-haspopup),
    // ArrowRight / ArrowLeft are submenu open / close — defer.
    if (target.getAttribute('aria-haspopup') === 'menu') {
      // ArrowRight on a sub-trigger opens the submenu — let the trigger handle.
      // ArrowLeft on a sub-trigger should also defer to the submenu's own
      // logic (it only matters if a submenu is currently open above this).
      return;
    }

    const isRtl = this.resolveRtl();
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const delta: 1 | -1 = event.key === forward ? 1 : -1;

    event.preventDefault();
    event.stopPropagation();
    this.moveFocus(open, delta, { openPopup: true, focus: 'first' });
  }
}
