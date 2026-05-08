import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import {
  KjButton,
  KjSpeedDial,
  KjSpeedDialAction,
  KjSpeedDialActions,
  KjSpeedDialTrigger,
  type KjSpeedDialDirection,
} from '@kouji-ui/core';

/** Where to anchor the Speed Dial within its scroll container. */
export type KjSpeedDialPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'static';

/**
 * Styled wrapper around the headless `KjSpeedDial` directive.
 *
 * Renders a viewport-anchored floating action button (FAB) that, when clicked,
 * fans out a cluster of action buttons — composed from `<kj-speed-dial-trigger>`
 * and one or more `<kj-speed-dial-action>` children inside a
 * `<kj-speed-dial-actions>` container. Theme tokens drive the FAB's circular
 * shape, elevation, and the cluster's fan-out animation.
 *
 * `kjPosition` controls the anchor: `'bottom-right'` (default) places the FAB
 * fixed to the bottom-right of the viewport. Use `'static'` to embed inline.
 *
 * @example
 * ```html
 * <kj-speed-dial kjDirection="up" kjPosition="bottom-right">
 *   <kj-speed-dial-trigger kjAriaLabel="Open menu">+</kj-speed-dial-trigger>
 *   <kj-speed-dial-actions>
 *     <kj-speed-dial-action kjAriaLabel="Edit">E</kj-speed-dial-action>
 *     <kj-speed-dial-action kjAriaLabel="Share">S</kj-speed-dial-action>
 *   </kj-speed-dial-actions>
 * </kj-speed-dial>
 * ```
 *
 * @doc-example Default
 *   @doc-file speed-dial.example.ts
 * @doc-example Directions
 *   @doc-file speed-dial.directions.example.ts
 * @doc-example With tooltips
 *   @doc-file speed-dial.with-tooltips.example.ts
 * @doc-example Disabled
 *   @doc-file speed-dial.disabled.example.ts
 * @category Library/Actions
 * @doc
 * @doc-name speed-dial
 * @doc-description Themed floating action button that fans out a cluster of secondary actions on activation.
 * @doc-is-main
 */
@Component({
  selector: 'kj-speed-dial',
  standalone: true,
  hostDirectives: [
    {
      directive: KjSpeedDial,
      inputs: [
        'kjDirection',
        'kjOpen',
        'kjDisabled',
        'kjOpenOnHover',
      ],
      outputs: ['kjOpenChange'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './speed-dial.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-speed-dial',
    '[attr.data-position]': 'kjPosition()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSpeedDialComponent {
  /** Anchor for the dial. Default `'bottom-right'`. */
  readonly kjPosition = input<KjSpeedDialPosition>('bottom-right');
}

/**
 * Styled wrapper around `KjSpeedDialTrigger`.
 *
 * Renders a real `<button kjButton kjSpeedDialTrigger>` so the trigger inherits
 * the kouji button presets (variant, size, focus ring, capture-phase disabled
 * suppression) plus the speed-dial menu-button ARIA wiring.
 *
 * @category Library/Actions
 * @doc
 * @doc-name speed-dial
 */
@Component({
  selector: 'kj-speed-dial-trigger',
  standalone: true,
  imports: [KjButton, KjSpeedDialTrigger],
  template: `
    <button
      type="button"
      kjButton
      kjSpeedDialTrigger
      class="kj-speed-dial-trigger"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
      [kjDisabled]="kjDisabled()"
      [attr.aria-label]="kjAriaLabel()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './speed-dial.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-speed-dial-trigger-host',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSpeedDialTriggerComponent {
  /** Button variant preset. */
  readonly kjVariant = input('default');
  /** Button size preset. */
  readonly kjSize = input('lg');
  /** Disable the trigger. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });
  /** Required when the trigger has icon-only contents (it usually does). */
  readonly kjAriaLabel = input<string | undefined>(undefined);
}

/**
 * Styled wrapper around `KjSpeedDialActions` — the cluster container.
 *
 * Place inside `<kj-speed-dial>` and put one or more
 * `<kj-speed-dial-action>` children inside it. The container itself carries
 * `role="menu"` and is hidden when collapsed.
 *
 * @category Library/Actions
 * @doc
 * @doc-name speed-dial
 */
@Component({
  selector: 'kj-speed-dial-actions',
  standalone: true,
  hostDirectives: [KjSpeedDialActions],
  template: `<ng-content />`,
  styleUrl: './speed-dial.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-speed-dial-actions' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSpeedDialActionsComponent {}

/**
 * Styled wrapper around `KjSpeedDialAction`.
 *
 * Renders a real `<button kjButton kjSpeedDialAction>` so the action inherits
 * the kouji button presets and `role="menuitem"`. Activating an action closes
 * the dial unless `[kjCloseOnActivate]="false"`.
 *
 * @category Library/Actions
 * @doc
 * @doc-name speed-dial
 */
@Component({
  selector: 'kj-speed-dial-action',
  standalone: true,
  imports: [KjButton, KjSpeedDialAction],
  template: `
    <button
      type="button"
      kjButton
      kjSpeedDialAction
      class="kj-speed-dial-action"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
      [kjDisabled]="kjDisabled()"
      [kjCloseOnActivate]="kjCloseOnActivate()"
      [attr.aria-label]="kjAriaLabel()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './speed-dial.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-speed-dial-action-host',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSpeedDialActionComponent {
  /** Button variant preset. Defaults to `outline`. */
  readonly kjVariant = input('outline');
  /** Button size preset. Defaults to `md` (one step smaller than the trigger). */
  readonly kjSize = input('md');
  /** Disable the action. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });
  /** Whether activating closes the dial. Default `true`. */
  readonly kjCloseOnActivate = input(true, { transform: booleanAttribute });
  /** Required when the action has icon-only contents. */
  readonly kjAriaLabel = input<string | undefined>(undefined);
}

export type { KjSpeedDialDirection };
