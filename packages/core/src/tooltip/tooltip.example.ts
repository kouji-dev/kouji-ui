import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from './tooltip';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-tooltip-basic',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 3rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 180px; }
    .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; justify-content: center; }
    button[kjButton] { padding: 0.5rem 1.25rem; font-family: var(--kj-font); font-size: 0.875rem; border: var(--kj-btn-border); cursor: pointer; transition: var(--kj-transition); }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); }
    [data-variant="link"] { background: transparent; color: var(--kj-accent); border: none; padding: 0.5rem 0.5rem; text-decoration: none; text-underline-offset: 4px; }
    [data-variant="link"]:hover { text-decoration: underline; }
    [data-variant="ghost"] { background: transparent; color: var(--kj-btn-ghost-color); }
    :global(kj-tooltip-content) {
      background: var(--kj-accent); color: var(--kj-accent-on);
      padding: 0.25rem 0.625rem; font-size: 0.75rem;
      white-space: nowrap; pointer-events: none; transition: var(--kj-transition);
    }
  `],
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'" kjTooltipTrigger #t1="kjTooltipTrigger">Default</button>
      <kj-tooltip-content [kjFor]="t1">Copy to clipboard</kj-tooltip-content>

      <button kjButton [kjVariant]="'link'" kjTooltipTrigger #t2="kjTooltipTrigger">Link</button>
      <kj-tooltip-content [kjFor]="t2" [kjSide]="'bottom'">Opens below</kj-tooltip-content>

      <button kjButton [kjVariant]="'ghost'" kjTooltipTrigger #t3="kjTooltipTrigger">Ghost</button>
      <kj-tooltip-content [kjFor]="t3" [kjSide]="'right'">Opens right</kj-tooltip-content>
    </div>
  `,
})
export class TooltipBasicExample {}
