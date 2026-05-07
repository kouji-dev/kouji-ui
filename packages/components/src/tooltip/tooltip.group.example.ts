import { Component } from '@angular/core';
import {
  KjTooltipComponent,
  KjTooltipContentComponent,
  KjTooltipGroupComponent,
} from './tooltip';
import { KjButtonComponent } from '../button/button';

/**
 * `<kj-tooltip-group>` coordinates "skip-delay" timing across sibling
 * tooltips. Hover the first button — the tip waits the open delay; move to a
 * neighbour within the skip-delay window and its tip opens instantly. The
 * Radix-style ergonomic for toolbars and icon-button rows.
 */
@Component({
  selector: 'kj-tooltip-group-example',
  standalone: true,
  imports: [
    KjTooltipComponent,
    KjTooltipContentComponent,
    KjTooltipGroupComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); }
    kj-tooltip-group { display: inline-flex; gap: var(--kj-space-xs); }
  `],
  template: `
    <kj-tooltip-group>
      <kj-tooltip [kjTooltipTriggerFor]="boldTip">
        <kj-button kjVariant="ghost" kjAriaLabel="Bold">B</kj-button>
      </kj-tooltip>
      <kj-tooltip [kjTooltipTriggerFor]="italicTip">
        <kj-button kjVariant="ghost" kjAriaLabel="Italic">I</kj-button>
      </kj-tooltip>
      <kj-tooltip [kjTooltipTriggerFor]="underlineTip">
        <kj-button kjVariant="ghost" kjAriaLabel="Underline">U</kj-button>
      </kj-tooltip>
      <kj-tooltip [kjTooltipTriggerFor]="strikeTip">
        <kj-button kjVariant="ghost" kjAriaLabel="Strikethrough">S</kj-button>
      </kj-tooltip>
    </kj-tooltip-group>

    <ng-template #boldTip>
      <kj-tooltip-content>Bold</kj-tooltip-content>
    </ng-template>
    <ng-template #italicTip>
      <kj-tooltip-content>Italic</kj-tooltip-content>
    </ng-template>
    <ng-template #underlineTip>
      <kj-tooltip-content>Underline</kj-tooltip-content>
    </ng-template>
    <ng-template #strikeTip>
      <kj-tooltip-content>Strikethrough</kj-tooltip-content>
    </ng-template>
  `,
})
export class KjTooltipGroupExample {}
