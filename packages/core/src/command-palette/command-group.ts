import { Directive } from '@angular/core';
import { KjListGroup } from '../primitives/list';

/**
 * Group wrapper for command items. Composes `KjListGroup` for the
 * shared role=group / aria-labelledby / auto-hide-when-empty behavior;
 * this selector exists so existing command-palette templates keep
 * working unchanged.
 *
 * Pair with a `[kjListGroupLabel]` heading element for the section title.
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandGroup]',
  standalone: true,
  hostDirectives: [KjListGroup],
})
export class KjCommandGroup {}
