// packages/core/src/primitives/list/navigator.ts
import {
  Directive,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  KJ_LIST_FOCUS_MODE,
  KJ_LIST_NAVIGATOR_CONFIG,
  type KjListFocusMode,
  type KjListOrientation,
} from './tokens';
import { KjTypeAhead } from './type-ahead';
import type { KjListItem } from './item';

/**
 * Container-side keyboard / active-descendant primitive. Hosted on the
 * listbox panel (select / command-palette) or the input element
 * (combobox). Owns `aria-activedescendant` and the ArrowUp/Down /
 * Home/End / PageUp/Down / Enter / Space / type-ahead contract for the
 * WAI-ARIA APG listbox + combobox patterns.
 *
 * @doc-category Core/Primitives
 */
@Directive({
  selector: '[kjListNavigator]',
  exportAs: 'kjListNavigator',
  standalone: true,
  providers: [
    {
      provide: KJ_LIST_FOCUS_MODE,
      // The factory closes over the directive instance via `inject`,
      // exposing the live `kjFocusMode` signal to child `KjListItem`s.
      useFactory: () => inject(KjListNavigator).kjFocusMode,
    },
  ],
  host: {
    '[attr.aria-activedescendant]': 'kjFocusMode() === "activedescendant" ? activeId() : null',
    '(keydown)': '_onKeydown($event)',
  },
})
export class KjListNavigator {
  /** Which axis the navigator responds to. Default: `'vertical'`. */
  readonly kjOrientation     = input<KjListOrientation>('vertical');
  /** Wrap at ends instead of clamping. Default: `true`. */
  readonly kjWrap            = input<boolean>(true);
  /** Items to skip per PageUp / PageDown. Default: `10`. */
  readonly kjPageSize        = input<number>(10);
  /** Activate item on pointer hover. Default: `false`. */
  readonly kjActivateOnHover = input<boolean>(false);
  /**
   * Focus model. `'activedescendant'` (default) keeps DOM focus on the
   * navigator host and signals the active option via
   * `aria-activedescendant`. `'roving'` moves DOM focus onto the active
   * option itself via roving `tabindex`. Switch to `'roving'` for menu
   * / menubar / tree-select patterns where each item must be the focus
   * target (so screen-reader virtual-cursor and JAWS / NVDA forms-mode
   * line up with the visual highlight).
   */
  readonly kjFocusMode       = input<KjListFocusMode>('activedescendant');

  /** Fires when the active item changes. Emits the new id or `null`. */
  readonly kjActiveChange = output<string | null>();

  private readonly cfg = inject(KJ_LIST_NAVIGATOR_CONFIG);
  private readonly typeAhead = inject(KjTypeAhead, { optional: true });

  private readonly _activeId = signal<string | null>(null);
  /**
   * Currently active item id, or `null`.
   * Bound to `aria-activedescendant` on the host element.
   */
  readonly activeId = this._activeId.asReadonly();

  /** Visible + non-disabled items in DOM order — the navigable set. */
  private readonly navigable = computed<readonly KjListItem<unknown>[]>(() => {
    const source = this.cfg.visibleItems?.() ?? this.cfg.items();
    return source.filter(i => !i.disabled());
  });

  constructor() {
    // Roving seed: when the focus model is `'roving'` and no item is
    // active yet, point at the first navigable so its `tabindex=0`
    // makes the list reachable by Tab on first render — required by
    // WAI-ARIA APG (menu / tree). In `'activedescendant'` mode the
    // listbox host itself is the Tab target, so seeding would
    // pre-highlight an option before the user has interacted, hurting
    // accessibility (false "selected" cue). Hence: roving only.
    effect(() => {
      if (this.kjFocusMode() !== 'roving') return;
      if (this._activeId() !== null) return;
      const first = this.navigable()[0];
      if (first) this._activeId.set(first.id);
    });

    // Roving focus follow: when the active item changes (keyboard nav,
    // pointer hover, programmatic setActive), move DOM focus onto its
    // host element so the browser's focus ring + screen-reader virtual
    // cursor track the visual highlight. Only relevant in roving mode
    // — activedescendant keeps focus on the navigator host element.
    effect(() => {
      if (this.kjFocusMode() !== 'roving') return;
      const item = this.activeItem();
      if (!item) return;
      const host = item._host();
      if (host && document.activeElement !== host) host.focus();
    });
  }

  /**
   * The resolved active item object, or `null` when nothing is active.
   * Derived from `activeId` and the current navigable set.
   */
  readonly activeItem = computed<KjListItem<unknown> | null>(() => {
    const id = this._activeId();
    return id ? this.navigable().find(i => i.id === id) ?? null : null;
  });

  /**
   * Set the active item by id. No-op when unchanged; emits `kjActiveChange`.
   * The `[attr.aria-activedescendant]` host binding flushes the change to
   * the DOM on the next change-detection cycle.
   */
  setActive(id: string | null): void {
    if (this._activeId() === id) return;
    this._activeId.set(id);
    this.kjActiveChange.emit(id);
  }

  /**
   * Move the active index by `delta` positions in the navigable set.
   * Respects `kjWrap` (wrap vs. clamp) and skips disabled items.
   */
  moveBy(delta: number): void {
    const items = this.navigable();
    if (!items.length) return;
    const currentIdx = items.findIndex(i => i.id === this._activeId());
    // When nothing is active and moving forward, start at -1 so that
    // +1 lands on index 0 (first item). Moving backward from nothing
    // starts at items.length so -1 lands on the last item.
    const startIdx = currentIdx === -1 ? (delta > 0 ? -1 : items.length) : currentIdx;
    let next = startIdx + delta;
    const last = items.length - 1;
    if (this.kjWrap()) {
      next = ((next % items.length) + items.length) % items.length;
    } else {
      if (next < 0) next = 0;
      if (next > last) next = last;
    }
    this.setActive(items[next].id);
  }

  /** Move the active item to the first item in the navigable set. */
  moveToFirst(): void {
    const items = this.navigable();
    if (items.length) this.setActive(items[0].id);
  }

  /** Move the active item to the last item in the navigable set. */
  moveToLast(): void {
    const items = this.navigable();
    if (items.length) this.setActive(items[items.length - 1].id);
  }

  /**
   * Invoke `_activate()` on the currently active item.
   * No-op when nothing is active.
   */
  activateCurrent(): void {
    this.activeItem()?._activate();
  }

  /** @internal Keydown handler bound via host binding. */
  _onKeydown(e: KeyboardEvent): void {
    const o = this.kjOrientation();
    const isV = o === 'vertical' || o === 'both';
    const isH = o === 'horizontal' || o === 'both';

    switch (e.key) {
      case 'ArrowDown':
        if (!isV) return;
        e.preventDefault();
        this.moveBy(1);
        return;
      case 'ArrowUp':
        if (!isV) return;
        e.preventDefault();
        this.moveBy(-1);
        return;
      case 'ArrowRight':
        if (!isH) return;
        e.preventDefault();
        this.moveBy(1);
        return;
      case 'ArrowLeft':
        if (!isH) return;
        e.preventDefault();
        this.moveBy(-1);
        return;
      case 'Home':
        e.preventDefault();
        this.moveToFirst();
        return;
      case 'End':
        e.preventDefault();
        this.moveToLast();
        return;
      case 'PageDown':
        e.preventDefault();
        this.moveBy(this.kjPageSize());
        return;
      case 'PageUp':
        e.preventDefault();
        this.moveBy(-this.kjPageSize());
        return;
      case 'Enter':
      case ' ':
        // Only preventDefault when we actually activate. Lets consumers
        // (e.g. combobox free-text Enter) fall through when nothing is
        // active, and lets Space type a literal space in a combobox input.
        if (this.activeItem()) {
          e.preventDefault();
          this.activateCurrent();
        }
        return;
      default: {
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        if (!this.typeAhead) return;
        const id = this.typeAhead.match(e.key, this.navigable());
        if (id) this.setActive(id);
      }
    }
  }
}
