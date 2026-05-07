import { Component } from '@angular/core';
import { KjTooltipComponent, KjTooltipContentComponent } from './tooltip';
import { KjButtonComponent } from '../button/button';

/**
 * One trigger per side — top, right, bottom, left. The wrapper forwards
 * `kjTooltipSide` to the underlying `KjTooltipTrigger`; the content's
 * `data-side` attribute is reflected so the styled wrapper can position
 * the optional arrow accordingly.
 */
@Component({
  selector: 'kj-tooltip-sides-example',
  standalone: true,
  imports: [KjTooltipComponent, KjTooltipContentComponent, KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); flex-wrap: wrap; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-tooltip [kjTooltipTriggerFor]="topTip" [kjTooltipSide]="'top'">
      <kj-button>Top</kj-button>
    </kj-tooltip>
    <kj-tooltip [kjTooltipTriggerFor]="rightTip" [kjTooltipSide]="'right'">
      <kj-button>Right</kj-button>
    </kj-tooltip>
    <kj-tooltip [kjTooltipTriggerFor]="bottomTip" [kjTooltipSide]="'bottom'">
      <kj-button>Bottom</kj-button>
    </kj-tooltip>
    <kj-tooltip [kjTooltipTriggerFor]="leftTip" [kjTooltipSide]="'left'">
      <kj-button>Left</kj-button>
    </kj-tooltip>

    <ng-template #topTip>
      <kj-tooltip-content [kjTooltipSide]="'top'">Above the trigger</kj-tooltip-content>
    </ng-template>
    <ng-template #rightTip>
      <kj-tooltip-content [kjTooltipSide]="'right'">Right of the trigger</kj-tooltip-content>
    </ng-template>
    <ng-template #bottomTip>
      <kj-tooltip-content [kjTooltipSide]="'bottom'">Below the trigger</kj-tooltip-content>
    </ng-template>
    <ng-template #leftTip>
      <kj-tooltip-content [kjTooltipSide]="'left'">Left of the trigger</kj-tooltip-content>
    </ng-template>
  `,
})
export class KjTooltipSidesExample {}
