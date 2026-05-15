import { Directive } from '@angular/core';
import { KjListSeparator } from '../primitives/list';

/**
 * Visual separator between command groups. Non-interactive. Composes
 * the shared `KjListSeparator` primitive (role=separator,
 * aria-orientation=horizontal).
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandSeparator]',
  standalone: true,
  hostDirectives: [KjListSeparator],
})
export class KjCommandSeparator {}
