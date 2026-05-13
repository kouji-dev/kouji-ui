// apps/docs/src/lib/doc-blocks.ts
//
// Block-level @doc-* tags (multi-line bodies) that don't roundtrip cleanly
// through TypeScript's JSDoc parser. We strip the JSDoc line markers and
// scan the raw text, like `examples.ts` already does for @doc-example.
//
// Tags handled:
//   @doc-prereqs        — markdown body until the next @tag
//   @doc-a11y           — markdown body until the next @tag
//   @doc-callout <kind> — one block per kind; body markdown
//   @doc-keyboard       — list of `<keys> — <action>` lines
//   @doc-aria           — list of `<attr> — <notes>` lines

import { stripJsDocLineMarkers } from './examples';
import type { Callout, CalloutKind, KeyboardEntry, AriaEntry } from './docs-extractor.types';

/**
 * Reads the body of a single-occurrence block tag (`@doc-prereqs`,
 * `@doc-a11y`) — everything between the tag and the next `@<tag>`.
 */
export function readBlockTag(jsDocText: string, tagName: string): string | null {
  const cleaned = stripJsDocLineMarkers(jsDocText);
  const re = new RegExp(`(?:^|\\n)\\s*@${tagName}\\b([^\\n]*)\\n([\\s\\S]*?)(?=\\n\\s*@[\\w-]+\\b|$)`);
  const m = cleaned.match(re);
  if (!m) return null;
  const inline = m[1].trim();
  const body = m[2].split('\n').map(l => l.trim()).filter(Boolean).join('\n').trim();
  return [inline, body].filter(Boolean).join('\n') || null;
}

/**
 * Reads zero-or-more `@doc-callout <kind>` blocks. The kind is required
 * and must be one of `note|info|warning|danger`; unknown kinds are
 * silently skipped so future kinds added by authors don't blow up the
 * extractor.
 */
export function readCallouts(jsDocText: string): Callout[] {
  const cleaned = stripJsDocLineMarkers(jsDocText);
  const re = /(?:^|\n)\s*@doc-callout[ \t]+(\w+)\b([^\n]*)\n([\s\S]*?)(?=\n\s*@[\w-]+\b|$)/g;
  const out: Callout[] = [];
  for (const m of cleaned.matchAll(re)) {
    const kindRaw = m[1].toLowerCase();
    if (!isCalloutKind(kindRaw)) continue;
    const inline = m[2].trim();
    const body = m[3].split('\n').map(l => l.trim()).filter(Boolean).join('\n').trim();
    const text = [inline, body].filter(Boolean).join('\n');
    if (text) out.push({ kind: kindRaw, body: text });
  }
  return out;
}

function isCalloutKind(k: string): k is CalloutKind {
  return k === 'note' || k === 'info' || k === 'warning' || k === 'danger';
}

/**
 * Parses `@doc-keyboard` as a list of `<keys> — <action>` lines.
 * Accepts em-dash `—`, en-dash `–`, hyphens (`-`, `--`), or `:` as separator.
 * Lines without a separator are skipped.
 */
export function readKeyboard(jsDocText: string): KeyboardEntry[] {
  const body = readBlockTag(jsDocText, 'doc-keyboard');
  if (!body) return [];
  const out: KeyboardEntry[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^(.+?)\s*(?:—|–|--|-|:)\s*(.+)$/);
    if (!m) continue;
    const keys = m[1].trim();
    const action = m[2].trim();
    if (keys && action) out.push({ keys, action });
  }
  return out;
}

/**
 * Parses `@doc-aria` as a list of `<attr> — <notes>` lines. Same separator
 * rules as `@doc-keyboard`. Attribute names without a separator emit an
 * entry with an empty `notes` field (e.g. just listing managed attrs).
 */
export function readAria(jsDocText: string): AriaEntry[] {
  const body = readBlockTag(jsDocText, 'doc-aria');
  if (!body) return [];
  const out: AriaEntry[] = [];
  for (const line of body.split('\n')) {
    const split = line.match(/^(.+?)\s*(?:—|–|--|-|:)\s*(.+)$/);
    if (split) {
      out.push({ attr: split[1].trim(), notes: split[2].trim() });
    } else if (line.trim()) {
      out.push({ attr: line.trim(), notes: '' });
    }
  }
  return out;
}
