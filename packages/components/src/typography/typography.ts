import { Directive } from '@angular/core';

/**
 * Documentation marker for the kouji typography surface.
 *
 * Typography ships **no wrapper components**. The user-facing surface is:
 *
 * - The `kj-prose` CSS class (applied to a wrapping container) which restyles
 *   every descendant flow element according to the kouji type system.
 * - Five attribute directives — `kjLead`, `kjMuted`, `kjCode`, `kjBlockquote`,
 *   `kjTruncate` — that reflect `data-tone` / `data-truncate` host attributes
 *   so the same styling applies whether the consumer used the directive,
 *   hand-typed `data-tone="muted"` on a span, or wrapped a subtree in
 *   `.kj-prose`.
 *
 * This class exists **only** to host the live-preview examples and category
 * metadata for the docs extractor. It exposes no template, selector behaviour,
 * inputs, or outputs — and is never meant to be applied in consumer code.
 * Consumers import the directives directly via the package barrel.
 *
 * @example
 * ```html
 * <article class="kj-prose">
 *   <h1>Heading</h1>
 *   <p kjLead>Lead-in paragraph.</p>
 *   <p>Body copy with <code kjCode>npm install</code> inline.</p>
 *   <blockquote kjBlockquote>Pulled-out quotation.</blockquote>
 *   <p [kjTruncate]="2">A long line that should clamp to two lines.</p>
 *   <p><span kjMuted>Last updated 3 minutes ago.</span></p>
 * </article>
 * ```
 * @doc-example Prose container
 *   @doc-file typography.example.ts
 * @doc-example Lead paragraph
 *   @doc-file typography.lead.example.ts
 * @doc-example Muted text
 *   @doc-file typography.muted.example.ts
 * @doc-example Inline code
 *   @doc-file typography.code.example.ts
 * @doc-example Blockquote
 *   @doc-file typography.blockquote.example.ts
 * @doc-example Truncate (multi-line)
 *   @doc-file typography.truncate.example.ts
 * @doc-category Library/Data display
 * @doc
 * @doc-name typography
 * @doc-description Themed typography system for prose containers and individual lead, muted, code, quote, and truncate text.
 * @doc-is-main
 */
@Directive({
  // Selector is intentionally namespaced so it never matches consumer
  // markup. The class is a docs-only marker; no behaviour is wired.
  selector: '[kjTypographyDocsMarker]',
  standalone: true,
})
export class KjTypographyDocs {}
