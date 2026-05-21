import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

/**
 * A walkthrough of the most common tooltip usages — default placement, an
 * explicit side, a slower delay for verbose copy, and a rich body with a
 * heading and supporting text. Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-tooltip-usage-example',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); flex-wrap: wrap; align-items: center; padding: var(--kj-space-2xl); }
    .rich { display: flex; flex-direction: column; gap: var(--kj-space-2xs); }
    .rich strong { font-weight: 600; }
  `],
  template: `
    <kj-button kjTooltipTrigger #saveTrig="kjTooltipTrigger">Save</kj-button>
    <kj-tooltip-content [kjFor]="saveTrig">Save the document</kj-tooltip-content>

    <kj-button kjTooltipTrigger #shipTrig="kjTooltipTrigger" kjSide="right">Ship</kj-button>
    <kj-tooltip-content [kjFor]="shipTrig" kjSide="right">Deploy to production</kj-tooltip-content>

    <kj-button kjTooltipTrigger #slowTrig="kjTooltipTrigger" [kjOpenDelay]="500">Help</kj-button>
    <kj-tooltip-content [kjFor]="slowTrig">
      <div class="rich">
        <strong>Need a hand?</strong>
        <span>Press ⌘K to open the command palette.</span>
      </div>
    </kj-tooltip-content>
  `,
})
export class KjTooltipUsageExample {}
