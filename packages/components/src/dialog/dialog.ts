import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjDialog, KjDialogOverlay, KjDialogTitle } from '@kouji-ui/core';

/**
 * Dialog panel. Apply via `hostDirectives`; the host carries the `KjDialog`
 * directive so `<kj-dialog #d="kjDialog">` exports the directive instance and
 * consumers can call `d.close(value?)`.
 *
 * Compose with `<kj-dialog-header>`, `<kj-dialog-body>`, `<kj-dialog-footer>`
 * inside, plus an outer `<kj-dialog-overlay>`.
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
  hostDirectives: [KjDialog],
  template: `<ng-content />`,
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-dialog' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogComponent {}

@Component({
  selector: 'kj-dialog-overlay',
  standalone: true,
  hostDirectives: [KjDialogOverlay],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-dialog-overlay' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogOverlayComponent {}

/** Heading inside `<kj-dialog-header>`. Wraps `KjDialogTitle` for ARIA labelling. */
@Component({
  selector: 'kj-dialog-title',
  standalone: true,
  hostDirectives: [KjDialogTitle],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-dialog-title' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogTitleComponent {}

/** Header band inside the dialog. Optional `align` for title placement. */
@Component({
  selector: 'kj-dialog-header',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-dialog-header',
    '[attr.data-align]': 'align()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogHeaderComponent {
  readonly align = input<'start' | 'center'>('start');
}

/** Main scrollable body. `padded` toggles the standard padding (default true). `scroll` enables overflow scroll inside the body slot. */
@Component({
  selector: 'kj-dialog-body',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-dialog-body',
    '[attr.data-padded]': "padded() ? '' : null",
    '[attr.data-scroll]': "scroll() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogBodyComponent {
  readonly padded = input(true);
  readonly scroll = input(false);
}

/** Footer band. `align` controls action button placement. */
@Component({
  selector: 'kj-dialog-footer',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-dialog-footer',
    '[attr.data-align]': 'align()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogFooterComponent {
  readonly align = input<'start' | 'center' | 'end' | 'between'>('end');
}
