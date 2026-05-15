import {
  Directive,
  computed,
  inject,
} from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KjCommandPalette } from './command-palette';

/**
 * Individual command item (`role="option"`). Composes `KjListItem` for
 * id / value / label / keywords / disabled / click+keyboard activation.
 * The activation → `palette.activate(value)` wiring is now handled
 * centrally by `KjCommandPalette.afterSelect`, called from
 * `KjListItem` — this directive only contributes role, classes, the
 * `kj*` input aliases, and the active-item ARIA / data attributes.
 *
 * @example
 * ```html
 * <div kjCommandPalette>
 *   <div kjCommandList>
 *     <button kjCommandItem [kjValue]="'open-settings'">Settings</button>
 *   </div>
 * </div>
 * ```
 * @doc-category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandItem]',
  standalone: true,
  exportAs: 'kjCommandItem',
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjValue',
        'kjItemLabel:kjLabel',
        'kjItemKeywords:kjKeywords',
        'kjShortcut:kjShortcut',
      ],
    },
  ],
  host: {
    'class': 'kj-command-item',
    'role': 'option',
    '[attr.aria-selected]': 'isActive() ? "true" : "false"',
    '[attr.data-active]': 'isActive() ? "" : null',
  },
})
export class KjCommandItem {
  private readonly item    = injectListItem<unknown>();
  private readonly palette = inject(KjCommandPalette);

  /** Whether this item is the active (highlighted) item. */
  readonly isActive = computed(() =>
    this.palette.activeId() !== null && this.palette.activeId() === this.item.id,
  );
}
