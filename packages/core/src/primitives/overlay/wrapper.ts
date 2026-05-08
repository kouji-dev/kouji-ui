import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewContainerRef,
  ViewEncapsulation,
  inject,
  viewChild,
} from '@angular/core';
import { KjOverlayController } from './controller';

/**
 * Per-overlay wrapper component. Owns its DOM, its child views (backdrop +
 * panel), and disposes the controller when destroyed. Created by
 * `KjOverlayBuilder` for each open overlay; mounted into the singleton
 * `.kj-overlay-container`. Sibling order in the container resolves
 * stacking among open overlays — last opened wins.
 *
 * Internal: not exported as part of the public API surface.
 *
 * @category Core/Overlay
 * @doc
 * @doc-name overlay-wrapper
 * @doc-is-main
 * @doc-description Hosts a single overlay's DOM, anchors its backdrop and panel views as siblings, and cascades destroy down to the controller so teardown is atomic.
 */
@Component({
  selector: 'kj-overlay-wrapper',
  standalone: true,
  template: `
    <ng-container #backdropAnchor />
    <ng-container #panelAnchor />
  `,
  host: { class: 'kj-overlay-wrapper' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class KjOverlayWrapper {
  /** ViewContainerRef anchored to the backdrop slot. */
  readonly backdropAnchor = viewChild.required('backdropAnchor', { read: ViewContainerRef });
  /** ViewContainerRef anchored to the panel slot. */
  readonly panelAnchor = viewChild.required('panelAnchor', { read: ViewContainerRef });
  readonly controller = inject(KjOverlayController);

  constructor() {
    // Cascade cleanup: destroying the wrapper component disposes the
    // controller (strategy detach chain) — no manual bookkeeping needed.
    inject(DestroyRef).onDestroy(() => this.controller.dispose());
  }
}
