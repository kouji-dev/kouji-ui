import { Component } from '@angular/core';
import {
  KjPopoverComponent,
  KjPopoverTriggerComponent,
  KjPopoverContentComponent,
  KjPopoverTitleComponent,
  KjPopoverArrowComponent,
} from './popover';
import { KjButtonComponent } from '../button/button';

/**
 * One popover per side — top, right, bottom, left. The `kjPopoverSide` input
 * on `<kj-popover>` forwards to the underlying state container so the
 * `data-side` attribute on the floating panel reflects the requested side
 * (collision avoidance may flip it at the viewport edge).
 */
@Component({
  selector: 'kj-popover-sides-example',
  standalone: true,
  imports: [
    KjPopoverComponent,
    KjPopoverTriggerComponent,
    KjPopoverContentComponent,
    KjPopoverTitleComponent,
    KjPopoverArrowComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host {
      display: flex;
      gap: var(--kj-space-md);
      flex-wrap: wrap;
      padding: var(--kj-space-2xl);
      background: var(--kj-color-base-200);
      min-height: 16rem;
    }
  `],
  template: `
    <kj-popover [kjPopoverSide]="'top'">
      <kj-popover-trigger>
        <kj-button>Top</kj-button>
      </kj-popover-trigger>
      <kj-popover-content kjAriaLabel="Top popover">
        <kj-popover-title>Top</kj-popover-title>
        <p>Above the trigger.</p>
        <kj-popover-arrow></kj-popover-arrow>
      </kj-popover-content>
    </kj-popover>

    <kj-popover [kjPopoverSide]="'right'">
      <kj-popover-trigger>
        <kj-button>Right</kj-button>
      </kj-popover-trigger>
      <kj-popover-content kjAriaLabel="Right popover">
        <kj-popover-title>Right</kj-popover-title>
        <p>Right of the trigger.</p>
        <kj-popover-arrow></kj-popover-arrow>
      </kj-popover-content>
    </kj-popover>

    <kj-popover [kjPopoverSide]="'bottom'">
      <kj-popover-trigger>
        <kj-button>Bottom</kj-button>
      </kj-popover-trigger>
      <kj-popover-content kjAriaLabel="Bottom popover">
        <kj-popover-title>Bottom</kj-popover-title>
        <p>Below the trigger.</p>
        <kj-popover-arrow></kj-popover-arrow>
      </kj-popover-content>
    </kj-popover>

    <kj-popover [kjPopoverSide]="'left'">
      <kj-popover-trigger>
        <kj-button>Left</kj-button>
      </kj-popover-trigger>
      <kj-popover-content kjAriaLabel="Left popover">
        <kj-popover-title>Left</kj-popover-title>
        <p>Left of the trigger.</p>
        <kj-popover-arrow></kj-popover-arrow>
      </kj-popover-content>
    </kj-popover>
  `,
})
export class KjPopoverSidesExample {}
