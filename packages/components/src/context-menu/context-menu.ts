import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { KjContextMenuTrigger } from '@kouji-ui/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuGroupComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuLabelComponent,
  KjDropdownMenuSeparatorComponent,
} from '../dropdown-menu/dropdown-menu';

/**
 * Styled wrapper around the headless `KjContextMenuTrigger` directive.
 *
 * Most consumers reach for the **attribute form** of the directive — apply
 * `[kjContextMenuFor]` directly on the row / card / canvas / image element
 * that should respond to right-click / long-press / `Shift+F10` /
 * `ContextMenu` key:
 *
 * ```html
 * <article class="card" tabindex="0" [kjContextMenuFor]="cardMenu">
 *   …card body…
 * </article>
 *
 * <ng-template #cardMenu>
 *   <kj-dropdown-menu>
 *     <kj-dropdown-menu-item (click)="edit()">Edit</kj-dropdown-menu-item>
 *     <kj-dropdown-menu-item (click)="duplicate()">Duplicate</kj-dropdown-menu-item>
 *     <kj-dropdown-menu-separator />
 *     <kj-dropdown-menu-item (click)="delete()">Delete</kj-dropdown-menu-item>
 *   </kj-dropdown-menu>
 * </ng-template>
 * ```
 *
 * `<kj-context-menu-trigger>` is a `display: contents` host that carries the
 * trigger — provided for symmetry with `<kj-dropdown-menu-trigger>` when an
 * element-style API is preferred. The panel and items are exactly the
 * Dropdown Menu wrappers (`<kj-dropdown-menu>` / `<kj-dropdown-menu-item>` /
 * `<kj-dropdown-menu-separator>` / `<kj-dropdown-menu-label>` /
 * `<kj-dropdown-menu-group>`); only the trigger surface and anchor geometry
 * differ.
 *
 * @doc-example Default
 *   @doc-file context-menu.example.ts
 * @doc-example With icons
 *   @doc-file context-menu.with-icons.example.ts
 * @doc-example With shortcuts
 *   @doc-file context-menu.with-shortcuts.example.ts
 * @doc-example Disabled item
 *   @doc-file context-menu.disabled-item.example.ts
 * @doc-example Long list
 *   @doc-file context-menu.long-list.example.ts
 * @category Library/Actions
 * @doc
 * @doc-name context-menu
 * @doc-description Pre-styled context menu that opens on right-click, long-press, or keyboard shortcut — uses the same dropdown panel components as `<kj-dropdown-menu>`, so menus look and behave identically regardless of what triggered them.
 * @doc-is-main
 */
@Component({
  selector: 'kj-context-menu-trigger',
  standalone: true,
  hostDirectives: [
    {
      directive: KjContextMenuTrigger,
      inputs: [
        'kjContextMenuFor',
        'kjDisabled',
        'kjOpen',
        'kjLongPressMs',
        'kjLongPressMoveTolerancePx',
        'kjOpenOnContextMenuKey',
        'kjCloseOnScroll',
        'kjAnchorMode',
        'kjSide',
        'kjAlign',
        'kjOffset',
        'kjCloseOnSelect',
      ],
      outputs: ['kjOpenChange', 'kjOpened', 'kjClosed'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './context-menu.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-context-menu-trigger',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjContextMenuTriggerComponent {}

/**
 * Re-export of `<kj-dropdown-menu>` under the context-menu name so consumers
 * can import a single matched set. Identical structure, identical styling —
 * the only thing that changes is which trigger opens it.
 *
 * @category Library/Actions
 */
export const KjContextMenuPanelComponent = KjDropdownMenuComponent;

/**
 * Re-export of `<kj-dropdown-menu-item>` — see {@link KjContextMenuPanelComponent}.
 *
 * @category Library/Actions
 */
export const KjContextMenuItemComponent = KjDropdownMenuItemComponent;

/**
 * Re-export of `<kj-dropdown-menu-separator>`.
 *
 * @category Library/Actions
 */
export const KjContextMenuSeparatorComponent = KjDropdownMenuSeparatorComponent;

/**
 * Re-export of `<kj-dropdown-menu-label>`.
 *
 * @category Library/Actions
 */
export const KjContextMenuLabelComponent = KjDropdownMenuLabelComponent;

/**
 * Re-export of `<kj-dropdown-menu-group>`.
 *
 * @category Library/Actions
 */
export const KjContextMenuGroupComponent = KjDropdownMenuGroupComponent;
