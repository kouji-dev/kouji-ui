import { Component } from '@angular/core';
import { KjTooltipComponent, KjTooltipContentComponent } from './tooltip';
import { KjButtonComponent } from '../button/button';

/**
 * Default usage example for KjTooltipComponent.
 * Hovering or focusing the trigger reveals a plain-text tip above the button
 * after the open delay; the tip portals to `document.body` so it escapes any
 * clipping ancestor.
 */
@Component({
  selector: 'kj-tooltip-example',
  standalone: true,
  imports: [KjTooltipComponent, KjTooltipContentComponent, KjButtonComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tooltip [kjTooltipTriggerFor]="tip">
      <kj-button kjVariant="default">Hover me</kj-button>
    </kj-tooltip>
    <ng-template #tip>
      <kj-tooltip-content>Save the document</kj-tooltip-content>
    </ng-template>
  `,
})
export class KjTooltipExample {}
