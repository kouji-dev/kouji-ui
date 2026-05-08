import { Component } from '@angular/core';
import { KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverArrow } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

// TODO(wrapper-overlay): re-skin sides demo.
@Component({
  selector: 'kj-popover-sides-example',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverArrow, KjButtonComponent],
  template: `
    <kj-button kjPopoverTrigger #top="kjPopoverTrigger">Top</kj-button>
    <kj-popover-content [kjFor]="top" kjSide="top"><h3 kjPopoverTitle>Top</h3><span kjPopoverArrow></span></kj-popover-content>

    <kj-button kjPopoverTrigger #right="kjPopoverTrigger">Right</kj-button>
    <kj-popover-content [kjFor]="right" kjSide="right"><h3 kjPopoverTitle>Right</h3><span kjPopoverArrow></span></kj-popover-content>

    <kj-button kjPopoverTrigger #bottom="kjPopoverTrigger">Bottom</kj-button>
    <kj-popover-content [kjFor]="bottom" kjSide="bottom"><h3 kjPopoverTitle>Bottom</h3><span kjPopoverArrow></span></kj-popover-content>

    <kj-button kjPopoverTrigger #left="kjPopoverTrigger">Left</kj-button>
    <kj-popover-content [kjFor]="left" kjSide="left"><h3 kjPopoverTitle>Left</h3><span kjPopoverArrow></span></kj-popover-content>
  `,
})
export class KjPopoverSidesExample {}
