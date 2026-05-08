import { Component } from '@angular/core';
import { KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

// TODO(wrapper-overlay): re-skin form demo.
@Component({
  selector: 'kj-popover-with-form-example',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose, KjButtonComponent],
  template: `
    <kj-button kjPopoverTrigger #t="kjPopoverTrigger">Open form</kj-button>
    <kj-popover-content [kjFor]="t">
      <h3 kjPopoverTitle>Form</h3>
      <input type="text" />
      <kj-button kjPopoverClose>Save</kj-button>
    </kj-popover-content>
  `,
})
export class KjPopoverWithFormExample {}
