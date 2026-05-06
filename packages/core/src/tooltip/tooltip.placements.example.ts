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
    button[kjButton] { padding: 0.5rem 1.25rem; font-family: var(--kj-font); font-size: 0.875rem; border: var(--kj-btn-border); cursor: pointer; transition: var(--kj-transition); }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); }
    [kjTooltipContent] {
      position: absolute; z-index: 10;
      background: var(--kj-accent); color: var(--kj-accent-on); padding: 0.25rem 0.625rem; font-size: 0.75rem;
      white-space: nowrap; pointer-events: none; transition: var(--kj-transition);
    }
    [kjTooltipContent][hidden] { display: none; }
    [data-side="top"]    { bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
    [data-side="bottom"] { top: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
    [data-side="left"]   { right: calc(100% + 8px); top: 50%; transform: translateY(-50%); }
    [data-side="right"]  { left: calc(100% + 8px); top: 50%; transform: translateY(-50%); }
    .empty { width: 80px; }
  `],
  template: `
    <div class="grid">
      <div class="empty"></div>
      <div class="tip-wrap">
        <button kjButton [variant]="'default'" [kjTooltipTrigger]="tipTop">Top</button>
        <span #tipTop kjTooltipContent [kjTooltipSide]="'top'">Top tooltip</span>
      </div>
      <div class="empty"></div>

      <div class="tip-wrap">
        <button kjButton [variant]="'default'" [kjTooltipTrigger]="tipLeft">Left</button>
        <span #tipLeft kjTooltipContent [kjTooltipSide]="'left'">Left tooltip</span>
      </div>
      <div class="empty"></div>
      <div class="tip-wrap">
        <button kjButton [variant]="'default'" [kjTooltipTrigger]="tipRight">Right</button>
        <span #tipRight kjTooltipContent [kjTooltipSide]="'right'">Right tooltip</span>
      </div>

      <div class="empty"></div>
      <div class="tip-wrap">
        <button kjButton [variant]="'default'" [kjTooltipTrigger]="tipBottom">Bottom</button>
        <span #tipBottom kjTooltipContent [kjTooltipSide]="'bottom'">Bottom tooltip</span>
      </div>
      <div class="empty"></div>
    </div>
  `,
})
export class TooltipPlacementsExample {}
