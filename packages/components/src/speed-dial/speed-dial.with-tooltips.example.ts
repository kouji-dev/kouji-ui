import { Component } from '@angular/core';
import {
  KjSpeedDialActionComponent,
  KjSpeedDialActionsComponent,
  KjSpeedDialComponent,
  KjSpeedDialTriggerComponent,
} from './speed-dial';
import {
  KjTooltipComponent,
  KjTooltipContentComponent,
} from '../tooltip/tooltip';

/**
 * Speed Dial where each action button has a tooltip describing the action.
 *
 * Tooltips are composed per-action via `<kj-tooltip [kjTooltipTriggerFor]>`
 * around the action button. The action's `kjAriaLabel` is the AT-visible
 * name; the tooltip is purely a sighted-user supplement.
 */
@Component({
  selector: 'kj-speed-dial-with-tooltips-example',
  standalone: true,
  imports: [
    KjSpeedDialComponent,
    KjSpeedDialTriggerComponent,
    KjSpeedDialActionsComponent,
    KjSpeedDialActionComponent,
    KjTooltipComponent,
    KjTooltipContentComponent,
  ],
  styles: [`
    :host {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      padding: var(--kj-space-2xl);
      background: var(--kj-color-base-200);
      min-height: 18rem;
    }
  `],
  template: `
    <kj-speed-dial kjDirection="up" kjPosition="static">
      <kj-speed-dial-trigger kjAriaLabel="Open quick actions">+</kj-speed-dial-trigger>
      <kj-speed-dial-actions>
        <kj-tooltip [kjTooltipTriggerFor]="editTip" kjTooltipSide="left">
          <kj-speed-dial-action kjAriaLabel="Edit">E</kj-speed-dial-action>
        </kj-tooltip>
        <ng-template #editTip>
          <kj-tooltip-content>Edit document</kj-tooltip-content>
        </ng-template>

        <kj-tooltip [kjTooltipTriggerFor]="shareTip" kjTooltipSide="left">
          <kj-speed-dial-action kjAriaLabel="Share">S</kj-speed-dial-action>
        </kj-tooltip>
        <ng-template #shareTip>
          <kj-tooltip-content>Share with team</kj-tooltip-content>
        </ng-template>

        <kj-tooltip [kjTooltipTriggerFor]="deleteTip" kjTooltipSide="left">
          <kj-speed-dial-action kjAriaLabel="Delete" kjVariant="destructive">D</kj-speed-dial-action>
        </kj-tooltip>
        <ng-template #deleteTip>
          <kj-tooltip-content>Move to trash</kj-tooltip-content>
        </ng-template>
      </kj-speed-dial-actions>
    </kj-speed-dial>
  `,
})
export class KjSpeedDialWithTooltipsExample {}
