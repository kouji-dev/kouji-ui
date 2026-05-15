// apps/docs/src/lib/doc-tags.ts
import ts from 'typescript';

export interface ParsedDocTags {
  hasDoc: boolean;
  name: string | null;
  isMain: boolean;
  order: number | null;
  description: string | null;
  /** `@doc-import <stmt>` — overrides the auto-generated import line. */
  importOverride: string | null;
  /** `@doc-touch <note>` — single-line touch-target compliance note. */
  touchTarget: string | null;
  /** `@doc-related foo,bar,baz` — slugs of related pages. */
  related: string[];
  unknownTags: string[];
}

const KNOWN_DOC_TAGS = new Set([
  'doc',
  'doc-name',
  'doc-is-main',
  'doc-order',
  'doc-description',
  'doc-file',
  'doc-example',
  'doc-themes',
  'doc-theme',
  'doc-category',
  /* Docs-page metadata (Agent B handoff) */
  'doc-prereqs',
  'doc-callout',
  'doc-import',
  'doc-keyboard',
  'doc-aria',
  'doc-css-var',
  'doc-touch',
  'doc-a11y',
  'doc-related',
  'internal',
  'example',
  'deprecated',
  'param',
  'returns',
  'see',
]);

/**
 * Parse the kouji `@doc-*` tag family from a node's JSDoc.
 *
 * Returns `hasDoc: false` when `@doc` is absent OR when `@internal` is set
 * (treat internal-tagged exports as suppressed even if they were marked
 * `@doc`).
 */
export function parseDocTags(node: ts.Node): ParsedDocTags {
  const tags = ts.getJSDocTags(node);
  const result: ParsedDocTags = {
    hasDoc: false,
    name: null,
    isMain: false,
    order: null,
    description: null,
    importOverride: null,
    touchTarget: null,
    related: [],
    unknownTags: [],
  };

  let internal = false;

  for (const tag of tags) {
    const tagName = tag.tagName.text;
    const comment = typeof tag.comment === 'string'
      ? tag.comment.trim()
      : ts.getTextOfJSDocComment(tag.comment) ?? '';

    switch (tagName) {
      case 'doc':
        result.hasDoc = true;
        break;
      case 'doc-name':
        result.name = comment.split(/\s+/)[0] || null;
        break;
      case 'doc-is-main':
        result.isMain = true;
        break;
      case 'doc-order': {
        const n = Number.parseInt(comment, 10);
        if (Number.isFinite(n)) result.order = n;
        break;
      }
      case 'doc-description':
        result.description = comment.trim() || null;
        break;
      case 'doc-import':
        result.importOverride = comment.trim() || null;
        break;
      case 'doc-touch':
        result.touchTarget = comment.trim() || null;
        break;
      case 'doc-related':
        result.related = comment
          .split(/[,\s]+/)
          .map(s => s.trim())
          .filter(Boolean);
        break;
      case 'internal':
        internal = true;
        break;
      default:
        if (!KNOWN_DOC_TAGS.has(tagName)) {
          result.unknownTags.push(tagName);
        }
    }
  }

  if (internal) {
    result.hasDoc = false;
  }

  return result;
}
