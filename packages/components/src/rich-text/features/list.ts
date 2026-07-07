import type { KjRichTextFeature } from '@kouji-ui/core';
import type { LexicalEditor } from 'lexical';

// `registerList` sets up transforms + commands editor-wide; run it once even if
// both bullet and ordered list features are enabled.
const listRegistered = new WeakSet<object>();
function ensureList(editor: LexicalEditor, mod: typeof import('@lexical/list')): () => void {
  if (listRegistered.has(editor)) return () => {};
  listRegistered.add(editor);
  const unregister = mod.registerList(editor);
  return () => {
    listRegistered.delete(editor);
    unregister();
  };
}

/** Bullet (unordered) list. Lazily loads `@lexical/list`. */
export function bulletList(): KjRichTextFeature {
  let mod!: typeof import('@lexical/list');
  return {
    name: 'bullet-list',
    async load() {
      mod = await import('@lexical/list');
    },
    nodes: () => [mod.ListNode, mod.ListItemNode],
    setup: (ctx) => ensureList(ctx.editor, mod),
    toolbar: [
      {
        id: 'bullet-list',
        group: 'list',
        order: 0,
        icon: 'list',
        label: 'Bullet list',
        kind: 'toggle',
        isActive: (state) => state.blockType === 'bullet',
        run: (ctx) =>
          ctx.state.blockType === 'bullet'
            ? ctx.dispatch(mod.REMOVE_LIST_COMMAND, undefined)
            : ctx.dispatch(mod.INSERT_UNORDERED_LIST_COMMAND, undefined),
      },
    ],
  };
}

/** Ordered (numbered) list. Lazily loads `@lexical/list`. */
export function orderedList(): KjRichTextFeature {
  let mod!: typeof import('@lexical/list');
  return {
    name: 'ordered-list',
    async load() {
      mod = await import('@lexical/list');
    },
    nodes: () => [mod.ListNode, mod.ListItemNode],
    setup: (ctx) => ensureList(ctx.editor, mod),
    toolbar: [
      {
        id: 'ordered-list',
        group: 'list',
        order: 1,
        icon: 'list-ordered',
        label: 'Numbered list',
        kind: 'toggle',
        isActive: (state) => state.blockType === 'number',
        run: (ctx) =>
          ctx.state.blockType === 'number'
            ? ctx.dispatch(mod.REMOVE_LIST_COMMAND, undefined)
            : ctx.dispatch(mod.INSERT_ORDERED_LIST_COMMAND, undefined),
      },
    ],
  };
}
