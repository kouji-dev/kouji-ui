// packages/core/src/primitives/list/navigator.ts
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  InjectionToken,
  PLATFORM_ID,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import {
  KJ_LIST_FOCUS_MODE,
  KJ_LIST_NAVIGATOR_CONFIG,
  type KjListFocusMode,
  type KjListOrientation,
  type KjListVirtualSource,
} from './tokens';
import { KjTypeAhead } from './type-ahead';
import type { KjListItem } from './item';

/**
 * Focus model a composing container pins on the `KjListNavigator` it hosts
 * via `hostDirectives`.
 *
 * `hostDirectives` can only rename inputs, never default them, so a
 * container that composes the navigator (`kj-select-content`,
 * `kj-tree-select-content`, `[kjCascadeSelectPanel]`, `[kjMenubar]`, …)
 * provides this token on its own element to switch the composed navigator
 * — and every `KjListItem` under it — to the roving model. A `kjFocusMode`
 * binding in a template still wins over it. Resolved on the navigator's own
 * element only, so a nested composite never inherits its parent's model.
 *
 * @doc-category Core/Primitives
 */
export const KJ_LIST_FOCUS_MODE_DEFAULT = new InjectionToken<KjListFocusMode>(
  'KJ_LIST_FOCUS_MODE_DEFAULT',
);

/**
 * Per-navigator item source. A composite whose single root config spans
 * several navigators (cascade-select: one per level) provides this on each
 * navigator's own element so that navigator walks only its own rows.
 * Replaces `KjListNavigatorConfig.items` / `visibleItems` for that
 * navigator; disabled items are still filtered out.
 *
 * @doc-category Core/Primitives
 */
export const KJ_LIST_NAVIGATOR_ITEMS = new InjectionToken<Signal<readonly KjListItem<unknown>[]>>(
  'KJ_LIST_NAVIGATOR_ITEMS',
);

/**
 * Container-side keyboard / active-descendant primitive. Hosted on the
 * listbox panel (select / command-palette) or the input element
 * (combobox). Owns `aria-activedescendant` and the ArrowUp/Down /
 * Home/End / PageUp/Down / Enter / Space / type-ahead contract for the
 * WAI-ARIA APG listbox + combobox patterns.
 *
 * In `'roving'` mode the navigator also owns DOM focus: it seeds the first
 * navigable item as the Tab stop on first render (without moving focus),
 * moves focus onto the active item after every navigation
 * (`setActive` / `moveBy` / type-ahead / hover), and keeps the active id in
 * step with whichever item the user focuses by pointer or Tab. It publishes
 * `aria-activedescendant` in `'activedescendant'` mode only — the two are
 * alternative ways of saying where focus is, never both at once.
 *
 * Keys the field owns are left alone when the navigator is hosted on a text
 * entry (the combobox / command-palette `<input>`): `Space` always, and
 * `Home` / `End` / `PageUp` / `PageDown` whenever the field holds text for the
 * caret to move through. An empty field keeps them for the list.
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
    // One focus signal at a time (SC 4.1.2): `aria-activedescendant` is the
    // *substitute* for DOM focus, so a roving list — where the active item
    // really holds focus — must not publish it as well. A container that pins
    // `KJ_LIST_FOCUS_MODE_DEFAULT` to `'roving'` (menu, menubar, tree-select)
    // therefore drops the attribute entirely.
    '[attr.aria-activedescendant]': 'kjFocusMode() === "activedescendant" ? activeId() : null',
    '(keydown)': '_onKeydown($event)',
    '(focusin)': '_onFocusin($event)',
  },
})
export class KjListNavigator {
  /** Which axis the navigator responds to. Default: `'vertical'`. */
  readonly kjOrientation     = input<KjListOrientation>('vertical');
  /** Wrap at ends instead of clamping. Default: `true`. */
  readonly kjWrap            = input(true, { transform: booleanAttribute });
  /** Items to skip per PageUp / PageDown. Default: `10`. */
  readonly kjPageSize        = input<number>(10);
  /** Activate item on pointer hover. Default: `false`. */
  readonly kjActivateOnHover = input(false, { transform: booleanAttribute });
  /**
   * Focus model. `'activedescendant'` (default) keeps DOM focus on the
   * navigator host and signals the active option via
   * `aria-activedescendant`. `'roving'` moves DOM focus onto the active
   * option itself via roving `tabindex`. Switch to `'roving'` for menu
   * / menubar / tree-select patterns where each item must be the focus
   * target (so screen-reader virtual-cursor and JAWS / NVDA forms-mode
   * line up with the visual highlight). A composing container pins the
   * default through {@link KJ_LIST_FOCUS_MODE_DEFAULT}.
   */
  readonly kjFocusMode       = input<KjListFocusMode>(
    inject(KJ_LIST_FOCUS_MODE_DEFAULT, { self: true, optional: true }) ?? 'activedescendant',
  );

  /** Fires when the active item changes. Emits the new id or `null`. */
  readonly kjActiveChange = output<string | null>();

  private readonly cfg = inject(KJ_LIST_NAVIGATOR_CONFIG);
  private readonly ownItems = inject(KJ_LIST_NAVIGATOR_ITEMS, { self: true, optional: true });
  /**
   * Present only on a windowed list. When it is, the cursor moves over the
   * dataset by index — `navigable()` holds the rendered window and could
   * never reach row 3 000 — and the source renders the row it lands on.
   * A per-navigator item source (`KJ_LIST_NAVIGATOR_ITEMS`) always wins: a
   * sub-panel that carved out its own rows is not the windowed dataset.
   */
  private get virtual(): KjListVirtualSource | null {
    return this.ownItems ? null : this.cfg.virtual?.() ?? null;
  }
  private readonly typeAhead = inject(KjTypeAhead, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly _activeId = signal<string | null>(null);
  /**
   * Currently active item id, or `null`.
   * Bound to `aria-activedescendant` on the host element.
   */
  readonly activeId = this._activeId.asReadonly();

  /**
   * Bumped by every explicit activation (`setActive`, and through it
   * `moveBy` / `moveToFirst` / type-ahead). The roving focus-follow effect
   * only acts on a fresh request, so the first-render seed — which writes
   * `_activeId` directly — never steals focus from wherever the user is.
   */
  private readonly _focusRequest = signal(0);
  private _servedFocusRequest = 0;

  /** Visible + non-disabled items in DOM order — the navigable set. */
  readonly navigable = computed<readonly KjListItem<unknown>[]>(() => {
    const source = this.ownItems?.() ?? this.cfg.visibleItems?.() ?? this.cfg.items();
    return source.filter(i => !i.disabled());
  });

  constructor() {
    // Roving seed: when the focus model is `'roving'` and no item is
    // active yet, point at the first navigable so its `tabindex=0`
    // makes the list reachable by Tab on first render — required by
    // WAI-ARIA APG (menu / tree). In `'activedescendant'` mode the
    // listbox host itself is the Tab target, so seeding would
    // pre-highlight an option before the user has interacted, hurting
    // accessibility (false "selected" cue). Hence: roving only. Writes the
    // id directly — not through `setActive` — so no focus follows it.
    effect(() => {
      if (this.kjFocusMode() !== 'roving') return;
      if (this._activeId() !== null) return;
      const first = this.navigable()[0];
      if (first) this._activeId.set(first.id);
    });

    // Roving focus follow: after an explicit activation (keyboard nav,
    // pointer hover, programmatic setActive) move DOM focus onto the
    // active item's host so the browser's focus ring + screen-reader
    // virtual cursor track the visual highlight. Only relevant in roving
    // mode — activedescendant keeps focus on the navigator host element.
    // Gated on a fresh focus request so the seed above, which runs on
    // mount, never moves focus (WCAG 2.4.3 / 3.2.1).
    effect(() => {
      if (this.kjFocusMode() !== 'roving') return;
      const request = this._focusRequest();
      if (request === this._servedFocusRequest) return;
      const item = this.activeItem();
      // The requested item may register a tick later — keep the request
      // pending until it resolves.
      if (!item) return;
      this._servedFocusRequest = request;
      untracked(() => this.focusHost(item));
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
   * the DOM on the next change-detection cycle; in roving mode DOM focus
   * follows the item on that same cycle.
   */
  setActive(id: string | null): void {
    if (this._activeId() === id) return;
    this._activeId.set(id);
    this._focusRequest.update(n => n + 1);
    this.kjActiveChange.emit(id);
  }

  /**
   * Move the active index by `delta` positions in the navigable set.
   * Respects `kjWrap` (wrap vs. clamp) and skips disabled items.
   *
   * On a windowed list the same rules are applied to dataset indices
   * instead, so ArrowDown walks past the end of the rendered window.
   */
  moveBy(delta: number): void {
    if (this.virtual) {
      this._moveVirtual(delta);
      return;
    }
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
    if (this.virtual) {
      this._seekVirtual(0, 1);
      return;
    }
    const items = this.navigable();
    if (items.length) this.setActive(items[0].id);
  }

  /** Move the active item to the last item in the navigable set. */
  moveToLast(): void {
    if (this.virtual) {
      this._seekVirtual(this.virtual.count() - 1, -1);
      return;
    }
    const items = this.navigable();
    if (items.length) this.setActive(items[items.length - 1].id);
  }

  /**
   * Windowed `moveBy`: the same wrap / clamp / skip-disabled rules applied
   * to dataset indices. Bounded by `count` so a list where every row is
   * disabled terminates instead of spinning.
   */
  private _moveVirtual(delta: number): void {
    const src = this.virtual;
    if (!src) return;
    const count = src.count();
    if (count <= 0) return;
    const current = src.activeIndex();
    const start = current < 0 ? (delta > 0 ? -1 : count) : current;
    let next = start + delta;
    if (this.kjWrap()) next = ((next % count) + count) % count;
    else next = Math.min(Math.max(next, 0), count - 1);
    this._seekVirtual(next, delta >= 0 ? 1 : -1);
  }

  /**
   * Land the windowed cursor on `from`, or on the nearest navigable row in
   * `step`'s direction, wrapping when `kjWrap` allows it.
   */
  private _seekVirtual(from: number, step: 1 | -1): void {
    const src = this.virtual;
    if (!src) return;
    const count = src.count();
    if (count <= 0) return;
    const wrap = this.kjWrap();
    let i = Math.min(Math.max(from, 0), count - 1);
    for (let tried = 0; tried < count; tried++) {
      if (src.isNavigable(i)) {
        src.setActiveIndex(i);
        return;
      }
      i += step;
      if (i < 0 || i >= count) {
        if (!wrap) return;
        i = ((i % count) + count) % count;
      }
    }
  }

  /**
   * Move DOM focus onto the active item's host right now. Roving mode
   * only; no-op when nothing is active. Overlay panels call this once
   * they are rendered open so focus lands inside the popup even when the
   * active id did not change since the last open.
   */
  focusActive(): void {
    if (this.kjFocusMode() !== 'roving') return;
    const item = this.activeItem();
    if (item) this.focusHost(item);
  }

  /**
   * Invoke `_activate()` on the currently active item.
   * No-op when nothing is active.
   */
  activateCurrent(): void {
    if (this.virtual) {
      const i = this.virtual.activeIndex();
      if (i >= 0) this.virtual.activateIndex(i);
      return;
    }
    this.activeItem()?._activate();
  }

  /** Whether anything is currently active — a rendered item, or a windowed cursor. */
  private _hasActive(): boolean {
    return this.virtual ? this.virtual.activeIndex() >= 0 : this.activeItem() !== null;
  }

  private focusHost(item: KjListItem<unknown>): void {
    if (!this.isBrowser) return;
    const host = item._host();
    if (host && this.document.activeElement !== host) host.focus();
  }

  /**
   * @internal Roving mode: keep the active id aligned with the item the
   * user actually focused (pointer click on a row, Tab into the list, a
   * consumer calling `.focus()`), so the next arrow key moves from there.
   */
  _onFocusin(e: FocusEvent): void {
    if (this.kjFocusMode() !== 'roving') return;
    const target = e.target as Node | null;
    if (!target || target === this.host.nativeElement) return;
    // Exact host first; otherwise the deepest row that contains the target
    // (a nested tree node sits inside its parent's host, and a control
    // inside a row focuses the row it belongs to).
    let item: KjListItem<unknown> | null = null;
    for (const i of this.navigable()) {
      const host = i._host();
      if (host === target) { item = i; break; }
      if (host.contains(target)) item = i;
    }
    if (item) this.setActive(item.id);
  }

  /** @internal Keydown handler bound via host binding. */
  _onKeydown(e: KeyboardEvent): void {
    // A key already consumed below this host — by a nested navigator
    // (cascade sub-panel inside its parent panel) or a row's own handler —
    // is not handled a second time up here.
    if (e.defaultPrevented) return;
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
        // The caret wins in a text field that has one to move (APG combobox:
        // "if the textbox is editable, Home/End move the text cursor").
        if (ownedByTextCaret(e.target)) return;
        e.preventDefault();
        this.moveToFirst();
        return;
      case 'End':
        if (ownedByTextCaret(e.target)) return;
        e.preventDefault();
        this.moveToLast();
        return;
      case 'PageDown':
        if (ownedByTextCaret(e.target)) return;
        e.preventDefault();
        this.moveBy(this.kjPageSize());
        return;
      case 'PageUp':
        if (ownedByTextCaret(e.target)) return;
        e.preventDefault();
        this.moveBy(-this.kjPageSize());
        return;
      case 'Enter':
        // Only preventDefault when we actually activate. Lets consumers
        // (e.g. combobox free-text Enter) fall through when nothing is active.
        if (this._hasActive()) {
          e.preventDefault();
          this.activateCurrent();
        }
        return;
      case ' ':
        // Space activates a LIST — but in a text field it is a character the
        // user is typing, and the field owns it. A command palette highlights
        // a row for every query, so treating Space as activation there made
        // multi-word queries impossible: the space ran the highlighted command
        // instead of reaching the input. Enter remains the activation key from
        // a text field.
        if (isTextEntry(e.target)) return;
        if (this._hasActive()) {
          e.preventDefault();
          this.activateCurrent();
        }
        return;
      default: {
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        if (!this.typeAhead) return;
        // The active id is what lets a repeated letter CYCLE through the items
        // starting with it (APG) instead of searching for "aa".
        const id = this.typeAhead.match(e.key, this.navigable(), this._activeId());
        if (id) this.setActive(id);
      }
    }
  }
}

/** Types of `<input>` that hold text the user types (Space is a character). */
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/**
 * Whether the key belongs to the caret of the text field it landed in rather
 * than to the list. Applied to Home / End / PageUp / PageDown, which a
 * navigator hosted on a combobox `<input>` used to swallow: typing a query
 * then pressing Home jumped the highlight to the first row instead of moving
 * the cursor to the start of what you typed (APG combobox, listbox popup).
 *
 * An EMPTY field has no caret motion to preserve, so the list keeps the key —
 * which is what still lets Home / End reach the first / last row of a command
 * palette the moment it opens.
 */
function ownedByTextCaret(target: EventTarget | null): boolean {
  if (!isTextEntry(target)) return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return (el.textContent ?? '') !== '';
  return ((el as HTMLInputElement | HTMLTextAreaElement).value ?? '') !== '';
}

/** Whether a key event landed in a field where Space types a character. */
function isTextEntry(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  const type = (el as HTMLInputElement).type?.toLowerCase() ?? 'text';
  return !NON_TEXT_INPUT_TYPES.has(type);
}
