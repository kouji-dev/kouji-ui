import { Component } from '@angular/core';
import { KjLead } from '@kouji-ui/core';

/**
 * Lead paragraph example using the `kjLead` directive.
 *
 * Marks the opening paragraph of a section with a slightly larger size and a
 * softer tone via `data-tone="lead"`. The directive keeps lead semantics
 * paragraph-bound and warns in dev mode when applied to a non-`<p>` host.
 */
@Component({
  selector: 'kj-typography-lead-example',
  standalone: true,
  imports: [KjLead],
  styles: [`:host { display: block; }`],
  template: `
    <article>
      <h1>Atlas — quarterly roadmap planning</h1>
      <p kjLead>
        Atlas helps engineering teams plan quarterly roadmaps with shared
        context, calibrated estimates, and a clean handoff to delivery.
      </p>
      <p>
        The lead paragraph anchors the section's tone; the body paragraphs
        below carry the supporting detail at the regular reading size.
      </p>
    </article>
  `,
})
export class KjTypographyLeadExample {}
