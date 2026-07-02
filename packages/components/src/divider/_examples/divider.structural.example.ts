import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjDividerComponent } from '../divider';

/**
 * Structural (semantic) divider between two page sections. With
 * `kjStructural="true"` the rule keeps the implicit `role="separator"`
 * from the underlying `<hr>` and drops the decorative `aria-hidden`,
 * so assistive technologies announce the break between the two
 * regions that aren't already demarcated by surrounding landmark
 * or heading structure.
 */
@Component({
  selector: 'kj-divider-structural-example',
  standalone: true,
  imports: [KjDividerComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-md);
      }
      section {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-xs);
      }
      ul {
        margin: 0;
        padding-inline-start: var(--kj-space-lg);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section>
      <p>Account preferences — tune how your profile is presented.</p>
      <ul>
        <li>Display name</li>
        <li>Avatar</li>
      </ul>
    </section>

    <kj-divider [kjStructural]="true" />

    <section>
      <p>Notifications — choose which events reach your inbox.</p>
      <ul>
        <li>Mentions</li>
        <li>Weekly digest</li>
      </ul>
    </section>
  `,
})
export class KjDividerStructuralExample {}
