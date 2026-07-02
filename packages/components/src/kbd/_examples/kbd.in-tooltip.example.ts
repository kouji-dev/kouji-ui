import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjKbdComponent } from '../kbd';
import { KjTooltipTrigger, KjTooltipContent } from '../../tooltip/tooltip';
import { KjButtonComponent } from '../../button/button';

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
  imports: [KjKbdComponent, KjTooltipTrigger, KjTooltipContent, KjButtonComponent],
  styles: [
    `
      :host {
        display: block;
        padding: var(--kj-space-2xl);
      }
      .kj-kbd-in-tooltip-body {
        display: inline-flex;
        align-items: center;
        gap: var(--kj-space-2xs);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjTooltipTrigger #t="kjTooltipTrigger" kjVariant="outline">Save</kj-button>
    <kj-tooltip-content [kjFor]="t">
      <span class="kj-kbd-in-tooltip-body">
        Save
        <kj-kbd kjSize="xs">Ctrl</kj-kbd>
        +
        <kj-kbd kjSize="xs">S</kj-kbd>
      </span>
    </kj-tooltip-content>
  `,
})
export class KjKbdInTooltipExample {}
