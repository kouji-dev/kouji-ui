/**
 * A parsed markdown block. Prose blocks carry a **pre-sanitised** HTML string
 * (escaped first, then a whitelist of inline tags applied); code blocks are
 * kept structural so the view can render a `<pre><code>` with a copy button.
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

/** Only allow safe URL schemes for links. */
function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/|#|mailto:)/i.test(trimmed)) return trimmed;
  return null;
}

/** Apply link / bold / italic to a non-code segment. */
function formatSegment(seg: string): string {
  let s = seg.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const href = safeUrl(url);
    if (!href) return text;
    return `<a class="kj-md-link" href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${text}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return s;
}

/**
 * Render inline markdown on an **already HTML-escaped** string. Splits on
 * backtick code spans first so their contents are never re-formatted, then
 * applies link / bold / italic to the remaining prose segments.
 */
function renderInline(escaped: string): string {
  return escaped
    .split(/(`[^`]+`)/g)
    .map((seg) => {
      if (seg.length >= 2 && seg.startsWith('`') && seg.endsWith('`')) {
        return `<code class="kj-md-code">${seg.slice(1, -1)}</code>`;
      }
      return formatSegment(seg);
    })
    .join('');
}

/** Render a prose block (paragraphs + single-newline `<br>`) to safe HTML. */
function renderProse(block: string): string {
  const paragraphs = block
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs
    .map((p) => {
      const lines = p.split('\n').map((line) => renderInline(escapeHtml(line)));
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}

/**
 * Parse a lightweight markdown subset into blocks: fenced code blocks
 * (```lang) become structural `code` blocks; everything else becomes `prose`
 * blocks with sanitised inline HTML.
 *
 * Deliberately minimal (no tables / nested lists) and **self-contained** — the
 * repo ships no markdown engine on `main`. Swap in a full parser later without
 * touching the view.
 */
export function renderMarkdown(src: string): KjMdBlock[] {
  const blocks: KjMdBlock[] = [];
  const fence = /```([\w-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  for (let m = fence.exec(src); m; m = fence.exec(src)) {
    const before = src.slice(last, m.index);
    if (before.trim()) blocks.push({ kind: 'prose', html: renderProse(before) });
    blocks.push({ kind: 'code', lang: m[1] || '', code: m[2].replace(/\n$/, '') });
    last = fence.lastIndex;
  }
  const rest = src.slice(last);
  if (rest.trim()) blocks.push({ kind: 'prose', html: renderProse(rest) });
  return blocks;
}
