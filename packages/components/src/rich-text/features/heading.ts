import type { KjRichTextFeature } from '@kouji-ui/core';

/** Heading levels this feature can contribute. */
export type KjHeadingLevel = 1 | 2 | 3;

/**
 * Heading feature. Lazily loads `@lexical/rich-text` for the heading node +
 * creator, and contributes one toolbar toggle per configured level.
 */
export function heading(options?: { levels?: readonly KjHeadingLevel[] }): KjRichTextFeature {
  const levels = options?.levels ?? [1, 2, 3];
  let mod!: typeof import('@lexical/rich-text');
  return {
    name: 'heading',
    async load() {
      mod = await import('@lexical/rich-text');
    },
    nodes: () => [mod.HeadingNode],
    toolbar: levels.map((level, index) => {
      const tag = `h${level}` as 'h1' | 'h2' | 'h3';
      return {
        id: `heading-${level}`,
        group: 'block',
        order: index,
        icon: `heading-${level}`,
        label: `Heading ${level}`,
        kind: 'toggle' as const,
        isActive: (state) => state.blockType === tag,
        run: (ctx) => {
          if (ctx.state.blockType === tag) ctx.setParagraph();
          else ctx.setBlock(() => mod.$createHeadingNode(tag));
        },
      };
    }),
  };
}
