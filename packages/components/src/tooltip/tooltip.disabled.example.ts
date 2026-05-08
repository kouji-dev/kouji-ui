import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

// TODO(wrapper-overlay): re-skin disabled demo.
@Component({
  selector: 'kj-tooltip-disabled-example',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButtonComponent],
  template: `
    <kj-button kjTooltipTrigger [kjDisabled]="true" #t="kjTooltipTrigger">No tooltip</kj-button>
    <kj-tooltip-content [kjFor]="t">Hidden</kj-tooltip-content>
  `,
})
export class KjTooltipDisabledExample {}
