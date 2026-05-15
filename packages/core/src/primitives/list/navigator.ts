// packages/core/src/primitives/list/navigator.ts
import {
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
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
  host: {
    '[attr.aria-activedescendant]': 'activeId()',
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

  /** Fires when the active item changes. Emits the new id or `null`. */
  readonly kjActiveChange = output<string | null>();

  private readonly cfg = inject(KJ_LIST_NAVIGATOR_CONFIG);
  private readonly typeAhead = inject(KjTypeAhead, { optional: true });
  private readonly el = inject(ElementRef<HTMLElement>);

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

  /**
   * The resolved active item object, or `null` when nothing is active.
   * Derived from `activeId` and the current navigable set.
   */
  readonly activeItem = computed<KjListItem<unknown> | null>(() => {
    const id = this._activeId();
    return id ? this.navigable().find(i => i.id === id) ?? null : null;
  });

  /**
   * Set the active item by id.
   * No-op when the id is unchanged; emits `kjActiveChange` on change.
   * Also imperatively updates `aria-activedescendant` on the host element
   * so the DOM reflects the change synchronously (before change detection).
   */
  setActive(id: string | null): void {
    if (this._activeId() === id) return;
    this._activeId.set(id);
    // Imperatively sync the DOM attribute so tests and zoneless consumers
    // see the update without waiting for a CD cycle.
    const host = this.el.nativeElement;
    if (id) {
      host.setAttribute('aria-activedescendant', id);
    } else {
      host.removeAttribute('aria-activedescendant');
    }
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
