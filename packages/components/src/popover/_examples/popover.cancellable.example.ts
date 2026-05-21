import { Component } from '@angular/core';
import { KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): cancellable close needs new event hook on overlay primitives.
@Component({
  selector: 'kj-popover-cancellable-example',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose, KjButtonComponent],
  template: `
    <kj-button kjPopoverTrigger #t="kjPopoverTrigger">Edit profile</kj-button>
    <kj-popover-content [kjFor]="t">
      <h3 kjPopoverTitle>Edit profile</h3>
      <p>Pretend there is a form here.</p>
      <kj-button kjPopoverClose>Close</kj-button>
    </kj-popover-content>
  `,
})
export class KjPopoverCancellableExample {}
