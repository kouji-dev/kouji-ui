import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent, KjTooltipGroup } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin tooltip group demo.
@Component({
  selector: 'kj-tooltip-group-example',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjTooltipGroup, KjButtonComponent],
  template: `
    <div kjTooltipGroup>
      <kj-button kjTooltipTrigger #a="kjTooltipTrigger">A</kj-button>
      <kj-tooltip-content [kjFor]="a">Tip A</kj-tooltip-content>
      <kj-button kjTooltipTrigger #b="kjTooltipTrigger">B</kj-button>
      <kj-tooltip-content [kjFor]="b">Tip B</kj-tooltip-content>
    </div>
  `,
})
export class KjTooltipGroupExample {}
