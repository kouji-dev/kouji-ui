import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from '../tooltip';
import { KjButton } from '../../button/button';

@Component({
  selector: 'kj-example-tooltip-retro',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjButton],
  styleUrls: ['../../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5rem 3rem;
        background: var(--kj-bg);
        font-family: var(--kj-font);
        min-height: 180px;
        color: var(--kj-text);
      }
      .row {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
      }
      button[kjButton] {
        padding: 0.35rem 0.875rem;
        font-family: var(--kj-font);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        border: var(--kj-btn-border);
        border-radius: var(--kj-radius-md);
        cursor: pointer;
        box-shadow: var(--kj-shadow-sm);
        transition: var(--kj-transition);
      }
      button[kjButton]:not([data-variant='link']):not([data-variant='ghost']):hover {
        transform: translate(-1px, -1px);
        box-shadow: var(--kj-shadow-md);
      }
      button[kjButton][data-variant='default'] {
        background: var(--kj-text);
        color: var(--kj-bg);
      }
      button[kjButton][data-variant='link'] {
        background: transparent;
        color: var(--kj-text);
        border: none;
        box-shadow: none;
        border-radius: 0;
        padding: 0.35rem 0.875rem;
        text-decoration: none;
      }
      button[kjButton][data-variant='link']:hover {
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 4px;
      }
      button[kjButton][data-variant='ghost'] {
        background: transparent;
        color: var(--kj-text);
        border: 2px solid transparent;
        box-shadow: none;
        opacity: 0.7;
      }
      button[kjButton][data-variant='ghost']:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.06);
      }
      :global(kj-tooltip-content) {
        background: var(--kj-text);
        color: var(--kj-bg);
        padding: 0.2rem 0.5rem;
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
        pointer-events: none;
        border: 1px solid var(--kj-border);
        box-shadow: var(--kj-shadow-sm);
      }
    `,
  ],
  host: { class: 'kj-theme-retro' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'" kjTooltipTrigger #t1="kjTooltipTrigger">
        Default
      </button>
      <kj-tooltip-content [kjFor]="t1">Copy to clipboard</kj-tooltip-content>

      <button kjButton [kjVariant]="'link'" kjTooltipTrigger #t2="kjTooltipTrigger">Link</button>
      <kj-tooltip-content [kjFor]="t2" [kjSide]="'bottom'">Opens below</kj-tooltip-content>

      <button kjButton [kjVariant]="'ghost'" kjTooltipTrigger #t3="kjTooltipTrigger">Ghost</button>
      <kj-tooltip-content [kjFor]="t3" [kjSide]="'right'">Opens right</kj-tooltip-content>
    </div>
  `,
})
export class TooltipRetroExample {}
