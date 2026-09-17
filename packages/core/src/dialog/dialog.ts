import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  forwardRef,
  input,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KJ_OVERLAY_TITLE_HOST, overlayAccessibleName, type KjOverlayTitleHost } from './dialog-title';

/**
 * Dialog body component. Composes `KjOverlayPanel` as a host directive so
 * the overlay primitives wire role/state/aria/focus management, and names
 * itself: a projected `[kjDialogTitle]` becomes `aria-labelledby`, else the
 * `ariaLabelledBy` / `ariaLabel` passed to `KjDialogService.open()` (or the
 * `kjAriaLabelledBy` / `kjAriaLabel` inputs) apply.
 *
 * The role is decided by the SERVICE (`KjDialogService.open`) via the
 * `KJ_OVERLAY_PANEL_ROLE` provider on the controller. The `kjAlert` input
 * is exposed for declarative (non-service) usage where consumers wire their
 * own providers.
 *
 * @example
 * ```html
 * <kj-dialog>
 *   <h2 kjDialogTitle>Save changes?</h2>
 *   <p>Your edits will be applied immediately.</p>
 * </kj-dialog>
 * ```
 * @doc-category Core/Overlay
 */
@Component({
  selector: 'kj-dialog',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel }],
  providers: [{ provide: KJ_OVERLAY_TITLE_HOST, useExisting: forwardRef(() => KjDialog) }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-dialog',
    '[attr.aria-labelledby]': 'name.ariaLabelledBy()',
    '[attr.aria-label]': 'name.ariaLabel()',
  },
  template: `<ng-content />`,
})
export class KjDialog implements KjOverlayTitleHost {
  /**
   * Promotes the panel to `role="alertdialog"` — an interruption the user
   * must acknowledge, which also turns off Escape / outside dismissal.
   * Default `false`.
   */
  readonly kjAlert = input(false, { transform: booleanAttribute });
  /** Accessible name when no `[kjDialogTitle]` is projected. */
  readonly kjAriaLabel = input<string | undefined>(undefined);
  /** Id of the element naming the dialog; wins over any title or label. */
  readonly kjAriaLabelledBy = input<string | undefined>(undefined);

  /** @internal */
  readonly name = overlayAccessibleName({ label: this.kjAriaLabel, labelledBy: this.kjAriaLabelledBy });

  /** @internal Adopts a `[kjDialogTitle]` id for `aria-labelledby`. */
  registerTitle(id: string): () => void {
    return this.name.registerTitle(id);
  }
}
