import type { KjRichTextFeature } from '@kouji-ui/core';

/** Code block feature. Lazily loads `@lexical/code` (and its Prism grammars). */
export function codeBlock(): KjRichTextFeature {
  let mod!: typeof import('@lexical/code');
  return {
    name: 'code-block',
    async load() {
      mod = await import('@lexical/code');
    },
    nodes: () => [mod.CodeNode, mod.CodeHighlightNode],
    toolbar: [
      {
        id: 'code-block',
        group: 'block',
        order: 20,
        icon: 'square-code',
        label: 'Code block',
        kind: 'toggle',
        isActive: (state) => state.blockType === 'code',
        run: (ctx) =>
          ctx.state.blockType === 'code'
            ? ctx.setParagraph()
            : ctx.setBlock(() => mod.$createCodeNode()),
      },
    ],
  };
}
