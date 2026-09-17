/** Input for the delimited exporters ({@link exportCsv}, {@link toTsv}). */
export interface ExportOptions<TRow = unknown> {
  /** Rows to write, in the order they should appear. */
  rows: readonly TRow[];
  /** Column ids, in order; also the header line. */
  columns: readonly string[];
  /** Cell reader. Defaults to `row[column]`. */
  getValue?: (row: TRow, column: string) => unknown;
}

function defaultGet<T>(row: T, column: string): unknown {
  return (row as Record<string, unknown>)[column];
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  const needsQuotes = s.includes(',') || s.includes('"') || s.includes('\n');
  return needsQuotes ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize rows as CSV: one header line, then one line per row. */
export function exportCsv<T>(opts: ExportOptions<T>): string {
  const get = opts.getValue ?? defaultGet;
  const header = opts.columns.join(',');
  const body = opts.rows.map(r =>
    opts.columns.map(c => csvEscape(get(r, c))).join(',')
  ).join('\n');
  return `${header}\n${body}`;
}

/** Serialize rows as JSON. Indented by default; pass `pretty: false` for one line. */
export function exportJson<T>(opts: { rows: readonly T[]; pretty?: boolean }): string {
  return JSON.stringify(opts.rows, null, opts.pretty === false ? 0 : 2);
}

/** Serialize rows as tab-separated values — the clipboard-friendly shape. */
export function toTsv<T>(opts: ExportOptions<T>): string {
  const get = opts.getValue ?? defaultGet;
  const header = opts.columns.join('\t');
  const body = opts.rows.map(r =>
    opts.columns.map(c => String(get(r, c) ?? '')).join('\t')
  ).join('\n');
  return `${header}\n${body}`;
}

/**
 * Triggers a browser download of `content`.
 *
 * `doc` defaults to the ambient document — this is a plain helper a consumer
 * calls from a click handler, so there is no injector to ask — but it is a
 * parameter so a caller with an injected `DOCUMENT` can pass it, and so the
 * function is a no-op instead of a crash where there is no DOM.
 */
export function downloadString(
  filename: string,
  content: string,
  type = 'text/plain',
  doc: Document | null = ambientDocument(),
): void {
  const body = doc?.body;
  const view = doc?.defaultView;
  if (!body || !view) return;
  const blob = new view.Blob([content], { type });
  const url = view.URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url; a.download = filename;
  body.appendChild(a);
  a.click();
  body.removeChild(a);
  view.URL.revokeObjectURL(url);
}

/** Copies `text` to the clipboard. No-op where the Clipboard API is unavailable. */
export async function copyToClipboard(
  text: string,
  doc: Document | null = ambientDocument(),
): Promise<void> {
  await doc?.defaultView?.navigator?.clipboard?.writeText(text);
}

function ambientDocument(): Document | null {
  return (globalThis as { document?: Document }).document ?? null;
}
