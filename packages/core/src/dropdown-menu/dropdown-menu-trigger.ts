import {
  Directive,
  ElementRef,
  InjectionToken,
  booleanAttribute,
  inject,
  input,
  output,
  signal,
  type Signal,
} from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { onContextMenu } from '../primitives/overlay/strategies/trigger-event/on-context-menu';

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

let _labelIdCounter = 0;
/** Allocate a stable label id for `aria-labelledby` wiring on a group. */
export function nextDropdownMenuLabelId(): string {
  return `kj-dropdown-menu-label-${++_labelIdCounter}`;
}

/**
 * The button that opens a dropdown menu. Composes `KjOverlayTrigger`.
 *
 * `kjTrigger` switches between `onClick()` (default) and `onContextMenu()`
 * (replacement for the old `KjContextMenuTrigger`). For `kjMount="point"`,
 * the trigger captures the originating pointer coords into signals consumed
 * by `pointAt()` in the content component.
 *
 * Wires `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` via the
 * underlying `KjOverlayTrigger` host directive.
 *
 * @category Core/Actions
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
      // MVP: resolve at construction. `contextmenu` consumers should set
      // `kjTrigger="contextmenu"` declaratively at construction time.
      useFactory: () => {
        // Read input attribute on the host element synchronously to pick the
        // strategy. Falls back to click.
        const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
        const kind = el.getAttribute('kjTrigger') ?? el.getAttribute('kjtrigger');
        return kind === 'contextmenu' ? onContextMenu({ longPressMs: 500 }) : onClick();
      },
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
  private readonly controller = inject(KjOverlayController);

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

  /** Capture pointer coords for point-mount; the strategy reads them. */
  protected onPointer(e: MouseEvent): void {
    if (this.kjMount() === 'point') {
      this.kjPointX.set(e.clientX);
      this.kjPointY.set(e.clientY);
    }
  }

  /** Item-driven close (`KJ_DROPDOWN_MENU.hide`). */
  hide(reason: KjDropdownMenuCloseReason): void {
    this.controller.close('programmatic');
    this.kjMenuClosed.emit(reason);
  }

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
