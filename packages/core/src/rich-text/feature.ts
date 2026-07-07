import type { Type } from '@angular/core';
import type {
  CommandListenerPriority,
  Klass,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import type { KjRichTextState, KjTextFormat } from './rich-text-editor.types';

/**
 * A keyboard shortcut spec, e.g. `'mod+b'`, `'mod+shift+z'`. `mod` resolves to
 * Ctrl on Windows/Linux and Cmd on macOS.
 */
export type KjRteShortcut = string;

/**
 * Context passed to a feature's `setup` and to every toolbar/overlay action.
 * Wraps the live editor with high-level, package-agnostic helpers so features
 * rarely touch Lexical internals directly (bold/italic never import a package).
 */
export interface KjRichTextContext {
  /** The live Lexical editor. */
  readonly editor: LexicalEditor;
  /** Current formatting state derived from the selection. */
  readonly state: KjRichTextState;
  /** Run a mutation in a discrete (synchronously committed) editor update. */
  update(fn: () => void): void;
  /** Read editor state. */
  read<T>(fn: () => T): T;
  /** Toggle an inline text format (uses the core `FORMAT_TEXT_COMMAND`). */
  toggleInlineFormat(format: KjTextFormat): void;
  /** Replace the selected block(s) with the node returned by `create`. */
  setBlock(create: () => LexicalNode): void;
  /** Replace the selected block(s) with a plain paragraph. */
  setParagraph(): void;
  /** Insert nodes produced by `create` at the selection. */
  insertNodes(create: () => LexicalNode[]): void;
  /** Dispatch a Lexical command (feature packages provide the command constants). */
  dispatch<P>(command: LexicalCommand<P>, payload: P): void;
  /** Register a command handler; returns a teardown. */
  registerCommand<P>(
    command: LexicalCommand<P>,
    listener: (payload: P, editor: LexicalEditor) => boolean,
    priority: CommandListenerPriority,
  ): () => void;
  /** Register a node transform; returns a teardown. */
  registerNodeTransform<T extends LexicalNode>(
    klass: Klass<T>,
    listener: (node: T) => void,
  ): () => void;
  /** Register a keyboard shortcut; returns a teardown. */
  registerShortcut(shortcut: KjRteShortcut, run: () => void): () => void;
  /** Undo / redo. */
  undo(): void;
  redo(): void;
  /** Move focus into the editor. */
  focus(): void;
  /** Open a feature overlay by id, passing arbitrary data to its component. */
  openOverlay(id: string, data?: unknown): void;
  /** Close any open overlay. */
  closeOverlay(): void;
  /** Announce a message to assistive technology (aria-live). */
  announce(message: string): void;
}

/** How a toolbar item behaves. */
export type KjRteToolbarKind = 'button' | 'toggle';

/**
 * A declarative toolbar contribution. Features own what appears in the toolbar;
 * the components layer renders items sorted by `group` then `order`.
 */
export interface KjRteToolbarItem {
  /** Stable unique id. */
  readonly id: string;
  /** Logical group (rendered together, separated from other groups). */
  readonly group: string;
  /** Sort order within the group. */
  readonly order: number;
  /** Lucide icon name. */
  readonly icon: string;
  /** Accessible name + tooltip. */
  readonly label: string;
  /** Value for `aria-keyshortcuts` (e.g. `'Control+B'`). */
  readonly ariaKeyshortcuts?: string;
  /** `toggle` items expose `aria-pressed`; `button` items do not. */
  readonly kind: KjRteToolbarKind;
  /** Whether the toggle is currently active (drives `aria-pressed` + styling). */
  isActive?(state: KjRichTextState): boolean;
  /** Whether the item is currently disabled. */
  isDisabled?(state: KjRichTextState): boolean;
  /** Run the item's action. */
  run(context: KjRichTextContext): void;
}

/**
 * A declarative overlay/popover contribution (e.g. the link editor). Opened via
 * `context.openOverlay(id, data)`; the component receives the `data` (via
 * `injectRteOverlayData`) and can act through the passed callbacks.
 */
export interface KjRteOverlay {
  /** Id used with `context.openOverlay(id)`. */
  readonly id: string;
  /** Accessible name for the overlay dialog. */
  readonly label: string;
  /** Standalone Angular component rendered inside the overlay. */
  readonly component: Type<unknown>;
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
 * A self-contained vertical slice of editor functionality. A feature owns its
 * **package loading** (`load`), its **nodes**, its **behaviour/activation**
 * (`setup`), and its **UI** (`toolbar`, `overlay`).
 *
 * Package loading is lazy and per-feature: `load` dynamically imports the
 * feature's own `@lexical/*` package(s), so disabling a feature means its code
 * is never downloaded. Nodes are collected from all active features **before**
 * the editor is created.
 *
 * @example
 * ```ts
 * export function bulletList(): KjRichTextFeature {
 *   let mod!: typeof import('@lexical/list');
 *   return {
 *     name: 'bullet-list',
 *     async load() { mod = await import('@lexical/list'); },
 *     nodes: () => [mod.ListNode, mod.ListItemNode],
 *     setup: (ctx) => mod.registerList(ctx.editor),
 *     toolbar: [{ id: 'bullet-list', group: 'block', order: 1, icon: 'list',
 *       label: 'Bullet list', kind: 'toggle',
 *       isActive: (s) => s.blockType === 'bullet',
 *       run: (ctx) => ctx.dispatch(mod.INSERT_UNORDERED_LIST_COMMAND, undefined) }],
 *   };
 * }
 * ```
 */
export interface KjRichTextFeature {
  /** Unique, human-readable feature name. */
  readonly name: string;
  /** Lazily import this feature's own `@lexical/*` package(s). Called once at init. */
  load?(): Promise<void>;
  /** Node classes this feature contributes (resolved after `load`). */
  nodes?(): ReadonlyArray<Klass<LexicalNode>>;
  /** Register behaviour (commands, transforms, keybindings). Returns an optional teardown. */
  setup?(context: KjRichTextContext): (() => void) | void;
  /** Angular components to render for this feature's decorator node types. */
  decorators?: readonly KjDecoratorRegistration[];
  /** Declarative toolbar contributions. */
  toolbar?: readonly KjRteToolbarItem[];
  /** Declarative overlay contributions. */
  overlay?: readonly KjRteOverlay[];
}
