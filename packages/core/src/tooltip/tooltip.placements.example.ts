import { Component } from '@angular/core';
import { KjTooltip } from './tooltip';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-tooltip-placements',
  standalone: true,
  imports: [KjTooltip, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 5rem 4rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 220px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: auto auto auto; gap: 0.75rem; place-items: center; }
    button[kjButton] { padding: 0.5rem 1.25rem; font-family: var(--kj-font); font-size: 0.875rem; border: var(--kj-btn-border); cursor: pointer; transition: var(--kj-transition); }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); }
    .empty { width: 80px; }
    :global([data-kj-tooltip]) {
      background: var(--kj-accent); color: var(--kj-accent-on);
      padding: 0.25rem 0.625rem; font-size: 0.75rem;
      white-space: nowrap; pointer-events: none; transition: var(--kj-transition);
    }
    :global([data-kj-tooltip][hidden]) { display: none; }
  `],
  template: `
    <div class="grid">
      <div class="empty"></div>
      <button kjButton [kjVariant]="'default'" [kjTooltip]="'Top tooltip'" [kjTooltipSide]="'top'">Top</button>
      <div class="empty"></div>

      <button kjButton [kjVariant]="'default'" [kjTooltip]="'Left tooltip'" [kjTooltipSide]="'left'">Left</button>
      <div class="empty"></div>
      <button kjButton [kjVariant]="'default'" [kjTooltip]="'Right tooltip'" [kjTooltipSide]="'right'">Right</button>

      <div class="empty"></div>
      <button kjButton [kjVariant]="'default'" [kjTooltip]="'Bottom tooltip'" [kjTooltipSide]="'bottom'">Bottom</button>
      <div class="empty"></div>
    </div>
  `,
})
export class TooltipPlacementsExample {}
