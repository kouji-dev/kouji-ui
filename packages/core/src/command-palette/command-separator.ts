import { Directive } from '@angular/core';

/**
 * Visual separator between command groups. Non-interactive.
 * Sets `role="separator"` and `aria-orientation="horizontal"`.
 *
 * @category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandSeparator]',
  standalone: true,
  host: {
    'role': 'separator',
    'aria-orientation': 'horizontal',
  },
})
export class KjCommandSeparator {}
