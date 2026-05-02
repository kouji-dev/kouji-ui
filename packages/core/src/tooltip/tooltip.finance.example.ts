import { Component } from '@angular/core';
import { KjTooltip, KjTooltipTrigger, KjTooltipContent } from './tooltip';

@Component({
  selector: 'kj-example-tooltip-finance',
  standalone: true,
  imports: [KjTooltip, KjTooltipTrigger, KjTooltipContent],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 3rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; min-height: 180px; }
    .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; justify-content: center; }
    .tip-wrap { position: relative; display: inline-block; }
    button {
      padding: 0.4rem 1rem; background: #fff; color: #374151; border: 1px solid #d1d5db;
      border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.875rem;
      font-weight: 500; transition: background 0.12s;
    }
    button:hover { background: #f3f4f6; }
    [kjTooltipContent] {
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      background: #1f2937; color: #f9fafb; padding: 0.3rem 0.625rem; font-size: 0.75rem;
      white-space: nowrap; pointer-events: none; border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    [kjTooltipContent][hidden] { display: none; }
    [kjTooltipContent][data-side="bottom"] { top: calc(100% + 8px); bottom: auto; }
    [kjTooltipContent][data-side="right"] { left: calc(100% + 8px); bottom: auto; top: 50%; transform: translateY(-50%); }
  `],
  template: `
    <div class="row">
      <div class="tip-wrap" kjTooltip>
        <button kjTooltipTrigger>Save</button>
        <span kjTooltipContent role="tooltip">Save all changes</span>
      </div>
      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'bottom'">
        <button kjTooltipTrigger>Export</button>
        <span kjTooltipContent role="tooltip">Download as CSV</span>
      </div>
      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'right'">
        <button kjTooltipTrigger>Help</button>
        <span kjTooltipContent role="tooltip">View documentation</span>
      </div>
    </div>
  `,
})
export class TooltipFinanceExample {}
