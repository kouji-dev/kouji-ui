import { Component } from '@angular/core';
import { KjTooltip } from './tooltip';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-tooltip-finance',
  standalone: true,
  imports: [KjTooltip, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 3rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 180px; color: var(--kj-text); }
    .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; justify-content: center; }
    button[kjButton] {
      padding: 4px 15px; font-family: var(--kj-font); font-size: 14px; font-weight: 400;
      border: 1px solid transparent; border-radius: 6px; cursor: pointer;
      transition: var(--kj-transition); line-height: 1.5;
    }
    button[kjButton][data-variant="default"]     { background: var(--kj-accent); color: var(--kj-accent-on); border-color: var(--kj-accent); }
    button[kjButton][data-variant="default"]:hover { background: #4096ff; border-color: #4096ff; }
    button[kjButton][data-variant="link"]        { background: transparent; color: var(--kj-accent); border-color: transparent; }
    button[kjButton][data-variant="link"]:hover  { color: #4096ff; }
    button[kjButton][data-variant="ghost"]       { background: transparent; color: var(--kj-text); border: 1px solid var(--kj-text); }
    button[kjButton][data-variant="ghost"]:hover { color: var(--kj-accent); border-color: var(--kj-accent); }
    :global([data-kj-tooltip]) {
      background: #1f2937; color: #f9fafb;
      padding: 0.3rem 0.625rem; font-size: 0.75rem; border-radius: var(--kj-radius-sm);
      white-space: nowrap; pointer-events: none; box-shadow: var(--kj-shadow-sm);
    }
    :global([data-kj-tooltip][hidden]) { display: none; }
  `],
  host: { class: 'kj-theme-finance' },
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'" [kjTooltip]="'Copy to clipboard'">Default</button>
      <button kjButton [kjVariant]="'link'" [kjTooltip]="'Opens below'" [kjTooltipSide]="'bottom'">Link</button>
      <button kjButton [kjVariant]="'ghost'" [kjTooltip]="'Opens right'" [kjTooltipSide]="'right'">Ghost</button>
    </div>
  `,
})
export class TooltipFinanceExample {}
