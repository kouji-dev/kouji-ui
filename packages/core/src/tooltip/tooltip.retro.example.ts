import { Component } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from './tooltip';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-tooltip-retro',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 3rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 180px; color: var(--kj-text); }
    .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; justify-content: center; }
    .tip-wrap { position: relative; display: inline-block; }
    button[kjButton] {
      padding: 0.35rem 0.875rem; font-family: var(--kj-font); font-size: 0.75rem;
      font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      background: transparent; color: var(--kj-text); border: var(--kj-btn-outline-border);
      cursor: pointer; box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button[kjButton]:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
    [kjTooltipContent] {
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      background: var(--kj-text); color: var(--kj-bg);
      padding: 0.2rem 0.5rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      white-space: nowrap; pointer-events: none; border: 1px solid var(--kj-border);
      box-shadow: var(--kj-shadow-sm);
    }
    [kjTooltipContent][hidden] { display: none; }
    [data-side="bottom"] { top: calc(100% + 8px); bottom: auto; }
    [data-side="right"] { left: calc(100% + 8px); bottom: auto; top: 50%; transform: translateY(-50%); }
  `],
  host: { class: 'kj-theme-retro' },
  template: `
    <div class="row">
      <div class="tip-wrap">
        <button kjButton [kjTooltipTrigger]="tip1">Hover me</button>
        <span #tip1 kjTooltipContent>Copy to clipboard</span>
      </div>
      <div class="tip-wrap">
        <button kjButton [kjTooltipTrigger]="tip2">Bottom</button>
        <span #tip2 kjTooltipContent [kjTooltipSide]="'bottom'">Opens below</span>
      </div>
    </div>
  `,
})
export class TooltipRetroExample {}
