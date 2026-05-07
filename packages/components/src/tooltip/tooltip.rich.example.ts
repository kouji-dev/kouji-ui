import { Component } from '@angular/core';
import {
  KjTooltipComponent,
  KjTooltipContentComponent,
  KjTooltipArrowComponent,
} from './tooltip';
import { KjButtonComponent } from '../button/button';

/**
 * Rich (multi-line) content with a decorative arrow. The compound shape
 * accepts any non-interactive children projected into `<kj-tooltip-content>` —
 * keep buttons, links, and inputs out (those belong in a popover). The arrow
 * is positioned via CSS reading `data-side` from the parent content element.
 */
@Component({
  selector: 'kj-tooltip-rich-example',
  standalone: true,
  imports: [
    KjTooltipComponent,
    KjTooltipContentComponent,
    KjTooltipArrowComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); }
    .kj-tooltip-rich-body { display: flex; flex-direction: column; gap: var(--kj-space-2xs); }
    .kj-tooltip-rich-title { font-weight: 600; }
    .kj-tooltip-rich-hint { opacity: 0.85; font-size: 0.75rem; }
  `],
  template: `
    <kj-tooltip [kjTooltipTriggerFor]="tip" [kjTooltipSide]="'top'">
      <kj-button kjVariant="outline">Keyboard shortcut</kj-button>
    </kj-tooltip>
    <ng-template #tip>
      <kj-tooltip-content [kjTooltipSide]="'top'">
        <span class="kj-tooltip-rich-body">
          <span class="kj-tooltip-rich-title">Save the document</span>
          <span class="kj-tooltip-rich-hint">Cmd / Ctrl + S</span>
        </span>
        <kj-tooltip-arrow></kj-tooltip-arrow>
      </kj-tooltip-content>
    </ng-template>
  `,
})
export class KjTooltipRichExample {}
