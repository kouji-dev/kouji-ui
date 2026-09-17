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
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjListItem, injectListItem } from '../primitives/list';
import { KjOverlayController } from '../primitives/overlay/controller';
import { KjId } from '../primitives/overlay/id';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import {
  KJ_DROPDOWN_MENU,
  type KjDropdownMenuCloseReason,
  type KjDropdownMenuContext,
} from '../dropdown-menu/dropdown-menu-trigger';
import { KJ_MENUBAR } from './menubar.context';
import type { KjMenubarItemContext } from './menubar.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * A top-level item in a `[kjMenubar]` — `role="menuitem"` with
 * `aria-haspopup="menu"`. Composes `KjListItem` so id, click + Enter/Space
 * activation, `aria-disabled`, and (via the bar's `KjListNavigator` in
 * roving mode) `tabindex` are owned by the primitive layer.
 *
 * Optionally opens a submenu via `[kjDropdownMenuTriggerFor]` — a
 * `TemplateRef` pointing at a `[kjDropdownMenu]` panel. Activation toggles
 * this item's submenu; the item provides the `KJ_DROPDOWN_MENU` context to
 * the projected panel, so activating a submenu item closes it, and the
 * overlay controller returns focus to the bar item on close. The projected
 * `[kjDropdownMenu]` owns its `role="menu"`; the item only gives the panel
 * an id when it has none, for `aria-controls`.
 *
 * The item's overlay controller lives on its element injector, so the
 * controller disposes itself — closing the submenu and releasing its stack
 * entry — when the item leaves the DOM.
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
export class KjMenubarItem implements KjMenubarItemContext, KjDropdownMenuContext {
  private readonly bar = injectParent(KJ_MENUBAR, { child: 'KjMenubarItem', parent: '[kjMenubar]' });
  private readonly destroyRef = inject(DestroyRef);
  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly idSvc = inject(KjId);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly controller = inject(KjOverlayController, { self: true });

  /**
   * Disable the item. Default `false`. Reflects `aria-disabled` (through the
   * composed `KjListItem` -> `KjDisabled`); the popup never opens.
   *
   * arch F-16: this input is NOT replaced by reading the composed
   * `KjDisabled` directly. `<kj-menubar-item>` re-exposes `kjDisabled`
   * through its own `hostDirectives`, and Angular only forwards an input a
   * host directive declares itself — deleting it would break the styled
   * wrapper. Both owners carry `booleanAttribute`, so they cannot disagree
   * (that divergence was arch F-2's real defect).
   */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /**
   * Template projecting the submenu panel. Activation renders the template
   * into a body portal anchored to this item's host element.
   */
  readonly kjDropdownMenuTriggerFor = input<TemplateRef<unknown> | null>(null);

  /**
   * Fires when the item is activated (click / Enter / Space), bridged from
   * the composed `KjListItem.activate` output. `KjListItem._activate` calls
   * `event.stopPropagation()` before this fires, so a `(click)` listener
   * placed on a parent element would not see the event — consumers wiring
   * an activation listener must use `(kjActivate)` instead.
   */
  readonly kjActivate = output<void>();

  // ── KjMenubarItemContext ─────────────────────────────────────────

  get el(): HTMLElement { return this.elRef.nativeElement; }
  readonly disabled = this.kjDisabled;
  readonly open = computed(() => this.controller.isOpen());
  readonly panelId = computed(() => this.controller.panelEl()?.id ?? null);

  private _view: EmbeddedViewRef<unknown> | null = null;
  private _strategiesReady = false;

  openPopup(): void {
    if (this.kjDisabled() || this.controller.isOpen()) return;
    if (!this._prepare()) return;
    this.controller.open();
  }

  closePopup(): void {
    if (this.controller.isOpen()) this.controller.close('programmatic');
  }

  // ── KjDropdownMenuContext (for the projected `[kjDropdownMenu]`) ──

  /** Activating a submenu item always closes the submenu. */
  readonly closeOnSelect = computed(() => true);

  /** Submenu-driven close (`KJ_DROPDOWN_MENU.hide`). */
  hide(reason: KjDropdownMenuCloseReason): void {
    if (!this.controller.isOpen()) return;
    this.controller.close(reason === 'item' ? 'select' : reason === 'escape' ? 'escape' : 'programmatic');
  }

  constructor() {
    this.bar.registerItem(this);

    // Route this item's own activation (click / Enter / Space, surfaced
    // by the composed `KjListItem`) to its own submenu — the bar's
    // `afterSelect` only knows the currently-focused item, which doesn't
    // identify the item that was actually clicked (focus may not have
    // moved yet, e.g. mouse click before focusin handling).
    //
    // Toggled through the controller so the semantics match every other
    // trigger: the item is the submenu's registered trigger, so a click on
    // it is never an "outside" press for `KjOverlayStack`; `toggle()`
    // closes an open submenu (`'trigger'` reason), opens a closed one, and
    // ignores the click that follows an outside press mid-close.
    //
    // When `kjDropdownMenuTriggerFor` is unset the item owns no popup of
    // its own; skip the toggle entirely so that a sibling
    // `[kjDropdownMenuTrigger]` directive composed on the same element can
    // own the overlay state without us racing it. (Both directives provide
    // `KjOverlayController` and Angular merges them into a single per-
    // element instance — calling `controller.close()` here would
    // immediately undo the trigger's `open()` from the same click.)
    const listItem = injectListItem<unknown>();
    listItem.activate.subscribe(() => {
      this.kjActivate.emit();
      if (!this.kjDropdownMenuTriggerFor()) return;
      if (this.kjDisabled()) return;
      if (!this._prepare()) return;
      this.controller.toggle();
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

    // The controller disposes itself with this element injector (closing
    // the submenu synchronously); the projected view goes after it.
    this.destroyRef.onDestroy(() => {
      this.bar.unregisterItem(this);
      this._view?.destroy();
      this._view = null;
    });
  }

  // ── Internal — panel mount + strategy wiring ─────────────────────

  /** Mounts the projected panel and attaches the strategies; `false` when there is nothing to open. */
  private _prepare(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const tpl = this.kjDropdownMenuTriggerFor();
    if (!tpl) return false;
    this._ensurePanelMounted(tpl);
    this._ensureStrategiesAttached();
    return true;
  }

  private _ensurePanelMounted(tpl: TemplateRef<unknown>): void {
    if (this._view) return;
    // The template is declared on the consumer, so its directives cannot
    // see this item's element injector. Hand the projected panel a menu
    // context explicitly, so `[kjDropdownMenu]` closes the submenu on
    // item activation.
    const injector = Injector.create({
      providers: [{ provide: KJ_DROPDOWN_MENU, useValue: this }],
      parent: this.injector,
    });
    this._view = this.vcr.createEmbeddedView(tpl, undefined, { injector });
    this._view.detectChanges();
    const panel = this._panelRoot();
    if (!panel) return;
    // `[kjDropdownMenu]` owns the role; an id is only minted when the
    // consumer gave the panel none, so `aria-controls` resolves.
    if (!panel.id) panel.id = this.idSvc.mint('menubar-panel');
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
