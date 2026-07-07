import type { KjRichTextFeature } from '@kouji-ui/core';

/** Blockquote feature. Lazily loads `@lexical/rich-text` for the quote node. */
export function quote(): KjRichTextFeature {
  let mod!: typeof import('@lexical/rich-text');
  return {
    name: 'quote',
    async load() {
      mod = await import('@lexical/rich-text');
    },
    nodes: () => [mod.QuoteNode],
    toolbar: [
      {
        id: 'quote',
        group: 'block',
        order: 10,
        icon: 'quote',
        label: 'Quote',
        kind: 'toggle',
        isActive: (state) => state.blockType === 'quote',
        run: (ctx) =>
          ctx.state.blockType === 'quote'
            ? ctx.setParagraph()
            : ctx.setBlock(() => mod.$createQuoteNode()),
      },
    ],
  };
}
