import { registerHistory, createEmptyHistoryState } from '@lexical/history';
import { registerList } from '@lexical/list';
import { registerMarkdownShortcuts, TRANSFORMERS } from '@lexical/markdown';
import { registerCodeHighlighting } from '@lexical/code';
import type { KjRichTextPlugin } from './rich-text-plugin';

/**
 * Undo/redo history plugin.
 * @param delayMs - Debounce window for merging edits into one history entry.
 */
export function historyPlugin(delayMs = 300): KjRichTextPlugin {
  return {
    name: 'history',
    setup: ({ editor }) => registerHistory(editor, createEmptyHistoryState(), delayMs),
  };
}

/** Ordered/unordered list behaviour (Tab indent, Enter handling, transforms). */
export function listPlugin(): KjRichTextPlugin {
  return {
    name: 'list',
    setup: ({ editor }) => registerList(editor),
  };
}

/**
 * Markdown shortcuts: typing `# `, `- `, `1. `, `> `, `` ``` ``, `**bold**`,
 * `*italic*`, `` `code` `` transforms the block/text inline.
 */
export function markdownShortcutsPlugin(): KjRichTextPlugin {
  return {
    name: 'markdown-shortcuts',
    setup: ({ editor }) => registerMarkdownShortcuts(editor, TRANSFORMERS),
  };
}

/** Syntax highlighting inside code blocks (opt-in; pulls in Prism grammars). */
export function codeHighlightPlugin(): KjRichTextPlugin {
  return {
    name: 'code-highlight',
    setup: ({ editor }) => registerCodeHighlighting(editor),
  };
}

/**
 * The default plugin set registered by {@link KjRichTextEditor}.
 * Consumer-supplied plugins are appended to these.
 */
export function defaultPlugins(): KjRichTextPlugin[] {
  return [historyPlugin(), listPlugin(), markdownShortcutsPlugin()];
}
