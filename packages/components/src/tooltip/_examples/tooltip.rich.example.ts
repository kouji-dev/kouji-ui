import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent, KjTooltipArrow } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin rich tooltip demo.
@Component({
  selector: 'kj-tooltip-rich-example',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjTooltipArrow, KjButtonComponent],
  template: `
    <kj-button kjTooltipTrigger #t="kjTooltipTrigger">Save</kj-button>
    <kj-tooltip-content [kjFor]="t">
      <strong>Save</strong>
      <span kjTooltipArrow></span>
    </kj-tooltip-content>
  `,
})
export class KjTooltipRichExample {}
