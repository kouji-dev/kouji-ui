export interface ExportOptions<TRow = unknown> {
  rows: readonly TRow[];
  columns: readonly string[];
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

export function exportCsv<T>(opts: ExportOptions<T>): string {
  const get = opts.getValue ?? defaultGet;
  const header = opts.columns.join(',');
  const body = opts.rows.map(r =>
    opts.columns.map(c => csvEscape(get(r, c))).join(',')
  ).join('\n');
  return `${header}\n${body}`;
}

export function exportJson<T>(opts: { rows: readonly T[]; pretty?: boolean }): string {
  return JSON.stringify(opts.rows, null, opts.pretty === false ? 0 : 2);
}

export function toTsv<T>(opts: ExportOptions<T>): string {
  const get = opts.getValue ?? defaultGet;
  const header = opts.columns.join('\t');
  const body = opts.rows.map(r =>
    opts.columns.map(c => String(get(r, c) ?? '')).join('\t')
  ).join('\n');
  return `${header}\n${body}`;
}

export function downloadString(filename: string, content: string, type = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
