import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjTruncate } from '@kouji-ui/core';

/**
 * Multi-line truncate example using the `kjTruncate` directive.
 *
 * Clamps the host's text content to a fixed number of lines via
 * `data-truncate="N"`. After first render the directive injects a
 * normalised `[title]` attribute (when the consumer has not supplied
 * `title` or `aria-label`) so sighted-but-zoomed users can still read the
 * full text on hover.
 */
@Component({
  selector: 'kj-typography-truncate-example',
  standalone: true,
  imports: [KjTruncate],
  styles: [
    `
      :host {
        display: block;
      }
      .card {
        max-width: 28rem;
        padding: var(--kj-space-md);
        border-radius: var(--kj-radius-md);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <article class="card">
      <h3>Atlas — quarterly planning</h3>
      <p [kjTruncate]="2">
        Atlas helps engineering teams plan quarterly roadmaps with shared context, calibrated
        estimates, and a clean handoff to delivery — so every team starts the quarter aligned on
        what is shipping, what is deferred, and why.
      </p>
    </article>
  `,
})
export class KjTypographyTruncateExample {}
