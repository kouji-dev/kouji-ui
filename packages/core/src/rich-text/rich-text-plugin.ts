import type { Type } from '@angular/core';
import type {
  CommandListenerPriority,
  Klass,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

/**
 * Context handed to a {@link KjRichTextExtension} `setup` when it is registered.
 * Wraps the live editor with convenience passthroughs so extensions rarely need
 * to import Lexical command/transform plumbing directly.
 */
export interface KjRichTextContext {
  /** The initialized Lexical editor instance. */
  readonly editor: LexicalEditor;
  /**
   * Register a command listener. Returns a teardown that unregisters it.
   * (Passthrough to `editor.registerCommand`.)
   */
  registerCommand<P>(
    command: LexicalCommand<P>,
    listener: (payload: P, editor: LexicalEditor) => boolean,
    priority: CommandListenerPriority,
  ): () => void;
  /**
   * Register a node transform. Returns a teardown that unregisters it.
   * (Passthrough to `editor.registerNodeTransform`.)
   */
  registerNodeTransform<T extends LexicalNode>(
    klass: Klass<T>,
    listener: (node: T) => void,
  ): () => void;
}

/**
 * Maps a Lexical decorator-node type to the Angular component that renders it.
 * The engine's decorator bridge mounts the component into each node's DOM.
 */
export interface KjDecoratorRegistration {
  /** The Lexical node `getType()` value this renders. */
  readonly nodeType: string;
  /** The standalone Angular component to mount for each node instance. */
  readonly component: Type<unknown>;
}

/**
 * A composable unit of editor behaviour registered with {@link KjRichTextEditor}.
 *
 * An extension can contribute **nodes**, **decorator components**, and/or runtime
 * **behaviour** — the three things needed to add a first-class feature (mentions,
 * embeds, custom marks) from outside the engine:
 *
 * - `nodes` is a **lazy factory** resolved during the engine's browser-side init
 *   (after Lexical is dynamically imported), keeping node classes out of the base
 *   bundle and SSR-safe. It receives the imported `lexical` namespace.
 * - `decorators` registers Angular components for the node types it renders.
 * - `setup` runs once after the editor is created and returns a teardown.
 *
 * @example
 * ```ts
 * const badge = createKjDecoratorNode(lexical, { type: 'badge', component: BadgeChip, inline: true });
 * export const badgeExtension: KjRichTextExtension = {
 *   name: 'badge',
 *   nodes: () => [badge.Node],
 *   decorators: [{ nodeType: 'badge', component: BadgeChip }],
 * };
 * ```
 */
export interface KjRichTextExtension {
  /** Unique, human-readable extension name (used for diagnostics). */
  readonly name: string;
  /**
   * Lazy node factory. Receives the imported `lexical` namespace and returns the
   * node classes this extension contributes. Collected **before** editor creation.
   */
  nodes?(lexical: typeof import('lexical')): ReadonlyArray<Klass<LexicalNode>>;
  /** Angular components to render for this extension's decorator node types. */
  decorators?: readonly KjDecoratorRegistration[];
  /**
   * Register runtime behaviour (commands, listeners, transforms) against the
   * editor. Runs once after creation; returns an optional teardown callback.
   */
  setup?(context: KjRichTextContext): (() => void) | void;
}

/**
 * @deprecated Renamed to {@link KjRichTextExtension}. Kept as an alias for
 * backwards compatibility; will be removed in a future major.
 */
export type KjRichTextPlugin = KjRichTextExtension;
