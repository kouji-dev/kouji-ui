import { Component } from '@angular/core';
import { KjTooltip, KjTooltipTrigger, KjTooltipContent } from './tooltip';

@Component({
  selector: 'kj-example-tooltip-retro',
  standalone: true,
  imports: [KjTooltip, KjTooltipTrigger, KjTooltipContent],
  styleUrls: ['../styles/docs-themes.css'],
  host: { class: 'kj-theme-retro' },
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 3rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 180px; color: var(--kj-text); }
    .row { display: flex; gap: 2rem; flex-wrap: wrap; align-items: center; justify-content: center; }
    .tip-wrap { position: relative; display: inline-block; }
    button {
      padding: 0.4rem 1rem; font-family: var(--kj-font); font-size: 0.8rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; background: var(--kj-surface); color: var(--kj-text);
      border: var(--kj-btn-border); border-radius: 0; cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
    [kjTooltipContent] {
      position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%);
      background: var(--kj-text); color: var(--kj-bg); padding: 0.25rem 0.625rem; font-family: var(--kj-font);
      font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      white-space: nowrap; pointer-events: none; border: 1px solid var(--kj-border);
    }
    [kjTooltipContent][hidden] { display: none; }
    [kjTooltipContent][data-side="bottom"] { top: calc(100% + 10px); bottom: auto; }
    [kjTooltipContent][data-side="right"]  { left: calc(100% + 10px); bottom: auto; top: 50%; transform: translateY(-50%); }
  `],
  template: `
    <div class="row">
      <div class="tip-wrap" kjTooltip>
        <button kjTooltipTrigger>Copy</button>
        <span kjTooltipContent role="tooltip">Copy to clipboard</span>
      </div>
      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'bottom'">
        <button kjTooltipTrigger>Info</button>
        <span kjTooltipContent role="tooltip">More information</span>
      </div>
      <div class="tip-wrap" kjTooltip [kjTooltipSide]="'right'">
        <button kjTooltipTrigger>Help</button>
        <span kjTooltipContent role="tooltip">View docs</span>
      </div>
    </div>
  `,
})
export class TooltipRetroExample {}
