import { marked, type Token, type TokensList } from 'marked';

/**
 * A parsed markdown block. Prose blocks carry an HTML string; code blocks stay
 * structural so the view can render a `<pre><code>` with a copy button.
 *
 * Raw HTML in the source is escaped, never emitted (see the renderer override
 * below), so the prose HTML only ever contains tags this module produced. The
 * view sanitises it again anyway — a model's output is not a trust boundary
 * worth betting one layer on.
 */
export type KjMdBlock =
  | { readonly kind: 'prose'; readonly html: string }
  | { readonly kind: 'code'; readonly lang: string; readonly code: string };

/** HTML-escape a raw string. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * GFM, with `breaks` on: a chat turn treats a single newline as a line break,
 * which is what people type. `pedantic` off so the parser stays forgiving of
 * the half-formed markdown a model emits mid-stream.
 *
 * `marked` dropped its sanitizer in v5 and passes source HTML through
 * verbatim, so both HTML token kinds are overridden to escape instead. A chat
 * turn is model or user output: it may *describe* markup, never inject it.
 */
marked.use({
  gfm: true,
  breaks: true,
  pedantic: false,
  renderer: {
    html(token) {
      return escapeHtml(typeof token === 'string' ? token : token.raw);
    },
  },
  tokenizer: {},
});

marked.use({
  renderer: {
    // Inline HTML (`<img …>` mid-sentence) travels a different path than a
    // block-level HTML token, and needs the same treatment.
    text(token) {
      const anyToken = token as { tokens?: unknown[]; text?: string; raw?: string };
      if (Array.isArray(anyToken.tokens) && anyToken.tokens.length > 0) {
        return this.parser.parseInline(anyToken.tokens as never);
      }
      return escapeHtml(String(anyToken.text ?? anyToken.raw ?? ''));
    },
  },
});

/**
 * Parse markdown into blocks: fenced code becomes a structural `code` block,
 * everything else is rendered to HTML as a `prose` block.
 *
 * Code is split out at the TOKEN level rather than by regex so an indented
 * block, a `~~~` fence, or a fence inside a list is still recognised — and so
 * a stray fence in a partial stream cannot swallow the rest of the message.
 */
export function renderMarkdown(src: string): KjMdBlock[] {
  const tokens = marked.lexer(src);
  const blocks: KjMdBlock[] = [];
  let prose: Token[] = [];

  const flushProse = () => {
    if (prose.length === 0) return;
    // `marked.parser` reads `links` off the token list for reference-style
    // links; a plain slice would drop them and render `[a][b]` verbatim.
    const list = prose as TokensList;
    list.links = tokens.links;
    blocks.push({ kind: 'prose', html: marked.parser(list) });
    prose = [];
  };

  for (const token of tokens) {
    if (token.type === 'code') {
      flushProse();
      blocks.push({
        kind: 'code',
        lang: typeof token.lang === 'string' ? token.lang.split(/\s+/)[0] : '',
        code: String(token.text ?? ''),
      });
      continue;
    }
    prose.push(token);
  }
  flushProse();

  return blocks;
}
