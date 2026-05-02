import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from './tooltip';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-tooltip-placements',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 4rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 220px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: auto auto auto; gap: 0.75rem; place-items: center; }
    .tip-wrap { position: relative; display: inline-block; }
    button[kjButton] {
      padding: 0.35rem 0.875rem; border: 1px solid var(--kj-border); background: transparent;
      color: var(--kj-text); cursor: pointer; font-family: var(--kj-font); font-size: 0.75rem;
    }
    button[kjButton]:hover { border-color: var(--kj-accent); color: var(--kj-accent); }
    [kjTooltipContent] {
      position: absolute; z-index: 10;
      background: var(--kj-accent); color: var(--kj-accent-on); padding: 0.2rem 0.5rem; font-size: 0.6875rem;
      white-space: nowrap; pointer-events: none;
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
      <div class="tip-wrap">
        <button kjButton [kjTooltipTrigger]="tipTop">Top</button>
        <span #tipTop kjTooltipContent [kjTooltipSide]="'top'">Top tooltip</span>
      </div>
      <div class="empty"></div>

      <div class="tip-wrap">
        <button kjButton [kjTooltipTrigger]="tipLeft">Left</button>
        <span #tipLeft kjTooltipContent [kjTooltipSide]="'left'">Left tooltip</span>
      </div>
      <div class="empty"></div>
      <div class="tip-wrap">
        <button kjButton [kjTooltipTrigger]="tipRight">Right</button>
        <span #tipRight kjTooltipContent [kjTooltipSide]="'right'">Right tooltip</span>
      </div>

      <div class="empty"></div>
      <div class="tip-wrap">
        <button kjButton [kjTooltipTrigger]="tipBottom">Bottom</button>
        <span #tipBottom kjTooltipContent [kjTooltipSide]="'bottom'">Bottom tooltip</span>
      </div>
      <div class="empty"></div>
    </div>
  `,
})
export class TooltipPlacementsExample {}
