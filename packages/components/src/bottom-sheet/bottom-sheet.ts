import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import {
  KjBottomSheetClose,
  KjBottomSheetContent,
  KjBottomSheetDescription,
  KjBottomSheetHandle,
  KjBottomSheetOverlay,
  KjBottomSheetTitle,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjBottomSheetContent` panel directive.
 *
 * Hosts the directive via `hostDirectives` so consumers retain access to
 * the `exportAs: 'kjBottomSheet'` reference (`<kj-bottom-sheet #s="kjBottomSheet">`)
 * and can call `s.close(value?)`. Compose with `<kj-bottom-sheet-overlay>`
 * outside, plus `<kj-bottom-sheet-handle>`, `<kj-bottom-sheet-title>`,
 * `<kj-bottom-sheet-description>`, `<kj-bottom-sheet-body>` and
 * `<kj-bottom-sheet-footer>` inside.
 *
 * Modal lifecycle — overlay-stack registration, body scroll-lock, focus
 * trap, focus restore, and cancellable close — all live on the underlying
 * `KjBottomSheetTrigger` and are wired by `[kjBottomSheetTrigger]` on the
 * activator.
 *
 * @doc-example Default
 *   @doc-file bottom-sheet.example.ts
 * @doc-example With handle (snap points)
 *   @doc-file bottom-sheet.with-handle.example.ts
 * @doc-example Scrollable body
 *   @doc-file bottom-sheet.scrollable.example.ts
 * @doc-example With form
 *   @doc-file bottom-sheet.with-form.example.ts
 * @doc-example Action sheet
 *   @doc-file bottom-sheet.actions.example.ts
 * @category Library/Actions
 */
@Component({
  selector: 'kj-bottom-sheet',
  standalone: true,
  hostDirectives: [KjBottomSheetContent],
  template: `<ng-content />`,
  styleUrl: './bottom-sheet.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-bottom-sheet' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBottomSheetComponent {}

/**
 * Backdrop that wraps the bottom-sheet panel. Forwards
 * `kjBottomSheetOverlayCloseOnClick` to the underlying overlay directive.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-bottom-sheet-overlay',
  standalone: true,
  hostDirectives: [
    {
      directive: KjBottomSheetOverlay,
      inputs: ['kjBottomSheetOverlayCloseOnClick: kjBottomSheetOverlayCloseOnClick'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './bottom-sheet.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-bottom-sheet-overlay' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBottomSheetOverlayComponent {}

/**
 * Heading inside `<kj-bottom-sheet-header>`. Wraps `KjBottomSheetTitle` to
 * register the heading id with the bottom-sheet context so
 * `aria-labelledby` is wired automatically.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-bottom-sheet-title',
  standalone: true,
  hostDirectives: [KjBottomSheetTitle],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-bottom-sheet-title' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBottomSheetTitleComponent {}

/**
 * Long-form description for the bottom sheet. Wraps `KjBottomSheetDescription`
 * for automatic `aria-describedby` wiring.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-bottom-sheet-description',
  standalone: true,
  hostDirectives: [KjBottomSheetDescription],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-bottom-sheet-description' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBottomSheetDescriptionComponent {}

/**
 * Drag-handle / slider affordance. Composes `KjBottomSheetHandle`. Renders
 * a centred grabber bar by default; the underlying directive owns drag
 * gestures and the slider keyboard contract.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-bottom-sheet-handle',
  standalone: true,
  hostDirectives: [
    { directive: KjBottomSheetHandle, inputs: ['kjDisabled: kjDisabled'] },
  ],
  template: `<span class="kj-bottom-sheet-handle__bar" aria-hidden="true"></span>`,
  styleUrl: './bottom-sheet.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-bottom-sheet-handle' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBottomSheetHandleComponent {}

/**
 * Header band inside the bottom sheet. Optional `align` for title placement.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-bottom-sheet-header',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './bottom-sheet.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-bottom-sheet-header',
    '[attr.data-align]': 'align()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBottomSheetHeaderComponent {
  readonly align = input<'start' | 'center'>('start');
}

/**
 * Main body slot. `padded` toggles the standard padding (default `true`).
 * `scroll` enables overflow scroll inside the body slot.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-bottom-sheet-body',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './bottom-sheet.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-bottom-sheet-body',
    '[attr.data-padded]': "padded() ? '' : null",
    '[attr.data-scroll]': "scroll() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBottomSheetBodyComponent {
  readonly padded = input<boolean, unknown>(true, { transform: booleanAttribute });
  readonly scroll = input<boolean, unknown>(false, { transform: booleanAttribute });
}

/**
 * Footer / action band. `align` controls action button placement.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-bottom-sheet-footer',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './bottom-sheet.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-bottom-sheet-footer',
    '[attr.data-align]': 'align()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBottomSheetFooterComponent {
  readonly align = input<'start' | 'center' | 'end' | 'between'>('end');
}

/**
 * Dismiss button that closes the bottom sheet on click. Composes
 * `KjBottomSheetClose`.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-bottom-sheet-close',
  standalone: true,
  hostDirectives: [KjBottomSheetClose],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-bottom-sheet-close' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBottomSheetCloseComponent {}
