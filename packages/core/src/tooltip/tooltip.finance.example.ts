import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from './tooltip';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-tooltip-finance',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  /* Closed-state `display:none` for portaled `kj-tooltip-content` comes from
   * `packages/components/src/tooltip/tooltip.css` (docs app global styles) — not repeated here. */
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
    :global(kj-tooltip-content) {
      background: #1f2937; color: #f9fafb;
      padding: 0.3rem 0.625rem; font-size: 0.75rem; border-radius: var(--kj-radius-sm);
      white-space: nowrap; pointer-events: none; box-shadow: var(--kj-shadow-sm);
    }
  `],
  host: { class: 'kj-theme-finance' },
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
export class TooltipFinanceExample {}
