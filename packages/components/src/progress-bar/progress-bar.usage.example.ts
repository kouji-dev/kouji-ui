import { Component, signal } from '@angular/core';
import { KjProgressBarComponent } from './progress-bar';

/**
 * A walkthrough of the most common progress-bar usages — a determinate
 * upload bar with `aria-valuetext`, an indeterminate spinner replacement,
 * and a success-variant complete state. Use this as the copy-paste starting
 * point for feedback rows.
 */
@Component({
  selector: 'kj-progress-bar-usage-example',
  standalone: true,
  imports: [KjProgressBarComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); }
    .label { font-size: 0.75rem; color: var(--kj-fg-default); opacity: 0.7; text-transform: uppercase; letter-spacing: 0.04em; }
  `],
  template: `
    <div>
      <span class="label">Uploading (determinate)</span>
      <kj-progress-bar
        [kjValue]="progress()"
        kjAriaLabel="Upload progress"
        [kjAriaValuetext]="progress() + ' percent uploaded'" />
    </div>
    <div>
      <span class="label">Working (indeterminate)</span>
      <kj-progress-bar [kjValue]="null!" kjAriaLabel="Working" />
    </div>
    <div>
      <span class="label">Complete (success)</span>
      <kj-progress-bar [kjValue]="100" kjVariant="success" kjSize="lg" kjAriaLabel="Done" />
    </div>
  `,
})
export class KjProgressBarUsageExample {
  readonly progress = signal<number>(62);
}
