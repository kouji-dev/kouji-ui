import { Component } from '@angular/core';
import { KjButtonGroupComponent } from './button-group';
import { KjButtonComponent } from '../button/button';

/**
 * Vertical orientation: the group stacks its children top-to-bottom and
 * collapses the touching top/bottom edges into a single segmented column.
 */
@Component({
  selector: 'kj-button-group-vertical-example',
  standalone: true,
  imports: [KjButtonGroupComponent, KjButtonComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <kj-button-group kjOrientation="vertical" kjAriaLabel="View options">
      <kj-button kjVariant="outline">Top</kj-button>
      <kj-button kjVariant="outline">Middle</kj-button>
      <kj-button kjVariant="outline">Bottom</kj-button>
    </kj-button-group>
  `,
})
export class KjButtonGroupVerticalExample {}
