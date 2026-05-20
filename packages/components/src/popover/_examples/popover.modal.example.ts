import { Component } from '@angular/core';
import { KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): modal flag flows via core overlay-panel inputs.
@Component({
  selector: 'kj-popover-modal-example',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose, KjButtonComponent],
  template: `
    <kj-button kjPopoverTrigger #t="kjPopoverTrigger" kjVariant="destructive">Delete account</kj-button>
    <kj-popover-content [kjFor]="t" [kjTrap]="true">
      <h3 kjPopoverTitle>Delete account?</h3>
      <p>This action is permanent.</p>
      <kj-button kjPopoverClose kjVariant="destructive">Delete</kj-button>
    </kj-popover-content>
  `,
})
export class KjPopoverModalExample {}
