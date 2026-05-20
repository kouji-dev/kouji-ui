import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin via styled wrapper layer.
@Component({
  selector: 'kj-tooltip-example',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButtonComponent],
  template: `
    <kj-button kjTooltipTrigger #t="kjTooltipTrigger">Hover me</kj-button>
    <kj-tooltip-content [kjFor]="t">Save the document</kj-tooltip-content>
  `,
})
export class KjTooltipExample {}
