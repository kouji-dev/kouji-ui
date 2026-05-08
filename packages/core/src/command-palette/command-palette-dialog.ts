import { Directive } from '@angular/core';
import { KjDialog } from '../dialog/dialog';
import { KjCommandPalette } from './command-palette';

/**
 * Convenience composition directive that wraps `KjDialog` and `KjCommandPalette`
 * together. Use this as the panel element inside a `[kjDialogTrigger]` template
 * for the common modal Cmd-K pattern.
 *
 * All dialog inputs/outputs and palette inputs/outputs are forwarded via
 * `hostDirectives`. The host element gets `aria-label="Command palette"`.
 *
 * @example
 * ```html
 * <button [kjDialogTrigger]="palette">Open</button>
 * <ng-template #palette>
 *   <div kjDialogOverlay>
 *     <div kjCommandPaletteDialog aria-label="Command palette">
 *       <input kjCommandInput type="search" placeholder="Search commands…" />
 *       <div kjCommandList>
 *         <div kjCommandEmpty>No results.</div>
 *         <button kjCommandItem [kjValue]="'settings'">Settings</button>
 *       </div>
 *     </div>
 *   </div>
 * </ng-template>
 * ```
 * @category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandPaletteDialog]',
  standalone: true,
  exportAs: 'kjCommandPaletteDialog',
  hostDirectives: [
    {
      directive: KjDialog,
    },
    {
      directive: KjCommandPalette,
      inputs: [
        'kjFilter',
        'kjShouldFilter',
        'kjLoading',
        'kjAutoActivateFirst',
        'kjDismissOnActivate',
        'kjValue',
        'kjQuery',
      ],
      outputs: [
        'kjActivate',
        'kjValueChange',
        'kjQueryChange',
      ],
    },
  ],
  host: {
    '[attr.aria-label]': '"Command palette"',
  },
})
export class KjCommandPaletteDialog {}
