import type { KjRichTextFeature } from '@kouji-ui/core';

/**
 * Undo/redo history. Lazily loads `@lexical/history` and contributes undo/redo
 * toolbar buttons (disabled until the respective action is available).
 */
export function history(): KjRichTextFeature {
  let mod!: typeof import('@lexical/history');
  return {
    name: 'history',
    async load() {
      mod = await import('@lexical/history');
    },
    setup: (ctx) => mod.registerHistory(ctx.editor, mod.createEmptyHistoryState(), 300),
    toolbar: [
      {
        id: 'undo',
        group: 'history',
        order: 0,
        icon: 'undo',
        label: 'Undo',
        ariaKeyshortcuts: 'Control+Z',
        kind: 'button',
        isDisabled: (state) => !state.canUndo,
        run: (ctx) => ctx.undo(),
      },
      {
        id: 'redo',
        group: 'history',
        order: 1,
        icon: 'redo',
        label: 'Redo',
        ariaKeyshortcuts: 'Control+Shift+Z',
        kind: 'button',
        isDisabled: (state) => !state.canRedo,
        run: (ctx) => ctx.redo(),
      },
    ],
  };
}
