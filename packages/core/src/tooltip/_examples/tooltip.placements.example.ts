import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from '../tooltip';
import { KjButton } from '../../button/button';

@Component({
  selector: 'kj-example-tooltip-placements',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButton],
  styleUrls: ['../../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5rem 4rem;
        background: var(--kj-bg);
        font-family: var(--kj-font);
        min-height: 220px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-rows: auto auto auto;
        gap: 0.75rem;
        place-items: center;
      }
      button[kjButton] {
        padding: 0.5rem 1.25rem;
        font-family: var(--kj-font);
        font-size: 0.875rem;
        border: var(--kj-btn-border);
        cursor: pointer;
        transition: var(--kj-transition);
      }
      [data-variant='default'] {
        background: var(--kj-accent);
        color: var(--kj-accent-on);
      }
      .empty {
        width: 80px;
      }
      :global(kj-tooltip-content) {
        background: var(--kj-accent);
        color: var(--kj-accent-on);
        padding: 0.25rem 0.625rem;
        font-size: 0.75rem;
        white-space: nowrap;
        pointer-events: none;
        transition: var(--kj-transition);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="grid">
      <div class="empty"></div>
      <button kjButton [kjVariant]="'default'" kjTooltipTrigger #tTop="kjTooltipTrigger">
        Top
      </button>
      <kj-tooltip-content [kjFor]="tTop" [kjSide]="'top'">Top tooltip</kj-tooltip-content>
      <div class="empty"></div>

      <button kjButton [kjVariant]="'default'" kjTooltipTrigger #tLeft="kjTooltipTrigger">
        Left
      </button>
      <kj-tooltip-content [kjFor]="tLeft" [kjSide]="'left'">Left tooltip</kj-tooltip-content>
      <div class="empty"></div>
      <button kjButton [kjVariant]="'default'" kjTooltipTrigger #tRight="kjTooltipTrigger">
        Right
      </button>
      <kj-tooltip-content [kjFor]="tRight" [kjSide]="'right'">Right tooltip</kj-tooltip-content>

      <div class="empty"></div>
      <button kjButton [kjVariant]="'default'" kjTooltipTrigger #tBot="kjTooltipTrigger">
        Bottom
      </button>
      <kj-tooltip-content [kjFor]="tBot" [kjSide]="'bottom'">Bottom tooltip</kj-tooltip-content>
      <div class="empty"></div>
    </div>
  `,
})
export class TooltipPlacementsExample {}
