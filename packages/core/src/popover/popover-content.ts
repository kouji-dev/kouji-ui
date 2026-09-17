import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  booleanAttribute,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_TITLE_HOST,
  overlayAccessibleName,
  type KjOverlayTitleHost,
} from '../dialog/dialog-title';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo, injectAnchoredPosition, pxOffset } from '../primitives/overlay/strategies/position/anchored-to';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';

/**
 * The popover panel. Portals to the overlay container, anchors to its
 * trigger, takes `role="dialog"` and is named by a projected
 * `[kjPopoverTitle]` (or `kjAriaLabel`). Pair with `[kjPopoverTrigger]`,
 * wired either by nesting or through `[kjFor]`.
 *
 * @doc-category Core/Overlay
 * @doc
 * @doc-name popover
 */
@Component({
  selector: 'kj-popover-content',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel, inputs: ['kjFor'] }],
  providers: [
    { provide: KJ_OVERLAY_TITLE_HOST, useExisting: forwardRef(() => KjPopoverContent) },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
    { provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY, useFactory: () => tabCycle({ returnFocus: true }) },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-popover-content',
    '[attr.aria-labelledby]': 'name.ariaLabelledBy()',
    '[attr.aria-label]': 'name.ariaLabel()',
  },
  template: `<ng-content />`,
})
export class KjPopoverContent implements KjOverlayTitleHost {
  /** Logical side of the trigger the panel is anchored to. Default `'bottom'`. */
  readonly kjSide   = input<KjSide>('bottom');
  /** Logical alignment along the anchored side. Default `'center'`. */
  readonly kjAlign  = input<KjAlign>('center');
  /** Gap in px between the trigger and the panel. `0` sits flush against the trigger. */
  readonly kjOffset = input<number, unknown>(8, { transform: pxOffset(8) });
  /** Trap Tab inside the panel (APG modal dialog). Default `false` — Tab leaves and closes. */
  readonly kjTrap   = input(false, { transform: booleanAttribute });

  /** Accessible name when no `[kjPopoverTitle]` is projected. */
  readonly kjAriaLabel = input<string | undefined>(undefined);
  /** Explicit `aria-labelledby`, winning over a projected title. */
  readonly kjAriaLabelledBy = input<string | undefined>(undefined);

  /**
   * @internal The same name resolution the dialog/drawer/sheet family uses:
   * a projected `[kjPopoverTitle]` becomes `aria-labelledby`, else the
   * `kjAriaLabelledBy` / `kjAriaLabel` inputs, else a static attribute. A
   * `role="dialog"` panel with none is a 4.1.2 failure, so dev mode warns.
   */
  readonly name = overlayAccessibleName({
    label: this.kjAriaLabel,
    labelledBy: this.kjAriaLabelledBy,
  });

  /** @internal Adopts a `[kjPopoverTitle]` id for `aria-labelledby`. */
  registerTitle(id: string): () => void {
    return this.name.registerTitle(id);
  }

  constructor() {
    injectAnchoredPosition({ side: this.kjSide, align: this.kjAlign, offset: this.kjOffset });
    const trap = inject(KJ_OVERLAY_FOCUS_TRAP_STRATEGY) as ReturnType<typeof tabCycle>;
    trap.configure({ enabled: () => this.kjTrap() });
  }
}
