import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import {
  KjDrawerClose,
  KjDrawerContent,
  KjDrawerDescription,
  KjDrawerTitle,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjDrawerContent` panel directive.
 *
 * Hosts `KjDrawerContent` via `hostDirectives` so consumers retain access to
 * the `exportAs: 'kjDrawerContent'` reference (`<kj-drawer #d="kjDrawerContent">`)
 * and can call `d.close(value?)`. Compose with `<kj-drawer-header>`,
 * `<kj-drawer-body>` and `<kj-drawer-footer>` (or the `[kjDrawerTitle]` /
 * `[kjDrawerDescription]` / `[kjDrawerClose]` slot directives) inside.
 *
 * Modal lifecycle — overlay-stack registration, body scroll-lock, focus
 * trap, focus restore, and cancellable close — all live on the underlying
 * `KjDrawer` family and are wired by `[kjDrawerTrigger]`.
 *
 * Slide direction matches the drawer's `kjSide` (default `'right'`):
 * `data-kj-side` on the panel host drives the CSS transform. Honours
 * `prefers-reduced-motion: reduce` (fades instead of sliding).
 *
 * @doc-example Default
 *   @doc-file drawer.example.ts
 * @doc-example Sides
 *   @doc-file drawer.sides.example.ts
 * @doc-example With form
 *   @doc-file drawer.with-form.example.ts
 * @doc-example Scrollable
 *   @doc-file drawer.scrollable.example.ts
 * @doc-example Modal vs non-modal
 *   @doc-file drawer.modal-vs-non-modal.example.ts
 * @category Library/Actions
 * @doc
 * @doc-name drawer
 * @doc-is-main
 */
@Component({
  selector: 'kj-drawer',
  standalone: true,
  hostDirectives: [KjDrawerContent],
  template: `<ng-content />`,
  styleUrl: './drawer.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-drawer' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerComponent {}

/**
 * Heading inside `<kj-drawer-header>`. Wraps `KjDrawerTitle` to register the
 * heading id with the drawer context so `aria-labelledby` is wired
 * automatically.
 *
 * @category Library/Actions
 * @doc
 * @doc-name drawer
 */
@Component({
  selector: 'kj-drawer-title',
  standalone: true,
  hostDirectives: [KjDrawerTitle],
  template: `<ng-content />`,
  styleUrl: './drawer.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-drawer-title' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerTitleComponent {}

/**
 * Long-form description for the drawer body. Wraps `KjDrawerDescription`
 * to register the description id with the drawer context for automatic
 * `aria-describedby` wiring.
 *
 * @category Library/Actions
 * @doc
 * @doc-name drawer
 */
@Component({
  selector: 'kj-drawer-description',
  standalone: true,
  hostDirectives: [KjDrawerDescription],
  template: `<ng-content />`,
  styleUrl: './drawer.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-drawer-description' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerDescriptionComponent {}

/**
 * Header band inside the drawer. Optional `align` for title placement.
 *
 * @category Library/Actions
 * @doc
 * @doc-name drawer
 */
@Component({
  selector: 'kj-drawer-header',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './drawer.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-drawer-header',
    '[attr.data-align]': 'align()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerHeaderComponent {
  readonly align = input<'start' | 'center'>('start');
}

/**
 * Main body slot. `padded` toggles the standard padding (default `true`).
 * `scroll` enables overflow scroll inside the body slot.
 *
 * @category Library/Actions
 * @doc
 * @doc-name drawer
 */
@Component({
  selector: 'kj-drawer-body',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './drawer.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-drawer-body',
    '[attr.data-padded]': "padded() ? '' : null",
    '[attr.data-scroll]': "scroll() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerBodyComponent {
  readonly padded = input<boolean, unknown>(true, { transform: booleanAttribute });
  readonly scroll = input<boolean, unknown>(false, { transform: booleanAttribute });
}

/**
 * Footer / action band. `align` controls action button placement.
 *
 * @category Library/Actions
 * @doc
 * @doc-name drawer
 */
@Component({
  selector: 'kj-drawer-footer',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './drawer.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-drawer-footer',
    '[attr.data-align]': 'align()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerFooterComponent {
  readonly align = input<'start' | 'center' | 'end' | 'between'>('end');
}

/**
 * Convenience close button. Place inside `<kj-drawer>`. Triggers the
 * cancellable close cycle with `'close-button'` as the reason — consumer
 * `(kjCloseRequested)` handlers can intervene.
 *
 * @category Library/Actions
 * @doc
 * @doc-name drawer
 */
@Component({
  selector: 'kj-drawer-close',
  standalone: true,
  hostDirectives: [KjDrawerClose],
  template: `<ng-content />`,
  styleUrl: './drawer.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-drawer-close',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerCloseComponent {}
