import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from './tooltip';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-tooltip-finance',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 3rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 180px; color: var(--kj-text); }
    .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; justify-content: center; }
    .tip-wrap { position: relative; display: inline-block; }
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
    [kjTooltipContent] {
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      background: #1f2937; color: #f9fafb;
      padding: 0.3rem 0.625rem; font-size: 0.75rem; border-radius: var(--kj-radius-sm);
      white-space: nowrap; pointer-events: none; box-shadow: var(--kj-shadow-sm);
    }
    [kjTooltipContent][hidden] { display: none; }
    [data-side="bottom"] { top: calc(100% + 8px); bottom: auto; }
    [data-side="right"] { left: calc(100% + 8px); bottom: auto; top: 50%; transform: translateY(-50%); }
    [data-side="left"]  { right: calc(100% + 8px); left: auto; bottom: auto; top: 50%; transform: translateY(-50%); }
  `],
  host: { class: 'kj-theme-finance' },
  template: `
    <div class="row">
      <div class="tip-wrap">
        <button kjButton [kjVariant]="'default'" [kjTooltipTrigger]="tip1">Default</button>
        <span #tip1 kjTooltipContent>Copy to clipboard</span>
      </div>
      <div class="tip-wrap">
        <button kjButton [kjVariant]="'link'" [kjTooltipTrigger]="tip2">Link</button>
        <span #tip2 kjTooltipContent [kjTooltipSide]="'bottom'">Opens below</span>
      </div>
      <div class="tip-wrap">
        <button kjButton [kjVariant]="'ghost'" [kjTooltipTrigger]="tip3">Ghost</button>
        <span #tip3 kjTooltipContent [kjTooltipSide]="'right'">Opens right</span>
      </div>
    </div>
  `,
})
export class TooltipFinanceExample {}
