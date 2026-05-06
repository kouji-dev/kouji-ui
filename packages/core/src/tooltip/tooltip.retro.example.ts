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
      border: var(--kj-btn-border); border-radius: var(--kj-radius-md); cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button[kjButton]:not([data-variant="link"]):not([data-variant="ghost"]):hover {
      transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md);
    }
    button[kjButton][data-variant="default"] { background: var(--kj-text); color: var(--kj-bg); }
    button[kjButton][data-variant="link"] {
      background: transparent; color: var(--kj-text); border: none; box-shadow: none;
      border-radius: 0; padding: 0.35rem 0.875rem; text-decoration: none;
    }
    button[kjButton][data-variant="link"]:hover {
      text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px;
    }
    button[kjButton][data-variant="ghost"] {
      background: transparent; color: var(--kj-text); border: 2px solid transparent; box-shadow: none; opacity: 0.7;
    }
    button[kjButton][data-variant="ghost"]:hover { opacity: 1; background: rgba(0,0,0,0.06); }
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
    [data-side="left"]  { right: calc(100% + 8px); left: auto; bottom: auto; top: 50%; transform: translateY(-50%); }
  `],
  host: { class: 'kj-theme-retro' },
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
export class TooltipRetroExample {}
