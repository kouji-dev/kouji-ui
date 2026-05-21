import { Component } from '@angular/core';
import { KjButtonGroupComponent } from '../button-group';
import { KjButtonComponent } from '../../button/button';

/**
 * Icon-only segmented control. `kjSize="icon"` enforces the 44×44 touch
 * target on each child (per `KjButton`'s WCAG 2.5.5 rule), and the group
 * collapses the inner edges into a tight cluster suitable for a toolbar.
 */
@Component({
  selector: 'kj-button-group-icon-only-example',
  standalone: true,
  imports: [KjButtonGroupComponent, KjButtonComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-button-group kjAriaLabel="Alignment">
      <kj-button kjVariant="outline" kjSize="icon" kjAriaLabel="Align left">⟸</kj-button>
      <kj-button kjVariant="outline" kjSize="icon" kjAriaLabel="Align center">≡</kj-button>
      <kj-button kjVariant="outline" kjSize="icon" kjAriaLabel="Align right">⟹</kj-button>
    </kj-button-group>
  `,
})
export class KjButtonGroupIconOnlyExample {}
