import { Component } from '@angular/core';
import { KjButtonGroupComponent } from './button-group';
import { KjButtonComponent } from '../button/button';

/**
 * Default usage example for KjButtonGroupComponent.
 * Three joined buttons with the group's defaults
 * (`kjOrientation="horizontal"`).
 */
@Component({
  selector: 'kj-button-group-example',
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
    <kj-button-group kjAriaLabel="Document actions">
      <kj-button kjVariant="outline">Save</kj-button>
      <kj-button kjVariant="outline">Cancel</kj-button>
      <kj-button kjVariant="outline">Delete</kj-button>
    </kj-button-group>
  `,
})
export class KjButtonGroupExample {}
