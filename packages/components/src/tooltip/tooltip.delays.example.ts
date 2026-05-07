import { Component } from '@angular/core';
import { KjTooltipComponent, KjTooltipContentComponent } from './tooltip';
import { KjButtonComponent } from '../button/button';

/**
 * Custom open and close delays. The first trigger opens almost immediately
 * (50 ms) while the second waits 1.2 s before showing — useful for
 * deliberately-quiet hints. Close delay covers WCAG 1.4.13 *hoverable*: the
 * tip stays open while the cursor traverses the gap to the panel.
 */
@Component({
  selector: 'kj-tooltip-delays-example',
  standalone: true,
  imports: [KjTooltipComponent, KjTooltipContentComponent, KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); flex-wrap: wrap; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-tooltip
      [kjTooltipTriggerFor]="fastTip"
      [kjOpenDelayMs]="50"
      [kjCloseDelayMs]="100"
    >
      <kj-button>Snappy (50 ms open)</kj-button>
    </kj-tooltip>

    <kj-tooltip
      [kjTooltipTriggerFor]="slowTip"
      [kjOpenDelayMs]="1200"
      [kjCloseDelayMs]="500"
    >
      <kj-button kjVariant="outline">Patient (1.2 s open)</kj-button>
    </kj-tooltip>

    <ng-template #fastTip>
      <kj-tooltip-content>Opens almost instantly</kj-tooltip-content>
    </ng-template>
    <ng-template #slowTip>
      <kj-tooltip-content>Waits 1.2 s before showing</kj-tooltip-content>
    </ng-template>
  `,
})
export class KjTooltipDelaysExample {}
