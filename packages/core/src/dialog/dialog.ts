import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, input } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';

/**
 * Dialog body component. Composes `KjOverlayPanel` as a host directive so
 * the overlay primitives wire role/state/aria/focus management.
 *
 * The role is decided by the SERVICE (`KjDialog.open`) via the
 * `KJ_OVERLAY_PANEL_ROLE` provider on the controller. The `kjAlert` input
 * is exposed for declarative (non-service) usage where consumers wire their
 * own providers.
 *
 * @doc-category Core/Overlay
 */
@Component({
  selector: 'kj-dialog',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-dialog' },
  template: `<ng-content />`,
})
export class KjDialog {
  readonly kjAlert = input(false, { transform: booleanAttribute });
}
