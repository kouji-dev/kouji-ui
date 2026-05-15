import { Component } from '@angular/core';
import { KjDividerComponent } from './divider';

/**
 * A walkthrough of the most common divider usages — a structural horizontal
 * separator, a labelled rule, and a vertical divider inside a flex row.
 */
@Component({
  selector: 'kj-divider-usage-example',
  standalone: true,
  imports: [KjDividerComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); }
    .row { display: flex; align-items: center; gap: var(--kj-space-md); height: 2rem; }
  `],
  template: `
    <section>
      <p>First section content.</p>
      <kj-divider [kjStructural]="true" />
      <p>Second section content.</p>
    </section>

    <section>
      <kj-divider [kjStructural]="true">OR</kj-divider>
    </section>

    <div class="row">
      <span>Item A</span>
      <kj-divider kjOrientation="vertical" />
      <span>Item B</span>
      <kj-divider kjOrientation="vertical" />
      <span>Item C</span>
    </div>
  `,
})
export class KjDividerUsageExample {}
