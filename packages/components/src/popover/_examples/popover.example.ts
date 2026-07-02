import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin via wrapper layer once styled overlay components land.
@Component({
  selector: 'kj-popover-example',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjPopoverTrigger #t="kjPopoverTrigger">Open popover</kj-button>
    <kj-popover-content [kjFor]="t">
      <h3 kjPopoverTitle>Notification settings</h3>
      <p>Control how and when you receive notifications.</p>
      <kj-button kjPopoverClose>Close</kj-button>
    </kj-popover-content>
  `,
})
export class KjPopoverExample {}
