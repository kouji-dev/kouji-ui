import { Component } from '@angular/core';
import { KjLead, KjMuted, KjCode, KjBlockquote, KjTruncate } from '@kouji-ui/core';

/**
 * A walkthrough of the most common typography usages — a `.kj-prose` container,
 * a `kjLead` opening paragraph, inline `kjCode`, a `kjMuted` aside, a
 * `kjBlockquote` pulled quote, and a `[kjTruncate]="2"` clamped block.
 */
@Component({
  selector: 'kj-typography-usage-example',
  standalone: true,
  imports: [KjLead, KjMuted, KjCode, KjBlockquote, KjTruncate],
  styles: [`:host { display: block; }`],
  template: `
    <article class="kj-prose">
      <h1>Roadmap planning, in plain prose</h1>
      <p kjLead>
        The kouji typography system styles authored content without
        per-element wiring — drop the prose class and write.
      </p>
      <p>
        Use <code kjCode>kjLead</code> for the opening paragraph,
        <code kjCode>kjMuted</code> for secondary copy, and
        <code kjCode>kjTruncate</code> when a block must clamp.
      </p>
      <blockquote kjBlockquote>
        Good prose styling stays out of the way until you need it.
      </blockquote>
      <p [kjTruncate]="2">
        The full sentence is preserved in the accessibility tree even when
        the visual clamp hides the overflow — screen readers still get the
        complete content, only the visible glyphs are clipped at the line
        count you specify.
      </p>
      <p><span kjMuted>Last updated 3 minutes ago.</span></p>
    </article>
  `,
})
export class KjTypographyUsageExample {}
