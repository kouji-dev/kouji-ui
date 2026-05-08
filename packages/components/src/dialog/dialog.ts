import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import {
  KjDialog,
  KjDialogActions,
  KjDialogContent,
  KjDialogDescription,
  KjDialogOverlay,
  KjDialogTitle,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjDialog` panel directive.
 *
 * Hosts `KjDialog` via `hostDirectives` so consumers retain access to the
 * `exportAs: 'kjDialog'` reference (`<kj-dialog #d="kjDialog">`) and can
 * call `d.close(value?)`. Compose with `<kj-dialog-overlay>` outside,
 * plus `<kj-dialog-header>`, `<kj-dialog-body>`, `<kj-dialog-footer>` (or
 * the `[kjDialogContent]` / `[kjDialogActions]` slot directives) inside.
 *
 * Modal lifecycle — overlay-stack registration, body scroll-lock, focus
 * trap, focus restore, and cancellable close — all live on the underlying
 * `KjDialog` family and are wired by `[kjDialogTrigger]` (declarative) or
 * `KjDialogService.open` (programmatic).
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
 * @doc
 * @doc-name dialog
 * @doc-is-main
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

/**
 * Backdrop that wraps the dialog panel. Forwards
 * `kjDialogOverlayCloseOnClick` to the underlying `KjDialogOverlay` directive.
 *
 * @category Library/Actions
 * @doc
 * @doc-name dialog
 */
@Component({
  selector: 'kj-dialog-overlay',
  standalone: true,
  hostDirectives: [
    {
      directive: KjDialogOverlay,
      inputs: ['kjDialogOverlayCloseOnClick: kjDialogOverlayCloseOnClick'],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './dialog.css',
  host: { class: 'kj-dialog-overlay' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogOverlayComponent {}

/**
 * Heading inside `<kj-dialog-header>`. Wraps `KjDialogTitle` to register the
 * heading id with the dialog context so `aria-labelledby` is wired
 * automatically.
 *
 * @category Library/Actions
 * @doc
 * @doc-name dialog
 */
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

/**
 * Long-form description for the dialog body. Wraps `KjDialogDescription`
 * to register the description id with the dialog context for automatic
 * `aria-describedby` wiring.
 *
 * @category Library/Actions
 * @doc
 * @doc-name dialog
 */
@Component({
  selector: 'kj-dialog-description',
  standalone: true,
  hostDirectives: [KjDialogDescription],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-dialog-description' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogDescriptionComponent {}

/**
 * Header band inside the dialog. Optional `align` for title placement.
 *
 * @category Library/Actions
 * @doc
 * @doc-name dialog
 */
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

/**
 * Main body slot. `padded` toggles the standard padding (default `true`).
 * `scroll` enables overflow scroll inside the body slot.
 *
 * Composes `KjDialogContent` for the structural marker; consumers can
 * additionally style via `[data-kj-dialog-content]`.
 *
 * @category Library/Actions
 * @doc
 * @doc-name dialog
 */
@Component({
  selector: 'kj-dialog-body',
  standalone: true,
  hostDirectives: [KjDialogContent],
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
  readonly padded = input<boolean, unknown>(true, { transform: booleanAttribute });
  readonly scroll = input<boolean, unknown>(false, { transform: booleanAttribute });
}

/**
 * Footer / action band. `align` controls action button placement. Composes
 * `KjDialogActions` for the structural marker.
 *
 * @category Library/Actions
 * @doc
 * @doc-name dialog
 */
@Component({
  selector: 'kj-dialog-footer',
  standalone: true,
  hostDirectives: [KjDialogActions],
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
