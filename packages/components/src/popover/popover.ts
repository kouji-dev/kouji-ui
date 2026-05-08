import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import {
  KjPopover,
  KjPopoverArrow,
  KjPopoverClose,
  KjPopoverContent,
  KjPopoverTitle,
  KjPopoverTrigger,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjPopover` state-container directive.
 *
 * Hosts the `[kjPopover]` directive via `hostDirectives` and forwards every
 * popover input under its `kj`-prefixed name. The host renders with
 * `display: contents` so it never interferes with the consumer's layout —
 * the trigger element and projected content are rendered in place.
 *
 * Pair with `<kj-popover-trigger>` for the activator and
 * `<kj-popover-content>` (placed inside an `<ng-template>`) for the floating
 * panel. The panel is portal-mounted to `document.body` by the underlying
 * directive, escaping any clipping ancestor.
 *
 * @doc-example Default
 *   @doc-file popover.example.ts
 * @doc-example Modal
 *   @doc-file popover.modal.example.ts
 * @doc-example Sides
 *   @doc-file popover.sides.example.ts
 * @doc-example Cancellable close
 *   @doc-file popover.cancellable.example.ts
 * @doc-example With form
 *   @doc-file popover.with-form.example.ts
 * @category Library/Feedback
 * @doc
 * @doc-name popover
 * @doc-description The pre-styled kouji popover. Wraps the headless `KjPopover` directive into ready-to-use `<kj-popover>`, `<kj-popover-trigger>`, `<kj-popover-content>`, and helper components — giving you a floating panel with collision-aware positioning, portal mounting, and optional modal mode, all styled with design-system tokens.
 * @doc-is-main
 */
@Component({
  selector: 'kj-popover',
  standalone: true,
  hostDirectives: [
    {
      directive: KjPopover,
      inputs: [
        'kjPopoverSide: kjPopoverSide',
        'kjPopoverAlign: kjPopoverAlign',
        'kjPopoverOffset: kjPopoverOffset',
        'kjAvoidCollisions: kjAvoidCollisions',
        'kjCollisionPadding: kjCollisionPadding',
        'kjTriggerEvent: kjTriggerEvent',
        'kjOpen: kjOpen',
      ],
      outputs: [
        'kjOpenChange: kjOpenChange',
        'kjCloseRequested: kjCloseRequested',
        'kjOpenAutoFocus: kjOpenAutoFocus',
        'kjCloseAutoFocus: kjCloseAutoFocus',
      ],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './popover.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-popover',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPopoverComponent {}

/**
 * Styled wrapper around `KjPopoverTrigger`.
 *
 * Place inside a `<kj-popover>` for the compound shape, or use it standalone
 * with `[kjPopoverTriggerFor]` pointing at an `<ng-template>` containing the
 * popover content for the flat trigger-for shape.
 *
 * The host renders with `display: contents` so the projected `<button>` (or
 * `<kj-button>`) is the actual interactive trigger and inherits the directive's
 * ARIA wiring (`aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`).
 *
 * @category Library/Feedback
 * @doc
 * @doc-name popover
 */
@Component({
  selector: 'kj-popover-trigger',
  standalone: true,
  hostDirectives: [
    {
      directive: KjPopoverTrigger,
      inputs: [
        'kjPopoverTriggerFor: kjPopoverTriggerFor',
        'kjPopoverDisabled: kjPopoverDisabled',
        'kjPopoverSide: kjPopoverSide',
        'kjPopoverAlign: kjPopoverAlign',
        'kjPopoverOffset: kjPopoverOffset',
        'kjTriggerEvent: kjTriggerEvent',
        'kjOpen: kjOpen',
      ],
      outputs: [
        'kjOpenChange: kjOpenChange',
        'kjCloseRequested: kjCloseRequested',
        'kjOpenAutoFocus: kjOpenAutoFocus',
        'kjCloseAutoFocus: kjCloseAutoFocus',
      ],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './popover.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-popover-trigger',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPopoverTriggerComponent {}

/**
 * Styled wrapper around the structural `KjPopoverContent` directive.
 *
 * Place inside an `<ng-template>` (compound shape) or referenced via
 * `[kjPopoverTriggerFor]` (flat shape). The wrapper renders an inner
 * `<ng-template kjPopoverContent>` and forwards the projected content into
 * the portal-mounted overlay panel — `role="dialog"` and the family's
 * keyboard / outside-click coordination come from the underlying directive.
 *
 * Style hooks land on the panel element (the body-level overlay container);
 * the `kj-popover-content` class is applied via the underlying directive's
 * `kjPanelClass` so the styled CSS reaches the floating box, not the dormant
 * wrapper host.
 *
 * @category Library/Feedback
 * @doc
 * @doc-name popover
 */
@Component({
  selector: 'kj-popover-content',
  standalone: true,
  imports: [KjPopoverContent],
  template: `
    <ng-template
      kjPopoverContent
      [kjModal]="kjModal()"
      [kjAriaLabel]="kjAriaLabel()"
      [kjAriaDescribedBy]="kjAriaDescribedBy()"
      [kjCloseOnEsc]="kjCloseOnEsc()"
      [kjCloseOnOutsideClick]="kjCloseOnOutsideClick()"
      [kjCloseOnOutsideFocus]="kjCloseOnOutsideFocus()"
      [kjPanelClass]="resolvedPanelClass()"
    >
      <ng-content />
    </ng-template>
  `,
  styleUrl: './popover.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-popover-content-host',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPopoverContentComponent {
  /** Modality flag — enables focus-trap, scroll-lock, `aria-modal="true"`. */
  readonly kjModal = input<boolean>(false);
  /** Fallback accessible name when no `<kj-popover-title>` is projected. */
  readonly kjAriaLabel = input<string>('');
  /** Stacked describedby ids for the panel. */
  readonly kjAriaDescribedBy = input<string | string[]>('');
  /** Esc closes. Forced `true` when `kjModal=true`. */
  readonly kjCloseOnEsc = input<boolean>(true);
  /** Outside-click closes. */
  readonly kjCloseOnOutsideClick = input<boolean>(true);
  /** Outside-focus closes. Default `false`. */
  readonly kjCloseOnOutsideFocus = input<boolean>(false);
  /** Optional class hook for the body-level overlay container. */
  readonly kjPanelClass = input<string | string[]>('');

  /**
   * Always include the `kj-popover-content` class on the panel so the styled
   * wrapper CSS lands on the floating box. Consumer-provided classes are
   * concatenated.
   */
  readonly resolvedPanelClass = computed<string[]>(() => {
    const out: string[] = ['kj-popover-content'];
    const c = this.kjPanelClass();
    if (Array.isArray(c)) {
      for (const v of c) if (v) out.push(v);
    } else if (c) {
      out.push(c);
    }
    return out;
  });
}

/**
 * Decorative arrow rendered inside `<kj-popover-content>`. Pure styling hook —
 * the arrow's CSS reads `data-side` from the underlying directive. Marked
 * `aria-hidden="true"` by the underlying directive so it stays out of the AT
 * tree.
 *
 * @category Library/Feedback
 * @doc
 * @doc-name popover
 */
@Component({
  selector: 'kj-popover-arrow',
  standalone: true,
  hostDirectives: [KjPopoverArrow],
  template: ``,
  styleUrl: './popover.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-popover-arrow' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPopoverArrowComponent {}

/**
 * Heading inside `<kj-popover-content>`. Generates an auto-id and registers
 * it with the popover so `aria-labelledby` on the panel is wired automatically.
 *
 * @category Library/Feedback
 * @doc
 * @doc-name popover
 */
@Component({
  selector: 'kj-popover-title',
  standalone: true,
  hostDirectives: [KjPopoverTitle],
  template: `<ng-content />`,
  styleUrl: './popover.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-popover-title' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPopoverTitleComponent {}

/**
 * Convenience close button. Place inside `<kj-popover-content>`. Triggers the
 * cancellable close cycle with `'close-button'` as the reason — consumer
 * `(kjCloseRequested)` handlers can intervene.
 *
 * @category Library/Feedback
 * @doc
 * @doc-name popover
 */
@Component({
  selector: 'kj-popover-close',
  standalone: true,
  hostDirectives: [KjPopoverClose],
  template: `<ng-content />`,
  styleUrl: './popover.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-popover-close',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPopoverCloseComponent {}
