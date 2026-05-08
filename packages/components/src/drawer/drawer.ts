import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

export {
  KjDrawer,
  KjDrawerService,
  KjDrawerRef,
  type KjDrawerOpenOptions,
  type KjDrawerSide,
} from '@kouji-ui/core';

/**
 * Service-launched drawer (edge-anchored panel). Inject `KjDrawerService` and
 * call `open()` with a template; the drawer absorbs the bottom-sheet pattern
 * via `kjSide="bottom"` plus drag options. The wrapper exists to host the
 * documentation page for the drawer suite.
 *
 * @doc-name Drawer
 * @doc-is-main
 * @doc-example Default
 *   @doc-file drawer.example.ts
 * @doc-example Sides
 *   @doc-file drawer.sides.example.ts
 * @doc-example Modal vs non-modal
 *   @doc-file drawer.modal-vs-non-modal.example.ts
 * @doc-example Scrollable
 *   @doc-file drawer.scrollable.example.ts
 * @doc-example With form
 *   @doc-file drawer.with-form.example.ts
 * @category Library/Overlay
 */
@Component({
  selector: 'kj-drawer-shell',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './drawer.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerComponent {}
