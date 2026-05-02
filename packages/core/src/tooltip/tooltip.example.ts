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
    .tip-wrap { position: relative; display: inline-block; }
    button[kjButton] { padding: 0.5rem 1.25rem; border: 1px solid var(--kj-border); background: transparent; color: var(--kj-text); cursor: pointer; font-family: inherit; font-size: 0.875rem; }
    button[kjButton]:hover { border-color: var(--kj-accent); color: var(--kj-accent); }
    [kjTooltipContent] {
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      background: var(--kj-accent); color: var(--kj-accent-on); padding: 0.25rem 0.625rem; font-size: 0.75rem;
      white-space: nowrap; pointer-events: none; transition: var(--kj-transition);
    }
    [kjTooltipContent][hidden] { display: none; }
    [data-side="bottom"] { top: calc(100% + 8px); bottom: auto; }
    [data-side="left"]  { right: calc(100% + 8px); left: auto; bottom: auto; top: 50%; transform: translateY(-50%); }
    [data-side="right"] { left: calc(100% + 8px); bottom: auto; top: 50%; transform: translateY(-50%); }
  `],
  template: `
    <div class="row">
      <div class="tip-wrap">
        <button kjButton [kjTooltipTrigger]="tip1">Hover me</button>
        <span #tip1="kjTooltipContent" kjTooltipContent>Copy to clipboard</span>
      </div>
      <div class="tip-wrap">
        <button kjButton [kjTooltipTrigger]="tip2">Bottom</button>
        <span #tip2="kjTooltipContent" kjTooltipContent [kjTooltipSide]="'bottom'">Opens below</span>
      </div>
      <div class="tip-wrap">
        <button kjButton [kjTooltipTrigger]="tip3">Right</button>
        <span #tip3="kjTooltipContent" kjTooltipContent [kjTooltipSide]="'right'">Opens right</span>
      </div>
    </div>
  `,
})
export class TooltipBasicExample {}
