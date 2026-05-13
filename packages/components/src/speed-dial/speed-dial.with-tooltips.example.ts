import { Component } from '@angular/core';
import {
  KjSpeedDialActionComponent,
  KjSpeedDialActionsComponent,
  KjSpeedDialComponent,
  KjSpeedDialTriggerComponent,
} from './speed-dial';
import { KjTooltipTrigger, KjTooltipContent } from '../tooltip/tooltip';

/**
 * Speed Dial where each action button has a tooltip describing the action.
 *
 * The action's `kjAriaLabel` is the AT-visible name; the tooltip is purely a
 * sighted-user supplement.
 */
@Component({
  selector: 'kj-speed-dial-with-tooltips-example',
  standalone: true,
  imports: [
    KjSpeedDialComponent,
    KjSpeedDialTriggerComponent,
    KjSpeedDialActionsComponent,
    KjSpeedDialActionComponent,
    KjTooltipTrigger,
    KjTooltipContent,
  ],
  styles: [`
    :host {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      padding: var(--kj-space-2xl);
      background: var(--kj-bg-surface);
      min-height: 18rem;
    }
  `],
  template: `
    <kj-speed-dial kjDirection="up" kjPosition="static">
      <kj-speed-dial-trigger kjAriaLabel="Open quick actions">+</kj-speed-dial-trigger>
      <kj-speed-dial-actions>
        <kj-speed-dial-action kjTooltipTrigger #editT="kjTooltipTrigger" kjAriaLabel="Edit">E</kj-speed-dial-action>
        <kj-tooltip-content [kjFor]="editT" kjSide="left">Edit document</kj-tooltip-content>

        <kj-speed-dial-action kjTooltipTrigger #shareT="kjTooltipTrigger" kjAriaLabel="Share">S</kj-speed-dial-action>
        <kj-tooltip-content [kjFor]="shareT" kjSide="left">Share with team</kj-tooltip-content>

        <kj-speed-dial-action kjTooltipTrigger #deleteT="kjTooltipTrigger" kjAriaLabel="Delete" kjVariant="destructive">D</kj-speed-dial-action>
        <kj-tooltip-content [kjFor]="deleteT" kjSide="left">Move to trash</kj-tooltip-content>
      </kj-speed-dial-actions>
    </kj-speed-dial>
  `,
})
export class KjSpeedDialWithTooltipsExample {}
