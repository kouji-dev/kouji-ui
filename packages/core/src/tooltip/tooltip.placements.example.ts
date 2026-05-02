import { Component } from '@angular/core';
import { KjTooltip, KjTooltipTrigger, KjTooltipContent } from './tooltip';

@Component({
  selector: 'kj-example-tooltip-placements',
  standalone: true,
  imports: [KjTooltip, KjTooltipTrigger, KjTooltipContent],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 4rem; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; min-height: 220px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: auto auto auto; gap: 0.75rem; place-items: center; }
    .tip-wrap { position: relative; display: inline-block; }
    button {
      padding: 0.35rem 0.875rem; border: 1px solid #333; background: transparent;
      color: #888; cursor: pointer; font-family: inherit; font-size: 0.75rem;
    }
    button:hover { border-color: #b8f500; color: #b8f500; }
    [kjTooltipContent] {
      position: absolute; z-index: 10;
      background: #222; color: #f0ede6; padding: 0.2rem 0.5rem; font-size: 0.6875rem;
      white-space: nowrap; pointer-events: none; border: 1px solid #333;
    }
    [kjTooltipContent][hidden] { display: none; }
    [data-side="top"]    { bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
    [data-side="bottom"] { top: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
    [data-side="left"]   { right: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
    [data-side="right"]  { left: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
    .empty { width: 80px; }
  `],
  template: `
    <div class="grid">
      <div class="empty"></div>
      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'top'">
        <button kjTooltipTrigger>Top</button>
        <span kjTooltipContent role="tooltip">Top tooltip</span>
      </div>
      <div class="empty"></div>

      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'left'">
        <button kjTooltipTrigger>Left</button>
        <span kjTooltipContent role="tooltip">Left tooltip</span>
      </div>
      <div class="empty"></div>
      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'right'">
        <button kjTooltipTrigger>Right</button>
        <span kjTooltipContent role="tooltip">Right tooltip</span>
      </div>

      <div class="empty"></div>
      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'bottom'">
        <button kjTooltipTrigger>Bottom</button>
        <span kjTooltipContent role="tooltip">Bottom tooltip</span>
      </div>
      <div class="empty"></div>
    </div>
  `,
})
export class TooltipPlacementsExample {}
