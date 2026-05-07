import { Component } from '@angular/core';
import { KjKbdComponent } from './kbd';
import {
  KjTooltipComponent,
  KjTooltipContentComponent,
} from '../tooltip/tooltip';
import { KjButtonComponent } from '../button/button';

/**
 * Kbd inside a tooltip — the canonical "shortcut hint" surface. The tooltip's
 * `aria-describedby` wiring picks up the kbd's text content automatically; no
 * special integration needed. Lives in the kbd folder so the kbd docs page
 * can preview it without depending on the tooltip docs page's example
 * registry.
 */
@Component({
  selector: 'kj-kbd-in-tooltip-example',
  standalone: true,
  imports: [
    KjKbdComponent,
    KjTooltipComponent,
    KjTooltipContentComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); }
    .kj-kbd-in-tooltip-body { display: inline-flex; align-items: center; gap: var(--kj-space-2xs); }
  `],
  template: `
    <kj-tooltip [kjTooltipTriggerFor]="tip">
      <kj-button kjVariant="outline">Save</kj-button>
    </kj-tooltip>
    <ng-template #tip>
      <kj-tooltip-content>
        <span class="kj-kbd-in-tooltip-body">
          Save
          <kj-kbd kjSize="xs">Ctrl</kj-kbd>
          +
          <kj-kbd kjSize="xs">S</kj-kbd>
        </span>
      </kj-tooltip-content>
    </ng-template>
  `,
})
export class KjKbdInTooltipExample {}
