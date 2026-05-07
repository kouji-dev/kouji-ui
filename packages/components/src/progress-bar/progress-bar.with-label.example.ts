import { Component } from '@angular/core';
import { KjProgressBarComponent } from './progress-bar';

/**
 * Human-readable phrasing via `kjAriaValuetext` — the bar visually shows
 * 60%, but assistive technology reads *"Step 3 of 5"* (APG-recommended for
 * cases where the raw percentage is less meaningful than a step count or
 * remaining-time phrasing).
 */
@Component({
  selector: 'kj-progress-bar-with-label-example',
  standalone: true,
  imports: [KjProgressBarComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-progress-bar
      [kjValue]="60"
      kjAriaValuetext="Step 3 of 5"
      kjAriaLabel="Onboarding progress"
    />
  `,
})
export class KjProgressBarWithLabelExample {}
