import {
  DestroyRef,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  Injector,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjListItem, injectListItem } from '../primitives/list';
import { KjOverlayController } from '../primitives/overlay/controller';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { KJ_MENUBAR } from './menubar.context';
import type { KjMenubarItemContext } from './menubar.context';

let _menubarPanelId = 0;

/**
 * A top-level item in a `[kjMenubar]` — `role="menuitem"` with
 * `aria-haspopup="menu"`. Composes `KjListItem` so id, click + Enter/Space
 * activation, `aria-disabled`, and (via the bar's `KjListNavigator` in
 * roving mode) `tabindex` are owned by the primitive layer.
 *
 * Optionally opens a submenu via `[kjDropdownMenuTriggerFor]` — a
 * `TemplateRef` pointing at a `[kjDropdownMenu]` panel. The bar's
 * `afterSelect` opens this item's submenu on activation.
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name menubar
 */
@Directive({
  selector: '[kjMenubarItem]',
  standalone: true,
  exportAs: 'kjMenubarItem',
  hostDirectives: [
    { directive: KjListItem, inputs: ['kjDisabled:kjDisabled'] },
  ],
  providers: [KjOverlayController],
  host: {
    'role': 'menuitem',
    'aria-haspopup': 'menu',
    '[attr.aria-expanded]': 'open() ? "true" : "false"',
    '[attr.aria-controls]': 'panelId() || null',
    '[attr.data-state]': 'open() ? "active" : "inactive"',
  },
})
export class KjMenubarItem implements KjMenubarItemContext {
  private readonly bar = inject(KJ_MENUBAR);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly controller = inject(KjOverlayController, { self: true });

  /** Disable the item. Reflects `aria-disabled`; popup never opens. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /**
   * Template projecting the submenu panel. Activation renders the template
   * into a body portal anchored to this item's host element.
   */
  readonly kjDropdownMenuTriggerFor = input<TemplateRef<unknown> | null>(null);

  // ── KjMenubarItemContext ─────────────────────────────────────────

  get el(): HTMLElement { return this.elRef.nativeElement; }
  readonly disabled = this.kjDisabled;
  readonly open = computed(() => this.controller.isOpen());
  readonly panelId = computed(() => this.controller.panelEl()?.id ?? null);

  private _view: EmbeddedViewRef<unknown> | null = null;
  private _strategiesReady = false;

  openPopup(): void {
    if (this.kjDisabled() || this.controller.isOpen()) return;
    if (!isPlatformBrowser(this.platformId)) return;
    const tpl = this.kjDropdownMenuTriggerFor();
    if (!tpl) return;
    this._ensurePanelMounted(tpl);
    this._ensureStrategiesAttached();
    this.controller.open();
  }

  closePopup(): void {
    if (this.controller.isOpen()) this.controller.close('programmatic');
  }

  constructor() {
    this.bar.registerItem(this);

    // Route this item's own activation (click / Enter / Space, surfaced
    // by the composed `KjListItem`) to its own submenu — the bar's
    // `afterSelect` only knows the currently-focused item, which doesn't
    // identify the item that was actually clicked (focus may not have
    // moved yet, e.g. mouse click before focusin handling).
    const listItem = injectListItem<unknown>();
    listItem.activate.subscribe(() => {
      if (this.controller.isOpen()) this.closePopup();
      else this.openPopup();
    });

    // Mirror the controller's open/close state into the bar's tracker —
    // single source of truth for kjOpenChange and single-open invariant.
    // Tracked across two cycles so a stale 'closed' from before the first
    // open doesn't fire `notifyItemClosed` and clobber the bar's state.
    let last: boolean | null = null;
    effect(() => {
      const isOpen = this.controller.isOpen();
      if (last === isOpen) return;
      last = isOpen;
      if (isOpen) this.bar.notifyItemOpened(this);
      else this.bar.notifyItemClosed(this);
      // Tag the panel's overlay-surface marker only while open. The
      // body-portal mount strategy returns the panel to its original
      // parent on close — leaving `data-kj-overlay` on a hidden panel
      // would let test introspection + ARIA queries find a stale
      // "open" overlay that is in fact closed.
      const panel = this._panelRoot();
      if (panel) {
        if (isOpen) panel.setAttribute('data-kj-overlay', '');
        else panel.removeAttribute('data-kj-overlay');
      }
    });

    this.destroyRef.onDestroy(() => {
      this.bar.unregisterItem(this);
      try { this.controller.dispose(); } catch { /* already disposed */ }
      this._view?.destroy();
      this._view = null;
    });
  }

  // ── Internal — panel mount + strategy wiring ─────────────────────

  private _ensurePanelMounted(tpl: TemplateRef<unknown>): void {
    if (this._view) return;
    this._view = this.vcr.createEmbeddedView(tpl);
    this._view.detectChanges();
    const panel = this._panelRoot();
    if (!panel) return;
    // The projected `<div kjDropdownMenu>` is just a config provider — it
    // does not set `role="menu"` (only the service-launched
    // `<kj-dropdown-menu-content>` does, via `KJ_OVERLAY_PANEL_ROLE`).
    // The menubar projects raw templates, so stamp the role + an id
    // here so consumers and `aria-controls` work out of the box.
    if (!panel.hasAttribute('role')) panel.setAttribute('role', 'menu');
    if (!panel.id) panel.id = `kj-menubar-panel-${++_menubarPanelId}`;
    this.controller.bindPanel(panel);
  }

  private _ensureStrategiesAttached(): void {
    if (this._strategiesReady) return;
    const triggerSig = signal<HTMLElement | null>(this.elRef.nativeElement);
    this.controller.bindTrigger(this.elRef.nativeElement);
    this.controller.attachStrategies({
      mount: bodyPortal(),
      position: anchoredTo({
        trigger: triggerSig,
        side: 'bottom',
        align: 'start',
      }),
    });
    this._strategiesReady = true;
  }

  private _panelRoot(): HTMLElement | null {
    if (!this._view) return null;
    for (const node of this._view.rootNodes) {
      if (node instanceof HTMLElement) return node;
    }
    return null;
  }
}
