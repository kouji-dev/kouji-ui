import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListNavigator,
  KjSelectionModel,
} from '../primitives/list';

/**
 * Focus contract of a popup that hosts a roving `KjListNavigator` behind a
 * `KjOverlayPanel` — the select listbox, the tree-select tree and the
 * cascade-select tree (WAI-ARIA APG "select-only combobox" / "tree"):
 *
 * - **Open** → once the panel is rendered, DOM focus moves onto the row
 *   that is selected. When the selection sits on a row this panel cannot
 *   reach (a leaf under a collapsed tree branch, a leaf inside a cascade
 *   sub-panel) focus lands on its nearest reachable ancestor instead; with
 *   no selection at all it lands on the first navigable row.
 * - **Close** (Escape, selection, outside press, programmatic) → when focus
 *   is still inside the panel, or was dropped on `<body>`, it returns to
 *   the trigger. Focus the user already moved elsewhere is left alone.
 * - **Tab** → closes the panel and puts focus back on the trigger without
 *   cancelling the key, so the browser carries on to the element after the
 *   trigger (Shift+Tab: before it).
 *
 * Compose via `hostDirectives` after `KjOverlayPanel` and `KjListNavigator`;
 * the navigator must run in `'roving'` mode.
 *
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjListPanelFocus]',
  standalone: true,
  host: {
    '(keydown)': '_onKeydown($event)',
  },
})
export class KjListPanelFocus {
  private readonly panel = inject(KjOverlayPanel, { self: true });
  private readonly nav = inject(KjListNavigator, { self: true });
  private readonly cfg = inject(KJ_LIST_NAVIGATOR_CONFIG);
  private readonly selection = inject(KjSelectionModel, { optional: true }) as
    | KjSelectionModel<unknown>
    | null;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    let wasOpen = false;
    effect(() => {
      const open = this.panel.controller?.isOpen() ?? false;
      if (open === wasOpen) return;
      wasOpen = open;
      if (!this.isBrowser) return;
      if (open) {
        // The panel's `hidden` attribute is only cleared by the render that
        // follows the state change; a hidden element cannot take focus.
        afterNextRender(() => this.focusIn(), { injector: this.injector });
      } else {
        untracked(() => this.returnFocus());
      }
    });
  }

  /**
   * Move focus back to the trigger when it still sits inside the panel or
   * was lost to `<body>`. No-op when the user already focused something
   * else (a pointer press on another control, for instance).
   */
  returnFocus(): void {
    if (!this.isBrowser) return;
    const active = this.document.activeElement;
    const nowhere = !active || active === this.document.body;
    if (!nowhere && !this.host.nativeElement.contains(active)) return;
    this.panel.controller?.triggerEl()?.focus();
  }

  /** @internal Tab leaves the popup: close it and hand focus back to the trigger first. */
  _onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const controller = this.panel.controller;
    if (!controller?.isOpen()) return;
    controller.close('programmatic');
    controller.triggerEl()?.focus();
  }

  private focusIn(): void {
    if (!this.panel.controller?.isOpen()) return;
    const id = this.preferredId();
    if (id) this.nav.setActive(id);
    else this.nav.moveToFirst();
    this.nav.focusActive();
  }

  /**
   * Row to land on when the panel opens: the selected row when it is
   * navigable here, else the deepest navigable ancestor of a selected
   * value, else `null` (first row).
   */
  private preferredId(): string | null {
    const selection = this.selection;
    if (!selection) return null;
    const navigable = this.nav.navigable();
    const selected = navigable.find(i => {
      const v = i.value();
      return v !== undefined && selection.isSelected(v);
    });
    if (selected) return selected.id;

    const eq = this.cfg.compareBy?.() ?? (Object.is as (a: unknown, b: unknown) => boolean);
    for (const item of this.cfg.items()) {
      const v = item.value();
      if (v === undefined || !selection.isSelected(v)) continue;
      const path = selection.pathTo(v);
      for (let depth = path.length - 2; depth >= 0; depth--) {
        const ancestor = navigable.find(i => {
          const iv = i.value();
          return iv !== undefined && eq(iv, path[depth]);
        });
        if (ancestor) return ancestor.id;
      }
    }
    return null;
  }
}
