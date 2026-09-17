import {
  Directive,
} from '@angular/core';

/**
 * Marker directive for projecting custom footer content into a
 * `<kj-command-palette>`. When present, the wrapper hides its default
 * keyboard-hint footer and renders the projected content instead.
 *
 * @doc-css-var
 *   --kj-command-item-direction — Flex direction on each command row. Defaults to `row`; switch to `column` for stacked layouts.
 *   --kj-command-item-align     — Cross-axis alignment of row contents. Defaults to `center`.
 *   --kj-command-item-gap       — Gap between icon and label inside a row. Defaults to --kj-space-md.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 * @doc-description Themed Cmd-K modal command palette with fuzzy filtering, grouped results, and keyboard navigation.
 */
@Directive({
  selector: '[kjCommandPaletteFooter]',
  standalone: true,
})
export class KjCommandPaletteFooter {}
