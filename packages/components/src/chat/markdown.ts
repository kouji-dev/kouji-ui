import { Marked, type Token, type TokensList } from 'marked';

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

let engine: Marked | null = null;

/**
 * The chat's own `Marked` instance, created on first use.
 *
 * GFM, with `breaks` on: a chat turn treats a single newline as a line break,
 * which is what people type. `pedantic` off so the parser stays forgiving of
 * the half-formed markdown a model emits mid-stream.
 *
 * `marked` dropped its sanitizer in v5 and passes source HTML through
 * verbatim, so both HTML token kinds are overridden to escape instead. A chat
 * turn is model or user output: it may *describe* markup, never inject it.
 *
 * A private instance, not `marked.use()`: the default export is a
 * process-wide singleton, so configuring it here would silently change the
 * output of a consumer's own `marked.parse()` — a side effect a
 * `sideEffects: false` package must not carry, and one that would make this
 * escaping (the sanitizer) depend on module-retention luck. Nothing runs at
 * module scope.
 */
function markdownEngine(): Marked {
  return (engine ??= new Marked({
    gfm: true,
    breaks: true,
    pedantic: false,
    renderer: {
      html(token) {
        return escapeHtml(typeof token === 'string' ? token : token.raw);
      },
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
  }));
}

/**
 * Parse markdown into blocks: fenced code becomes a structural `code` block,
 * everything else is rendered to HTML as a `prose` block.
 *
 * Code is split out at the TOKEN level rather than by regex so an indented
 * block, a `~~~` fence, or a fence inside a list is still recognised — and so
 * a stray fence in a partial stream cannot swallow the rest of the message.
 *
 * Renders with a private `Marked` instance; the shared `marked` singleton is
 * never configured or read.
 */
export function renderMarkdown(src: string): KjMdBlock[] {
  const md = markdownEngine();
  const tokens = md.lexer(src);
  return blocksFromTokens(md, tokens, tokens.links);
}

/** Link-definition map carried between a lexer run and the parser. */
type MarkdownLinks = TokensList['links'];

/** Turn a lexed token list into blocks, parsing prose runs with `links` in scope. */
function blocksFromTokens(md: Marked, tokens: Token[], links: MarkdownLinks): KjMdBlock[] {
  const blocks: KjMdBlock[] = [];
  let prose: Token[] = [];

  const flushProse = () => {
    if (prose.length === 0) return;
    // `parser` reads `links` off the token list for reference-style links; a
    // plain slice would drop them and render `[a][b]` verbatim.
    const list = prose as TokensList;
    list.links = links;
    blocks.push({ kind: 'prose', html: md.parser(list) });
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

/** A source prefix whose blocks are final. */
interface KjMdCommitted {
  src: string;
  blocks: KjMdBlock[];
}

/**
 * Number of leading tokens that a later append cannot change.
 *
 * Appending text can only extend the block being written, i.e. the **last**
 * token that is not a blank-line `space`. Everything before it was already
 * closed by that block's existence: a list followed by a paragraph cannot grow
 * back into the paragraph, an unclosed ``` fence is itself the last token, and
 * a setext underline can only ever attach to the paragraph it follows. So the
 * safe commit point is the last non-`space` token, exclusive — and `marked`'s
 * per-token `raw` strings concatenate back to the source exactly, which is what
 * turns that token index into a source offset.
 */
function closedTokenCount(tokens: Token[]): number {
  let last = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i]!.type !== 'space') {
      last = i;
      break;
    }
  }
  return last <= 0 ? 0 : last;
}

/**
 * A stateful {@link renderMarkdown} that reuses the blocks it has already
 * parsed when the source only grew at the end — the streaming case.
 *
 * `marked` has no incremental mode: re-rendering an accumulating reply per
 * token re-lexes and re-parses the whole message each time, so the total work
 * over a reply of length *n* is O(n²) and the last tokens of a long answer
 * arrive visibly slower than the first. This keeps a **commit point** just
 * before the block still being written: everything before it is parsed once and
 * its block objects are handed back by reference (so a downstream
 * `[innerHTML]` binding does not even re-sanitise them), and only the trailing
 * open block is re-lexed per token.
 *
 * Because prose is committed as it closes, a long reply renders as several
 * adjacent prose blocks where one full parse would have produced a single one.
 * The blocks are the same HTML in the same order — only the grouping differs.
 *
 * The returned function is a pure view of its argument: a rewrite, a shrink, or
 * an unrelated string falls back to a full parse, and so does any message
 * containing a link reference definition (`[id]: url`), which a later line can
 * resolve retroactively and which therefore has no safe commit point at all.
 * Create one per message.
 *
 * @example
 * ```ts
 * private readonly render = createMarkdownRenderer();
 * readonly blocks = computed(() => this.render(this.message().content));
 * ```
 */
export function createMarkdownRenderer(): (src: string) => KjMdBlock[] {
  const empty = (): KjMdCommitted => ({ src: '', blocks: [] });
  let committed = empty();
  let lastSrc: string | null = null;
  let lastBlocks: KjMdBlock[] = [];
  /** Set once a link reference definition is seen: no commit point is safe after that. */
  let referencesSeen = false;

  const remember = (src: string, blocks: KjMdBlock[]): KjMdBlock[] => {
    lastSrc = src;
    lastBlocks = blocks;
    return blocks;
  };

  return (src: string): KjMdBlock[] => {
    if (src === lastSrc) return lastBlocks;
    if (referencesSeen) return remember(src, renderMarkdown(src));

    // Not an append to what was parsed last time — start over.
    if (!src.startsWith(committed.src)) committed = empty();

    const md = markdownEngine();
    const tokens = md.lexer(src.slice(committed.src.length));
    if (Object.keys(tokens.links).length > 0) {
      referencesSeen = true;
      return remember(src, renderMarkdown(src));
    }

    const closed = closedTokenCount(tokens);
    if (closed > 0) {
      const head = tokens.slice(0, closed);
      committed = {
        src: committed.src + head.map((token) => token.raw).join(''),
        blocks: committed.blocks.concat(blocksFromTokens(md, head, tokens.links)),
      };
    }

    const open = blocksFromTokens(md, tokens.slice(closed), tokens.links);
    return remember(src, committed.blocks.concat(open));
  };
}
