import { Component } from '@angular/core';
import { KjProgressBarComponent } from './progress-bar';

/**
 * Default usage example for KjProgressBarComponent.
 * A determinate bar at 50%, with an accessible label.
 */
@Component({
  selector: 'kj-progress-bar-example',
  standalone: true,
  imports: [KjProgressBarComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
  `],
  template: `
    <kj-progress-bar [kjValue]="50" kjAriaLabel="Upload progress" />
  `,
})
export class KjProgressBarExample {}
