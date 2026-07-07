import type { LexicalEditor } from 'lexical';

/**
 * Context handed to a {@link KjRichTextPlugin} when it is registered.
 * Provides the live Lexical editor instance so the plugin can register
 * commands, listeners, nodes, or transforms.
 */
export interface KjRichTextContext {
  /** The initialized Lexical editor instance. */
  readonly editor: LexicalEditor;
}

/**
 * A composable unit of editor behaviour registered with {@link KjRichTextEditor}.
 *
 * Built-in behaviours (history, lists, markdown shortcuts) are plugins, and
 * consumers can supply their own via the `kjPlugins` input to extend the editor
 * (e.g. mentions, custom nodes) without forking the core.
 *
 * `setup` runs once, browser-side, after the editor is created; it returns a
 * teardown callback invoked when the editor is destroyed.
 *
 * @example
 * ```ts
 * const hashtagPlugin: KjRichTextPlugin = {
 *   name: 'hashtag',
 *   setup: ({ editor }) => registerHashtag(editor),
 * };
 * ```
 */
export interface KjRichTextPlugin {
  /** Unique, human-readable plugin name (used for diagnostics). */
  readonly name: string;
  /**
   * Register the plugin against the editor.
   * @param context - The editor context.
   * @returns A teardown callback that unregisters the plugin.
   */
  setup(context: KjRichTextContext): () => void;
}
