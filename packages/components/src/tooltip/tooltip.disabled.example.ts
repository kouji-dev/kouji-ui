import { Component } from '@angular/core';
import { KjTooltipComponent, KjTooltipContentComponent } from './tooltip';
import { KjButtonComponent } from '../button/button';

/**
 * `kjTooltipDisabled` suppresses opening entirely — useful for conditional
 * hints (e.g. "show this tip only when the input is invalid"). Disabled
 * tooltips do not wire `aria-describedby` either; they are truly inert. The
 * trigger reflects `data-disabled` for any wrapper styling.
 */
@Component({
  selector: 'kj-tooltip-disabled-example',
  standalone: true,
  imports: [KjTooltipComponent, KjTooltipContentComponent, KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); flex-wrap: wrap; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-tooltip [kjTooltipTriggerFor]="activeTip">
      <kj-button>Hover for a tip</kj-button>
    </kj-tooltip>

    <kj-tooltip [kjTooltipTriggerFor]="suppressedTip" [kjTooltipDisabled]="true">
      <kj-button kjVariant="outline">Tooltip suppressed</kj-button>
    </kj-tooltip>

    <ng-template #activeTip>
      <kj-tooltip-content>This one shows</kj-tooltip-content>
    </ng-template>
    <ng-template #suppressedTip>
      <kj-tooltip-content>You will never see me</kj-tooltip-content>
    </ng-template>
  `,
})
export class KjTooltipDisabledExample {}
