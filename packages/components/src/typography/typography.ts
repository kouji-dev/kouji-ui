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
 *   The default playground — drop `.kj-prose` on an `<article>` to restyle
 *   every descendant flow element with the kouji type system.
 *   @doc-file typography.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common typography usages — prose container,
 *   `kjLead` paragraph, `kjMuted` aside, inline `kjCode`, and a `kjTruncate`
 *   block clamped to two lines.
 *   @doc-file typography.usage.example.ts
 * @doc-example Lead paragraph
 *   `kjLead` reflects `data-tone="lead"` on a paragraph — softer tone, larger size.
 *   @doc-file typography.lead.example.ts
 * @doc-example Muted text
 *   `kjMuted` reflects `data-tone="muted"` — dims the foreground for secondary copy.
 *   @doc-file typography.muted.example.ts
 * @doc-example Inline code
 *   `kjCode` styles inline `<code>` runs with the mono token + a subtle surface.
 *   @doc-file typography.code.example.ts
 * @doc-example Blockquote
 *   `kjBlockquote` applies the pull-quote treatment to a `<blockquote>`.
 *   @doc-file typography.blockquote.example.ts
 * @doc-example Truncate (multi-line)
 *   `[kjTruncate]="n"` clamps text to `n` lines via the line-clamp tokens.
 *   @doc-file typography.truncate.example.ts
 *
 * @doc-keyboard
 *   — — Typography is non-interactive. Inline `<a>` anchors keep native
 *     Tab / Enter behaviour from the browser.
 *
 * @doc-aria
 *   data-tone     — Reflected by `kjLead` / `kjMuted` so the same styling
 *                   applies whether the consumer used the directive or
 *                   hand-typed the attribute on a span
 *   data-truncate — Reflected by `kjTruncate` with the line count, e.g. "2"
 *
 * @doc-touch
 *   — — Non-interactive surface. Inline links inherit the page's link tokens
 *     which meet the 24×24 / 44×44 floors per theme.
 *
 * @doc-a11y
 *   The directives carry no role or focus — they're purely visual. Headings
 *   inside `.kj-prose` keep their native `<h1>`–`<h6>` semantics so AT users
 *   can navigate by heading level. `kjTruncate` does not hide content from
 *   AT — the full text remains in the accessibility tree, only the visual
 *   clamp applies.
 *
 * @doc-related card,field,divider
 *
 * @doc-css-var
 *   --kj-prose-fg           — Default foreground (body copy) inside `.kj-prose`.
 *   --kj-prose-fg-muted     — Foreground for `kjMuted` runs and secondary copy.
 *   --kj-prose-link         — Link color inside prose blocks.
 *   --kj-prose-code-bg      — Background for inline `kjCode` runs.
 *   --kj-prose-code-fg      — Foreground for inline `kjCode` runs.
 *   --kj-prose-quote-border — Left rule color on `kjBlockquote`.
 *   --kj-prose-h1-size      — Font size for `<h1>` inside `.kj-prose`.
 *   --kj-prose-h2-size      — Font size for `<h2>` inside `.kj-prose`.
 *   --kj-prose-h3-size      — Font size for `<h3>` inside `.kj-prose`.
 *   --kj-prose-line-height  — Line height for body copy inside `.kj-prose`.
 *   --kj-prose-measure      — Maximum line length (CSS `max-width`) for prose blocks.
 *
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
