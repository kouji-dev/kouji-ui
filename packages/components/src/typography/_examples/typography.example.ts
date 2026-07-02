import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Default usage example for the kouji typography surface.
 *
 * Shows the `kj-prose` CSS container in action: drop the class on a wrapping
 * `<article>` and every descendant flow element (headings, paragraphs, lists,
 * blockquote, inline code) is restyled by the kouji type system.
 */
@Component({
  selector: 'kj-typography-example',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <article class="kj-prose">
      <h1>Roadmap planning, in plain prose</h1>
      <h2>Why a prose container</h2>
      <p>
        The <code>kj-prose</code> class restyles every descendant flow element according to the
        kouji type system, so authored content reads cleanly without per-element wiring.
      </p>
      <h3>What it covers</h3>
      <ul>
        <li>Headings <code>h1</code> through <code>h6</code></li>
        <li>Paragraphs, lists, definition lists</li>
        <li>Blockquotes, inline code, anchors</li>
      </ul>
      <blockquote>
        Good prose styling stays out of the way until you need it — and then it does the right thing
        without per-paragraph configuration.
      </blockquote>
    </article>
  `,
})
export class KjTypographyExample {}
