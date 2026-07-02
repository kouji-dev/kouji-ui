import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjBlockquote } from '@kouji-ui/core';

/**
 * Blockquote example using the `kjBlockquote` directive.
 *
 * Reflects `data-tone="blockquote"` on a `<blockquote>` host. Useful when the
 * blockquote sits outside a `kj-prose` container — for example a testimonial
 * pulled into a marketing-page hero — and still needs the kouji left-rule,
 * italic, and indent treatment.
 */
@Component({
  selector: 'kj-typography-blockquote-example',
  standalone: true,
  imports: [KjBlockquote],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <figure>
      <blockquote kjBlockquote>
        Atlas turned our quarterly planning from a five-day rite of passage into a single afternoon.
        The whole team finally agrees on what we are — and are not — shipping next quarter.
      </blockquote>
      <figcaption>— Priya Raman, Director of Engineering, Northwind</figcaption>
    </figure>
  `,
})
export class KjTypographyBlockquoteExample {}
