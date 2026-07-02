import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin sides demo.
@Component({
  selector: 'kj-tooltip-sides-example',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjTooltipTrigger #top="kjTooltipTrigger">Top</kj-button>
    <kj-tooltip-content [kjFor]="top" kjSide="top">Top</kj-tooltip-content>
    <kj-button kjTooltipTrigger #bottom="kjTooltipTrigger">Bottom</kj-button>
    <kj-tooltip-content [kjFor]="bottom" kjSide="bottom">Bottom</kj-tooltip-content>
  `,
})
export class KjTooltipSidesExample {}
