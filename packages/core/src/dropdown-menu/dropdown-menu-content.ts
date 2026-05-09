import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  Injector,
  computed,
  inject,
  input,
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
import { KjRovingTabindex } from '../a11y/roving-tabindex';
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
      return delegate?.resolveContainer() ?? document.body;
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
 * Sets `role="menu"` via the panel role token (provided by the trigger).
 *
 * @doc-category Core/Overlay
 */
@Component({
  selector: 'kj-dropdown-menu-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    { directive: KjRovingTabindex, inputs: ['kjRovingOrientation'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'menu' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => deferredMount() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => deferredPosition() },
    { provide: KJ_DROPDOWN_MENU, useExisting: KjDropdownMenuContent },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-dropdown-menu' },
  template: `<ng-content />`,
})
export class KjDropdownMenuContent implements KjDropdownMenuContext {
  readonly kjSide  = input<KjSide>('bottom');
  readonly kjAlign = input<KjAlign>('start');
  readonly kjMount = input<'portal' | 'point' | 'inline'>('portal');

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
  }
}
