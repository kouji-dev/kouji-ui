import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewEncapsulation,
  Injector,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type {
  KjMountStrategy,
  KjPositionStrategy,
} from '../primitives/overlay/tokens';
import type { KjOverlayContext } from '../primitives/overlay/context';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { inPlace } from '../primitives/overlay/strategies/mount/in-place';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { pointAt } from '../primitives/overlay/strategies/position/point-at';
import { inPlaceSibling } from '../primitives/overlay/strategies/position/in-place-sibling';
import {
  KJ_LIST_FOCUS_MODE_DEFAULT,
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListItem,
  ownListItems,
  KjListNavigator,
  KjTypeAhead,
  type KjCompareFn,
  type KjListNavigatorConfig,
} from '../primitives/list';
import {
  KjDropdownMenuTrigger,
  KJ_DROPDOWN_MENU,
  menuCloseReasonToOverlay,
  type KjDropdownMenuCloseReason,
  type KjDropdownMenuContext,
  type KjDropdownMenuMount,
} from './dropdown-menu-trigger';
import { DOCUMENT } from '@angular/common';

type KjDeferredMount = KjMountStrategy & { setDelegate(d: KjMountStrategy): void };
type KjDeferredPosition = KjPositionStrategy & { setDelegate(d: KjPositionStrategy): void };

/**
 * A mount slot whose concrete strategy is chosen after construction (the
 * DI factory runs before the component's inputs are set). `setDelegate`
 * may run again when the input changes: the previous delegate is closed
 * (if the overlay is open) and detached, the new one attached and opened.
 */
function deferredMount(): KjDeferredMount {
  let ctx: KjOverlayContext | null = null;
  let delegate: KjMountStrategy | null = null;
  let attached = false;
  let opened = false;
  return {
    get portalled() { return delegate?.portalled ?? true; },
    attach(c) { ctx = c; attached = true; if (delegate) delegate.attach(c); },
    onOpen() { opened = true; delegate?.onOpen?.(); },
    onClose() { opened = false; delegate?.onClose?.(); },
    detach() { delegate?.detach(); ctx = null; attached = false; },
    resolveContainer() {
      const from = delegate?.resolveContainer();
      if (from) return from;
      return (ctx?.panelEl()?.ownerDocument ?? ctx?.triggerEl()?.ownerDocument)
        ?.body as HTMLElement;
    },
    setDelegate(d) {
      if (delegate === d) return;
      if (delegate) {
        if (opened) delegate.onClose?.();
        delegate.detach();
      }
      delegate = d;
      if (attached && ctx) d.attach(ctx);
      if (opened) d.onOpen?.();
    },
  };
}

function deferredPosition(): KjDeferredPosition {
  let ctx: KjOverlayContext | null = null;
  let delegate: KjPositionStrategy | null = null;
  let attached = false;
  let opened = false;
  return {
    attach(c) { ctx = c; attached = true; if (delegate) delegate.attach(c); },
    onOpen() { opened = true; delegate?.onOpen?.(); },
    onClose() { opened = false; delegate?.onClose?.(); },
    update() { delegate?.update(); },
    detach() { delegate?.detach(); ctx = null; attached = false; },
    setDelegate(d) {
      if (delegate === d) return;
      if (delegate) {
        if (opened) delegate.onClose?.();
        delegate.detach();
      }
      delegate = d;
      if (attached && ctx) d.attach(ctx);
      if (opened) { d.onOpen?.(); d.update(); }
    },
  };
}

/**
 * The dropdown-menu content panel. Composes `KjOverlayPanel` and dispatches
 * mount + position strategies based on `kjMount`, reactively — the delegate
 * is picked in an effect once the input is bound, and again if it changes:
 *
 * - `'portal'` (default) — `bodyPortal()` + `anchoredTo(trigger, side, align)`
 * - `'point'`            — `bodyPortal()` + `pointAt({x, y})` (right-click / context-menu);
 *                          the point comes from the `[kjDropdownMenuTrigger]` bound via
 *                          `[kjFor]` (or an enclosing one)
 * - `'inline'`           — `inPlace()`    + `inPlaceSibling()`
 *
 * Sets `role="menu"` via the panel role token. Composes `KjListNavigator` —
 * whose own default orientation is already vertical — in the roving focus
 * model (`KJ_LIST_FOCUS_MODE_DEFAULT`) and provides `KjTypeAhead`, so projected
 * `[kjDropdownMenuItem]`s get the full WAI-ARIA APG menu keyboard contract
 * (Up/Down/Home/End/type-ahead) + roving DOM focus for free. Implements
 * {@link KjListNavigatorConfig} — items are actions, no selection model.
 *
 * @doc-category Core/Overlay
 */
@Component({
  selector: 'kj-dropdown-menu-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    {
      directive: KjListNavigator,
      inputs: ['kjOrientation', 'kjFocusMode'],
    },
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'menu' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => deferredMount() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => deferredPosition() },
    { provide: KJ_DROPDOWN_MENU, useExisting: KjDropdownMenuContent },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => KjDropdownMenuContent) },
    // Roving DOM focus per WAI-ARIA APG menu: seeds the composed navigator's
    // `kjFocusMode` (a template binding still wins), which owns the tab-stop
    // seed and the focus-follow on activation.
    { provide: KJ_LIST_FOCUS_MODE_DEFAULT, useValue: 'roving' },
    KjTypeAhead,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-dropdown-menu',
    '(keydown.escape)': 'onEscape($event)',
  },
  template: `<ng-content />`,
})
export class KjDropdownMenuContent implements KjDropdownMenuContext, KjListNavigatorConfig {
  /** Preferred side of the trigger the menu opens on. Default `'bottom'`. */
  readonly kjSide  = input<KjSide>('bottom');
  /** Alignment along that side. Default `'start'`. */
  readonly kjAlign = input<KjAlign>('start');
  /** Where the panel is mounted: portalled to the overlay container, or in place. Default `'portal'`. */
  readonly kjMount = input<KjDropdownMenuMount>('portal');

  // ── KjListNavigatorConfig ────────────────────────────────────────────
  /**
   * Raw content query. `descendants: true` reaches straight through a
   * list composite nested inside this menu panel, so it is never read
   * directly — `items` narrows it to this container's own scope.
   */
  private readonly allItems = contentChildren(KjListItem, { descendants: true });
  /**
   * All `KjListItem`s projected into the menu panel.
   *
   * Items owned by a list composite nested inside this one (a select
   * inside a palette, a menu inside a select) answer to that composite,
   * not to this one.
   */
  readonly items = ownListItems(this, this.allItems);
  /** Menu items are actions — no selection model. Kept as `Object.is`. */
  readonly compareBy = signal<KjCompareFn<unknown>>(Object.is as KjCompareFn<unknown>);
  /**
   * Universal menu UX: any item activation closes the menu. `KjListItem`
   * calls this with `closeRequested=false` since no `KjSelectionModel` is
   * provided — we override the flag and always close.
   */
  afterSelect(_value: unknown, _closeRequested: boolean): void {
    this.hide('item');
  }

  private readonly _injector = inject(Injector);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private _panelCache: KjOverlayPanel | null | undefined = undefined;
  private get _panel(): KjOverlayPanel | null {
    if (this._panelCache === undefined) {
      this._panelCache = this._injector.get(KjOverlayPanel, null);
    }
    return this._panelCache;
  }

  /** Mirror of trigger's closeOnSelect — defaults to true; trigger overrides via its own provider. */
  readonly closeOnSelect = computed(() => true);

  /** Item-driven close. Routes through the panel's controller (resolved via `kjFor`) with the matching overlay reason. */
  hide(reason: KjDropdownMenuCloseReason): void {
    this._panel?.controller?.close(menuCloseReasonToOverlay(reason));
  }

  /** Escape key — closes the menu. KjListNavigator does not own Escape. */
  protected onEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.hide('escape');
  }

  /**
   * Lazily-resolved reference to the composed `KjListNavigator`. Resolved
   * inside effects (not at construction) to avoid the
   * `KjListNavigator <-> KJ_LIST_NAVIGATOR_CONFIG (useExisting this) <-> KjListNavigator`
   * NG0200 cycle that synchronous injection of `KjListNavigator` would
   * trigger at the element injector.
   */
  private _navCache: KjListNavigator | null = null;
  private getNav(): KjListNavigator | null {
    if (this._navCache) return this._navCache;
    this._navCache = this._injector.get(KjListNavigator, null, { self: true });
    return this._navCache;
  }

  constructor() {
    const mount = inject(KJ_OVERLAY_MOUNT_STRATEGY) as KjDeferredMount;
    const position = inject(KJ_OVERLAY_POSITION_STRATEGY) as KjDeferredPosition;
    // The trigger is a sibling in the usual composition, reached through
    // `[kjFor]`; an enclosing trigger element is honoured as well.
    const enclosingTrigger = inject(KjDropdownMenuTrigger, { optional: true });

    // Delegate selection tracks `kjMount` (and, for a point menu, the
    // trigger bound through `kjFor`): inputs are not populated at
    // construction, so reading them there would pin the default forever.
    effect(() => {
      const m = this.kjMount();
      const bound = this._panel?.kjFor();
      const trigger = enclosingTrigger ?? (bound instanceof KjDropdownMenuTrigger ? bound : null);
      untracked(() => {
        if (m === 'inline') {
          mount.setDelegate(inPlace());
          position.setDelegate(inPlaceSibling());
        } else if (m === 'point' && trigger) {
          mount.setDelegate(bodyPortal());
          position.setDelegate(pointAt({ x: trigger.kjPointX, y: trigger.kjPointY }));
        } else {
          mount.setDelegate(bodyPortal());
          position.setDelegate(anchoredTo({ side: this.kjSide, align: this.kjAlign }));
        }
      });
    });

    // Initial focus: the navigator seeds the tab stop while the panel is
    // still hidden, where a browser ignores `focus()`. Move focus onto it
    // once the overlay is open so a keyboard user lands on the first item
    // (WAI-ARIA APG menu button) instead of stranded on the trigger. Focus
    // the user already moved into the menu is left alone; the controller
    // returns it to the trigger on close.
    effect(() => {
      if (this._panel?.controller?.state() !== 'open') return;
      untracked(() => {
        if (this.hostEl.contains(this.document.activeElement)) return;
        this.getNav()?.focusActive();
      });
    });
  }
}
