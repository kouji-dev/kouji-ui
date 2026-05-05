import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from '@kouji-ui/core';

/**
 * Dialog panel. Place inside a `<ng-template>` referenced by a `[kjDialogTrigger]`.
 * Wrap with `<kj-dialog-overlay>`. Use `<kj-dialog-title>` and `<kj-dialog-close>` as needed.
 *
 * @doc-example Default
 *   @doc-file dialog.default.example.ts
 * @doc-example With form
 *   @doc-file dialog.with-form.example.ts
 * @doc-example Scrollable
 *   @doc-file dialog.scrollable.example.ts
 * @doc-example Confirmation
 *   @doc-file dialog.confirmation.example.ts
 * @category Library/Actions
 */
@Component({
  selector: 'kj-dialog',
  standalone: true,
  imports: [KjDialog],
  template: `<div kjDialog class="kj-dialog"><ng-content /></div>`,
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogComponent {}

@Component({
  selector: 'kj-dialog-overlay',
  standalone: true,
  imports: [KjDialogOverlay],
  template: `<div kjDialogOverlay class="kj-dialog-overlay"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogOverlayComponent {}

@Component({
  selector: 'kj-dialog-title',
  standalone: true,
  imports: [KjDialogTitle],
  template: `<h2 kjDialogTitle class="kj-dialog-title"><ng-content /></h2>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogTitleComponent {}

@Component({
  selector: 'kj-dialog-close',
  standalone: true,
  imports: [KjDialogClose],
  template: `<button type="button" kjDialogClose class="kj-dialog-close"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogCloseComponent {}
