import {
  Directive,
  InjectionToken,
  booleanAttribute,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjCloseReason } from '../primitives/overlay/types';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { onContextMenu } from '../primitives/overlay/strategies/trigger-event/on-context-menu';
import {
  switchableTriggerEvent,
  type KjSwitchableTriggerStrategy,
} from '../primitives/overlay/strategies/trigger-event/compose';
import { mintKjId } from '../primitives/overlay/id';

/** Trigger event mode. `'click'` (default) or `'contextmenu'` (right-click / long-press). */
export type KjDropdownMenuTriggerKind = 'click' | 'contextmenu';

/** How and where the panel mounts: portal (default), at a point, or inline (in-place). */
export type KjDropdownMenuMount = 'portal' | 'point' | 'inline';

/** Reason a dropdown menu close was requested. */
export type KjDropdownMenuCloseReason =
  | 'item'
  | 'escape'
  | 'tab'
  | 'click-outside'
  | 'programmatic';

/** The overlay close reason a menu-level reason maps to (`'item'` → `'select'`, `'click-outside'` → `'outside'`). */
export function menuCloseReasonToOverlay(reason: KjDropdownMenuCloseReason): KjCloseReason {
  switch (reason) {
    case 'item': return 'select';
    case 'click-outside': return 'outside';
    case 'escape': return 'escape';
    case 'tab': return 'tab';
    default: return 'programmatic';
  }
}

/**
 * The menu-level reason an overlay close reason maps to: a press outside the
 * panel or on a scrim is `'click-outside'`, a selection is `'item'`, the
 * trigger toggling it closed or an API call is `'programmatic'`.
 */
export function overlayCloseReasonToMenu(reason: KjCloseReason | null): KjDropdownMenuCloseReason {
  switch (reason) {
    case 'select': return 'item';
    case 'outside':
    case 'backdrop': return 'click-outside';
    case 'escape': return 'escape';
    case 'tab': return 'tab';
    default: return 'programmatic';
  }
}

/**
 * Minimal context surface consumed by item-level directives
 * (`KjDropdownMenuItem`, etc.). The trigger directive provides this token.
 */
export interface KjDropdownMenuContext {
  readonly closeOnSelect: Signal<boolean>;
  hide(reason: KjDropdownMenuCloseReason): void;
}

/** DI token for the dropdown menu shared context (item-level). */
export const KJ_DROPDOWN_MENU = new InjectionToken<KjDropdownMenuContext>(
  'KjDropdownMenu',
);

/** Allocate a stable label id for `aria-labelledby` wiring on a group. */
export function nextDropdownMenuLabelId(): string {
  return mintKjId('dropdown-menu-label');
}

/**
 * The button that opens a dropdown menu. Composes `KjOverlayTrigger`.
 *
 * `kjTrigger` switches between `onClick()` (default) and `onContextMenu()`
 * (replacement for the old `KjContextMenuTrigger`) — reactively, through a
 * switchable trigger-event slot, so the binding may change after
 * construction. For `kjMount="point"`, the trigger captures the originating
 * pointer coords into signals consumed by `pointAt()` in the content
 * component.
 *
 * Wires `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` via the
 * underlying `KjOverlayTrigger` host directive. `kjMenuClosed` reports every
 * close with its reason — an item activation, Escape, a press outside the
 * panel, or an API / trigger toggle — from the overlay controller's
 * `closeReason`.
 *
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjDropdownMenuTrigger]',
  exportAs: 'kjDropdownMenuTrigger',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayTrigger, inputs: ['kjOpen'] }],
  providers: [
    KjOverlayController,
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      // The concrete strategy follows `kjTrigger` (see the constructor);
      // the popup kind is fixed, so `aria-haspopup` is known up front.
      useFactory: () => switchableTriggerEvent({ ariaHasPopup: 'menu' }),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'menu' as const },
    { provide: KJ_DROPDOWN_MENU, useExisting: KjDropdownMenuTrigger },
  ],
  host: {
    '(click)': 'onPointer($event)',
    '(contextmenu)': 'onPointer($event)',
  },
})
export class KjDropdownMenuTrigger implements KjDropdownMenuContext {
  /** Public — read by sibling `[kjFor]` panels. */
  readonly controller = inject(KjOverlayController);
  private readonly triggerSlot = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY) as KjSwitchableTriggerStrategy;

  /** Trigger event kind. */
  readonly kjTrigger = input<KjDropdownMenuTriggerKind>('click');

  /** Mount mode for the content panel. */
  readonly kjMount = input<KjDropdownMenuMount>('portal');

  /** Suppresses opening entirely. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Whether item activation closes the menu by default. */
  readonly kjCloseOnSelect = input(true, { transform: booleanAttribute });

  /** Emitted when the menu closes, with the reason. */
  readonly kjMenuClosed = output<KjDropdownMenuCloseReason>();

  /** Captured pointer coordinates for `kjMount="point"`. */
  readonly kjPointX = signal<number>(0);
  readonly kjPointY = signal<number>(0);

  /** Mirror exposed to item directives via `KJ_DROPDOWN_MENU`. */
  readonly closeOnSelect = this.kjCloseOnSelect;

  constructor() {
    effect(() => {
      const kind = this.kjTrigger();
      untracked(() => this.triggerSlot.use(kind === 'contextmenu' ? onContextMenu({ longPressMs: 500 }) : onClick()));
    });

    // One close notification per close, whoever asked for it.
    let wasOpen = false;
    effect(() => {
      const isOpen = this.controller.isOpen();
      if (wasOpen && !isOpen) {
        const reason = untracked(() => this.controller.closeReason());
        this.kjMenuClosed.emit(overlayCloseReasonToMenu(reason));
      }
      wasOpen = isOpen;
    });
  }

  /** Capture pointer coords for point-mount; the strategy reads them. */
  protected onPointer(e: MouseEvent): void {
    if (this.kjMount() === 'point') {
      this.kjPointX.set(e.clientX);
      this.kjPointY.set(e.clientY);
    }
  }

  /** Item-driven close (`KJ_DROPDOWN_MENU.hide`). */
  hide(reason: KjDropdownMenuCloseReason): void {
    this.controller.close(menuCloseReasonToOverlay(reason));
  }

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
