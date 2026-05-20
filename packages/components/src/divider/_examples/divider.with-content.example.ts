import { Component } from '@angular/core';
import { KjDividerComponent } from '../divider';

/**
 * Divider with a label nestled into the rule. The canonical "OR"
 * sign-in divider plus a labelled section break — both are
 * structural because the label *is* the demarcation between the
 * two regions it separates.
 */
@Component({
  selector: 'kj-divider-with-content-example',
  standalone: true,
  imports: [KjDividerComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); }
  `],
  template: `
    <div>
      <p>Sign in with your password.</p>
      <kj-divider [kjStructural]="true">OR</kj-divider>
      <p>Continue with a single sign-on provider.</p>
    </div>

    <div>
      <p>Recent activity from earlier this week.</p>
      <kj-divider [kjStructural]="true">Today</kj-divider>
      <p>Activity from the last twenty-four hours.</p>
    </div>
  `,
})
export class KjDividerWithContentExample {}
