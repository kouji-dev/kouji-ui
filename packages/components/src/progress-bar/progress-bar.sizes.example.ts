import { Component } from '@angular/core';
import { KjProgressBarComponent } from './progress-bar';

/**
 * Size gallery — `xs`, `sm`, `md`, `lg`. Size only changes the bar height;
 * the value math and ARIA contract are identical across sizes.
 */
@Component({
  selector: 'kj-progress-bar-sizes-example',
  standalone: true,
  imports: [KjProgressBarComponent],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--kj-space-md);
      padding: var(--kj-space-xl);
      background: var(--kj-bg-surface);
    }
  `],
  template: `
    <kj-progress-bar [kjValue]="50" kjSize="xs" kjAriaLabel="Extra small" />
    <kj-progress-bar [kjValue]="50" kjSize="sm" kjAriaLabel="Small" />
    <kj-progress-bar [kjValue]="50" kjSize="md" kjAriaLabel="Medium" />
    <kj-progress-bar [kjValue]="50" kjSize="lg" kjAriaLabel="Large" />
  `,
})
export class KjProgressBarSizesExample {}
