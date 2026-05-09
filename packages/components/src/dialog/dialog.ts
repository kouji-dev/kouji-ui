import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

export {
  KjDialog,
  KjDialogService,
  KjDialogRef,
  type KjDialogOpenOptions,
} from '@kouji-ui/core';

/**
 * Service-launched modal dialog. Inject `KjDialogService` and call `open()`
 * with a template; mount `[kjDialog]` once near your trigger to host the
 * panel. The wrapper component exists purely to give the dialog suite a
 * dedicated documentation page.
 *
 * @doc-name Dialog
 * @doc-is-main
 * @doc-example Default
 *   @doc-file dialog.default.example.ts
 * @doc-example Confirmation
 *   @doc-file dialog.confirmation.example.ts
 * @doc-example Scrollable
 *   @doc-file dialog.scrollable.example.ts
 * @doc-example With form
 *   @doc-file dialog.with-form.example.ts
 * @doc-example Nested overlays
 *   @doc-file dialog.nested.example.ts
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-dialog-shell',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogComponent {}
