import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjKbdComponent } from '../kbd';

/**
 * Combo example: sibling `<kj-kbd>` elements with a literal " + " between
 * them. Per the analysis there is no `KjKbdGroup` directive — the visual
 * gap is just inline whitespace plus a `+` glyph, and AT correctly
 * announces the combo as e.g. "Control plus K" without extra ARIA wiring.
 */
@Component({
  selector: 'kj-kbd-combo-example',
  standalone: true,
  imports: [KjKbdComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<p><kj-kbd>Ctrl</kj-kbd> + <kj-kbd>K</kj-kbd></p>`,
})
export class KjKbdComboExample {}
