import { Component } from '@angular/core';
import { KjTooltip } from './tooltip';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-tooltip-basic',
  standalone: true,
  imports: [KjTooltip, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 3rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 180px; }
    .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; justify-content: center; }
    button[kjButton] { padding: 0.5rem 1.25rem; font-family: var(--kj-font); font-size: 0.875rem; border: var(--kj-btn-border); cursor: pointer; transition: var(--kj-transition); }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); }
    [data-variant="link"] { background: transparent; color: var(--kj-accent); border: none; padding: 0.5rem 0.5rem; text-decoration: none; text-underline-offset: 4px; }
    [data-variant="link"]:hover { text-decoration: underline; }
    [data-variant="ghost"] { background: transparent; color: var(--kj-btn-ghost-color); }
    :global([data-kj-tooltip]) {
      background: var(--kj-accent); color: var(--kj-accent-on);
      padding: 0.25rem 0.625rem; font-size: 0.75rem;
      white-space: nowrap; pointer-events: none; transition: var(--kj-transition);
    }
    :global([data-kj-tooltip][hidden]) { display: none; }
  `],
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'" [kjTooltip]="'Copy to clipboard'">Default</button>
      <button kjButton [kjVariant]="'link'" [kjTooltip]="'Opens below'" [kjTooltipSide]="'bottom'">Link</button>
      <button kjButton [kjVariant]="'ghost'" [kjTooltip]="'Opens right'" [kjTooltipSide]="'right'">Ghost</button>
    </div>
  `,
})
export class TooltipBasicExample {}
