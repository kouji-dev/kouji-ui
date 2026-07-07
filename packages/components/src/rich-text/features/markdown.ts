import type { KjRichTextFeature } from '@kouji-ui/core';

/**
 * Markdown shortcuts (`# `, `- `, `1. `, `> `, `` ``` ``, `**bold**`, …). Lazily
 * loads `@lexical/markdown`. No toolbar UI — it's a typing behaviour.
 */
export function markdownShortcuts(): KjRichTextFeature {
  let mod!: typeof import('@lexical/markdown');
  return {
    name: 'markdown-shortcuts',
    async load() {
      mod = await import('@lexical/markdown');
    },
    setup: (ctx) => mod.registerMarkdownShortcuts(ctx.editor, mod.TRANSFORMERS),
  };
}
