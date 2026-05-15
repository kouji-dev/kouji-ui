import {
  Directive,
  contentChildren,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListItem,
  type KjCompareFn,
  type KjListNavigatorConfig,
} from '../primitives/list';
import {
  KJ_DROPDOWN_MENU,
  type KjDropdownMenuContext,
} from './dropdown-menu-trigger';

/**
 * Root container for a dropdown menu's projected items. Used by consumers
 * that render the panel content inline (e.g. inside a `<ng-template>` passed
 * to `[kjDropdownMenuTriggerFor]` from `KjMenubar`) instead of through the
 * `<kj-dropdown-menu-content>` component.
 *
 * Implements {@link KjListNavigatorConfig} so that any `KjListNavigator`
 * mounted on a wrapping panel can discover the projected `KjListItem`s and
 * drive WAI-ARIA APG menu keyboard navigation (Up/Down/Home/End/type-ahead)
 * + roving DOM focus. A menu has no selection model — items are actions —
 * so `value` / `mode` are omitted from the config. The `afterSelect` hook
 * closes the surrounding overlay (universal menu UX).
 *
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjDropdownMenu]',
  standalone: true,
  exportAs: 'kjDropdownMenu',
  providers: [
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => KjDropdownMenu) },
  ],
})
export class KjDropdownMenu implements KjListNavigatorConfig {
  /** All `KjListItem`s under this root. Source of truth for nav + type-ahead. */
  readonly items = contentChildren(KjListItem, { descendants: true });

  /** Menu items are actions — no selection model. Kept as `Object.is`. */
  readonly compareBy = signal<KjCompareFn<unknown>>(Object.is as KjCompareFn<unknown>);

  /** Parent menu context (trigger or content), if any. Drives close-on-activate. */
  private readonly ctx = inject<KjDropdownMenuContext>(KJ_DROPDOWN_MENU, { optional: true });

  /**
   * Universal menu UX: any item activation closes the menu. `KjListItem`
   * calls this with `closeRequested=false` since no `KjSelectionModel` is
   * provided — we override the flag and always close.
   */
  afterSelect(_value: unknown, _closeRequested: boolean): void {
    this.ctx?.hide('item');
  }
}
