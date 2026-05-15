import {
  Component,
  ChangeDetectionStrategy,
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
  KjDropdownMenuTrigger,
  KJ_DROPDOWN_MENU,
  type KjDropdownMenuCloseReason,
  type KjDropdownMenuContext,
} from './dropdown-menu-trigger';

type KjDeferredMount = KjMountStrategy & { setDelegate(d: KjMountStrategy): void };
type KjDeferredPosition = KjPositionStrategy & { setDelegate(d: KjPositionStrategy): void };

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
      if (typeof document === 'undefined') return null as unknown as HTMLElement;
      return document.body;
    },
    setDelegate(d) {
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
      delegate = d;
      if (attached && ctx) d.attach(ctx);
      if (opened) d.onOpen?.();
    },
  };
}

/**
 * The dropdown-menu content panel. Composes `KjOverlayPanel` and dispatches
 * mount + position strategies based on `kjMount`:
 *
 * - `'portal'` (default) — `bodyPortal()` + `anchoredTo(trigger, side, align)`
 * - `'point'`            — `bodyPortal()` + `pointAt({x, y})` (right-click / context-menu)
 * - `'inline'`           — `inPlace()`    + `inPlaceSibling()`
 *
 * Sets `role="menu"` via the panel role token. Composes
 * `KjListNavigator{kjOrientation:'vertical', kjFocusMode:'roving'}` and
 * provides `KjTypeAhead`, so projected `[kjDropdownMenuItem]`s get the
 * full WAI-ARIA APG menu keyboard contract (Up/Down/Home/End/type-ahead)
 * + roving DOM focus for free. Implements {@link KjListNavigatorConfig}
 * — items are actions, no selection model.
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
    // Force roving focus mode at the element injector. `KjListNavigator`
    // also provides this token (driven by its own `kjFocusMode` input,
    // which defaults to `'activedescendant'`). Overriding here means
    // `KjListItem`s under this content compute their `tabindex` from a
    // signal that always reads `'roving'` — independent of whether the
    // consumer remembered to set `kjFocusMode` on the navigator.
    {
      provide: KJ_LIST_FOCUS_MODE,
      useFactory: () => signal<KjListFocusMode>('roving'),
    },
    KjTypeAhead,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-dropdown-menu',
    // The KjListNavigator host directive reads `kjOrientation` and
    // `kjFocusMode` as signal inputs; setting the matching static
    // attributes here seeds their initial values for the menu pattern
    // (vertical orientation + roving DOM focus per WAI-ARIA APG).
    'kjOrientation': 'vertical',
    'kjFocusMode': 'roving',
    '(keydown.escape)': 'onEscape($event)',
  },
  template: `<ng-content />`,
})
export class KjDropdownMenuContent implements KjDropdownMenuContext, KjListNavigatorConfig {
  readonly kjSide  = input<KjSide>('bottom');
  readonly kjAlign = input<KjAlign>('start');
  readonly kjMount = input<'portal' | 'point' | 'inline'>('portal');

  // ── KjListNavigatorConfig ────────────────────────────────────────────
  /** All `KjListItem`s projected into the menu panel. */
  readonly items = contentChildren(KjListItem, { descendants: true });
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
  private _panelCache: KjOverlayPanel | null | undefined = undefined;
  private get _panel(): KjOverlayPanel | null {
    if (this._panelCache === undefined) {
      this._panelCache = this._injector.get(KjOverlayPanel, null);
    }
    return this._panelCache;
  }

  /** Mirror of trigger's closeOnSelect — defaults to true; trigger overrides via its own provider. */
  readonly closeOnSelect = computed(() => true);

  /** Item-driven close. Routes through the panel's controller (resolved via `kjFor`). */
  hide(_reason: KjDropdownMenuCloseReason): void {
    this._panel?.controller?.close('programmatic');
  }

  /** Escape key — closes the menu. KjListNavigator does not own Escape. */
  protected onEscape(event: KeyboardEvent): void {
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
    const trigDir = inject(KjDropdownMenuTrigger, { optional: true });
    const m = this.kjMount();
    if (m === 'inline') {
      mount.setDelegate(inPlace());
      position.setDelegate(inPlaceSibling());
    } else if (m === 'point' && trigDir) {
      mount.setDelegate(bodyPortal());
      position.setDelegate(pointAt({ x: trigDir.kjPointX, y: trigDir.kjPointY }));
    } else {
      mount.setDelegate(bodyPortal());
      position.setDelegate(anchoredTo({ side: this.kjSide, align: this.kjAlign }));
    }

    // Roving seed: when nothing is active yet (e.g. just-opened menu),
    // point the navigator at the first non-disabled item so its host
    // gets `tabindex=0` and is reachable by Tab. Mirrors the seed effect
    // inside `KjListNavigator` for the `'roving'` focus mode — needed
    // here because the navigator's own seed gates on `kjFocusMode()`,
    // which stays at the directive's default `'activedescendant'`
    // (host-directive inputs cannot be defaulted from this component).
    effect(() => {
      const items = this.items();
      const nav = this.getNav();
      if (!nav) return;
      if (nav.activeId() !== null) return;
      const first = items.find(i => !i.disabled());
      if (first) untracked(() => nav.setActive(first.id));
    });

    // Roving focus follow: move DOM focus onto the active item's host.
    // Same rationale as the seed effect — the navigator's own
    // focus-follow effect gates on `kjFocusMode() === 'roving'`.
    effect(() => {
      const nav = this.getNav();
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
