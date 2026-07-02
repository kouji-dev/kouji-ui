import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin delays demo.
@Component({
  selector: 'kj-tooltip-delays-example',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjTooltipTrigger [kjOpenDelay]="500" #t="kjTooltipTrigger">Slow</kj-button>
    <kj-tooltip-content [kjFor]="t">Half-second delay</kj-tooltip-content>
  `,
})
export class KjTooltipDelaysExample {}
