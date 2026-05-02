import { Component } from '@angular/core';
import { KjTooltip, KjTooltipTrigger, KjTooltipContent } from './tooltip';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-tooltip-basic',
  standalone: true,
  imports: [KjTooltip, KjTooltipTrigger, KjTooltipContent, KjButton],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 3rem; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; min-height: 180px; }
    .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; justify-content: center; }
    .tip-wrap { position: relative; display: inline-block; }
    button[kjButton] { padding: 0.5rem 1.25rem; border: 1px solid #333; background: transparent; color: #f0ede6; cursor: pointer; font-family: inherit; font-size: 0.875rem; }
    button[kjButton]:hover { border-color: #b8f500; color: #b8f500; }
    [kjTooltipContent] {
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      background: #b8f500; color: #0c0c0c; padding: 0.25rem 0.625rem; font-size: 0.75rem;
      white-space: nowrap; pointer-events: none;
      transition: opacity 0.15s;
    }
    [kjTooltipContent][hidden] { display: none; }
    [kjTooltipContent][data-side="bottom"] { top: calc(100% + 8px); bottom: auto; }
    [kjTooltipContent][data-side="left"]  { right: calc(100% + 8px); left: auto; bottom: auto; top: 50%; transform: translateY(-50%); }
    [kjTooltipContent][data-side="right"] { left: calc(100% + 8px); bottom: auto; top: 50%; transform: translateY(-50%); }
  `],
  template: `
    <div class="row">
      <div class="tip-wrap" kjTooltip>
        <button kjButton kjTooltipTrigger>Hover me</button>
        <span kjTooltipContent role="tooltip">Copy to clipboard</span>
      </div>

      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'bottom'">
        <button kjButton kjTooltipTrigger>Bottom</button>
        <span kjTooltipContent role="tooltip">Opens below</span>
      </div>

      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'right'">
        <button kjButton kjTooltipTrigger>Right</button>
        <span kjTooltipContent role="tooltip">Opens right</span>
      </div>
    </div>
  `,
})
export class TooltipBasicExample {}
