import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from './tooltip';

@Component({
  selector: 'kj-example-tooltip-finance',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 3rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 180px; color: var(--kj-text); }
    .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; justify-content: center; }
    .tip-wrap { position: relative; display: inline-block; }
    button {
      padding: 0.45rem 1rem; background: transparent; color: var(--kj-text); border: var(--kj-btn-outline-border);
      border-radius: var(--kj-radius-md); cursor: pointer; font-family: var(--kj-font); font-size: 0.875rem; font-weight: 500;
      transition: var(--kj-transition);
    }
    button:hover { background: var(--kj-bg); }
    [kjTooltipContent] {
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      background: #1f2937; color: #f9fafb;
      padding: 0.3rem 0.625rem; font-size: 0.75rem; border-radius: var(--kj-radius-sm);
      white-space: nowrap; pointer-events: none; box-shadow: var(--kj-shadow-sm);
    }
    [kjTooltipContent][hidden] { display: none; }
    [data-side="bottom"] { top: calc(100% + 8px); bottom: auto; }
    [data-side="right"] { left: calc(100% + 8px); bottom: auto; top: 50%; transform: translateY(-50%); }
  `],
  host: { class: 'kj-theme-finance' },
  template: `
    <div class="row">
      <div class="tip-wrap">
        <button [kjTooltipTrigger]="tip1">Hover me</button>
        <span #tip1="kjTooltipContent" kjTooltipContent>Copy to clipboard</span>
      </div>
      <div class="tip-wrap">
        <button [kjTooltipTrigger]="tip2">Bottom</button>
        <span #tip2="kjTooltipContent" kjTooltipContent [kjTooltipSide]="'bottom'">Opens below</span>
      </div>
    </div>
  `,
})
export class TooltipFinanceExample {}
