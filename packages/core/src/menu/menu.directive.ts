import { Directive } from '@angular/core';
import { CdkMenu, CdkMenuTrigger, CdkMenuItem } from '@angular/cdk/menu';
import { KjDisabledDirective, KjFocusRingDirective } from '../primitives';

/**
 * Dropdown menu trigger. Wraps CDK `CdkMenuTrigger`.
 * Handles aria-expanded, keyboard opening (Enter/Space/ArrowDown), and menu positioning.
 *
 * Apply to a `<button>` and link to a `[kjMenu]` template via `[cdkMenuTriggerFor]`.
 *
 * @example
 * ```html
 * <button kjMenuTrigger [kjMenuTriggerFor]="myMenu">Actions</button>
 * <ng-template #myMenu>
 *   <div kjMenu>
 *     <button kjMenuItem>Edit</button>
 *   </div>
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[kjMenuTrigger]',
  standalone: true,
  hostDirectives: [
    { directive: CdkMenuTrigger, inputs: ['cdkMenuTriggerFor: kjMenuTriggerFor'] },
    KjFocusRingDirective,
  ],
})
export class KjMenuTriggerDirective {}

/**
 * Menu panel container. Wraps CDK `CdkMenu`.
 * Handles keyboard navigation (Arrow keys, Home, End, Escape, typeahead).
 * Add `role="menu"` for proper ARIA semantics.
 *
 * @example
 * ```html
 * <div kjMenu role="menu">
 *   <button kjMenuItem>Edit</button>
 *   <button kjMenuItem>Delete</button>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjMenu]',
  standalone: true,
  hostDirectives: [CdkMenu],
})
export class KjMenuDirective {}

/**
 * Individual menu item. Wraps CDK `CdkMenuItem`.
 * Handles keyboard activation (Enter/Space), disabled state, and submenu support.
 *
 * @example
 * ```html
 * <button kjMenuItem role="menuitem">Delete</button>
 * ```
 */
@Directive({
  selector: '[kjMenuItem]',
  standalone: true,
  hostDirectives: [
    { directive: CdkMenuItem },
    { directive: KjDisabledDirective, inputs: ['disabled: kjDisabled'] },
    KjFocusRingDirective,
  ],
})
export class KjMenuItemDirective {}
