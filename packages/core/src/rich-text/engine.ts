/**
 * Browser-only orchestration layer around Lexical.
 *
 * Loaded exclusively via a dynamic `import()` from {@link KjRichTextEditor}
 * inside `afterNextRender`, so its eager imports never execute during SSR. It
 * statically imports only the **base** editing packages (core `lexical`,
 * `@lexical/rich-text` for `registerRichText`, `@lexical/selection`,
 * `@lexical/html`). Everything else (lists, code, history, markdown, links) is
 * loaded lazily and per-feature via each feature's `load()`.
 *
 * State is derived package-agnostically (by `node.getType()` + duck-typed
 * methods) so the engine never imports a feature's package to read state.
 */
import {
  createEditor,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $insertNodes,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  type ElementNode,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedEditorState,
  type EditorThemeClasses,
} from 'lexical';
import { registerRichText } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import type { KjRichTextContext, KjRichTextFeature, KjRteShortcut } from './feature';
import type { KjDecoratorMountAdapter, KjMountedComponent } from './rich-text.context';
import type { KjBlockType, KjRichTextState, KjTextFormat } from './rich-text-editor.types';

/** CSS classes applied to editor nodes; styled by the components layer. */
const THEME: EditorThemeClasses = {
  paragraph: 'kj-rte-paragraph',
  heading: { h1: 'kj-rte-h1', h2: 'kj-rte-h2', h3: 'kj-rte-h3' },
  quote: 'kj-rte-quote',
  list: { ul: 'kj-rte-ul', ol: 'kj-rte-ol', listitem: 'kj-rte-li' },
  link: 'kj-rte-link',
  code: 'kj-rte-code-block',
  text: {
    bold: 'kj-rte-bold',
    italic: 'kj-rte-italic',
    underline: 'kj-rte-underline',
    strikethrough: 'kj-rte-strikethrough',
    code: 'kj-rte-code',
  },
};

const INLINE_FORMATS: readonly KjTextFormat[] = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'code',
];

/** Configuration for {@link createRichTextEngine}. */
export interface RichTextEngineConfig {
  /** Initial content as an HTML string. */
  initialHtml?: string;
  /** Active features (built-in editing lives in features too). */
  features?: readonly KjRichTextFeature[];
  /** Lexical namespace (diagnostics only). */
  namespace?: string;
  /** Adapter used to mount Angular components for decorator nodes. */
  mount?: KjDecoratorMountAdapter;
  /** Called when a feature requests an overlay. */
  onOverlayOpen?(id: string, data: unknown): void;
  /** Called when a feature closes the overlay. */
  onOverlayClose?(): void;
  /** Called to announce a message to assistive technology. */
  onAnnounce?(message: string): void;
}

/** Callbacks the engine invokes to push state/value changes to the directive. */
export interface RichTextEngineCallbacks {
  onState(state: KjRichTextState): void;
  onValue(value: { html: string; text: string; json: SerializedEditorState }): void;
}

/**
 * Create and mount a Lexical editor on `root`, loading each feature's packages,
 * collecting their nodes **before** `createEditor`, then registering behaviour.
 * Async because feature package loading is awaited.
 */
export async function createRichTextEngine(
  root: HTMLElement,
  config: RichTextEngineConfig,
  callbacks: RichTextEngineCallbacks,
): Promise<RichTextEngine> {
  const features = config.features ?? [];

  // Per-feature lazy package loading. Disabling a feature ⇒ its package never
  // loads. Loaded in parallel; a failure is isolated to its feature.
  await Promise.all(
    features.map(async (feature) => {
      try {
        await feature.load?.();
      } catch (error) {
        console.error(`[KjRichTextEditor] feature "${feature.name}" load() failed`, error);
      }
    }),
  );

  // Collect nodes from all features (now that their packages are loaded).
  const nodeSet = new Set<Klass<LexicalNode>>();
  for (const feature of features) {
    try {
      for (const node of feature.nodes?.() ?? []) nodeSet.add(node);
    } catch (error) {
      console.error(`[KjRichTextEditor] feature "${feature.name}" nodes() failed`, error);
    }
  }

  const editor = createEditor({
    namespace: config.namespace ?? 'kj-rich-text',
    editable: true,
    theme: THEME,
    nodes: [...nodeSet],
    onError: (error: Error) => console.error('[KjRichTextEditor]', error),
  });

  editor.setRootElement(root);
  const engine = new RichTextEngine(editor, callbacks, config);
  engine.init(features);
  return engine;
}

/** Handle around a mounted Lexical editor. Command methods are no-ops if destroyed. */
export class RichTextEngine {
  private teardowns: Array<() => void> = [];
  private canUndo = false;
  private canRedo = false;
  private destroyed = false;
  private readonly decoratorRegistry = new Map<string, unknown>();
  private readonly mounted = new Map<NodeKey, KjMountedComponent>();
  /** Shared, live context handed to features. */
  readonly context: KjRichTextContext;

  constructor(
    readonly editor: LexicalEditor,
    private readonly callbacks: RichTextEngineCallbacks,
    private readonly config: RichTextEngineConfig,
  ) {
    const context: Omit<KjRichTextContext, 'state'> = {
      editor,
      update: (fn: () => void) => this.update(fn),
      read: (fn) => editor.getEditorState().read(fn),
      toggleInlineFormat: (format) => this.toggleFormat(format),
      setBlock: (create) => this.setBlock(create),
      setParagraph: () => this.setBlock(() => $createParagraphNode()),
      insertNodes: (create) => this.update(() => $insertNodes(create())),
      dispatch: (command, payload) => {
        editor.dispatchCommand(command, payload);
        this.flush();
      },
      registerCommand: (command, listener, priority) =>
        editor.registerCommand(command, listener, priority),
      registerNodeTransform: (klass, listener) => editor.registerNodeTransform(klass, listener),
      registerShortcut: (shortcut, run) => this.registerShortcut(shortcut, run),
      undo: () => this.undo(),
      redo: () => this.redo(),
      focus: () => this.focus(),
      openOverlay: (id, data) => this.config.onOverlayOpen?.(id, data),
      closeOverlay: () => this.config.onOverlayClose?.(),
      announce: (message) => this.config.onAnnounce?.(message),
    };
    // `state` is a live getter (reflects the current selection each read).
    Object.defineProperty(context, 'state', {
      get: () => this.readState(),
      enumerable: true,
    });
    this.context = context as KjRichTextContext;
  }

  /** @internal Register base editing, feature behaviour, listeners, decorators, seed content. */
  init(features: readonly KjRichTextFeature[]): void {
    // Base: rich-text editing (selection, formatting commands, paste, Enter).
    this.teardowns.push(registerRichText(this.editor));

    for (const feature of features) {
      try {
        const teardown = feature.setup?.(this.context);
        if (teardown) this.teardowns.push(teardown);
      } catch (error) {
        console.error(`[KjRichTextEditor] feature "${feature.name}" setup failed`, error);
      }
      // Decorator components declared via createKjDecoratorNode-based features.
      for (const registration of feature.decorators ?? []) {
        this.decoratorRegistry.set(registration.nodeType, registration.component);
      }
    }

    if (this.config.mount && this.decoratorRegistry.size > 0) {
      this.teardowns.push(
        this.editor.registerDecoratorListener((decorators: Record<NodeKey, unknown>) =>
          this.reconcileDecorators(decorators),
        ),
      );
    }

    this.teardowns.push(
      this.editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload: boolean) => {
          this.canUndo = payload;
          this.emitState();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
    this.teardowns.push(
      this.editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload: boolean) => {
          this.canRedo = payload;
          this.emitState();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    this.teardowns.push(
      this.editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const html = $generateHtmlFromNodes(this.editor, null);
          const text = $getRoot().getTextContent();
          this.callbacks.onValue({ html, text, json: editorState.toJSON() });
        });
        this.emitState();
      }),
    );

    if (this.config.initialHtml) {
      this.setHtml(this.config.initialHtml);
    } else {
      this.emitState();
    }
  }

  // -- reactive state (package-agnostic) -----------------------------------

  private emitState(): void {
    if (this.destroyed) return;
    this.callbacks.onState(this.readState());
  }

  private readState(): KjRichTextState {
    const activeFormats = new Set<KjTextFormat>();
    let blockType: KjBlockType = 'paragraph';
    let isLink = false;
    let empty = true;

    this.editor.getEditorState().read(() => {
      const root = $getRoot();
      empty = root.getTextContent().length === 0;

      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      for (const format of INLINE_FORMATS) {
        if (selection.hasFormat(format)) activeFormats.add(format);
      }

      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
      blockType = elementBlockType(element);

      // Duck-typed link detection (no @lexical/link import).
      isLink = selection.getNodes().some((node) => isLinkNode(node) || isLinkNode(node.getParent()));
    });

    return { activeFormats, blockType, canUndo: this.canUndo, canRedo: this.canRedo, isLink, empty };
  }

  private reconcileDecorators(decorators: Record<NodeKey, unknown>): void {
    if (!this.config.mount) return;
    const liveKeys = new Set<NodeKey>(Object.keys(decorators) as NodeKey[]);
    for (const [key, mounted] of this.mounted) {
      if (!liveKeys.has(key)) {
        mounted.destroy();
        this.mounted.delete(key);
      }
    }
    for (const key of liveKeys) {
      if (this.mounted.has(key)) continue;
      const node = decorators[key] as { getType?: () => string } | undefined;
      const type = node?.getType?.();
      const component = type ? this.decoratorRegistry.get(type) : undefined;
      if (!component) continue;
      const hostEl = this.editor.getElementByKey(key);
      if (!hostEl) continue;
      const mounted = this.config.mount.mount(component, node);
      hostEl.appendChild(mounted.element);
      this.mounted.set(key, mounted);
    }
  }

  // -- command mechanics ---------------------------------------------------

  private flush(): void {
    this.editor.update(() => {}, { discrete: true });
  }

  private update(fn: () => void): void {
    if (this.destroyed) return;
    this.editor.update(fn, { discrete: true });
  }

  private toggleFormat(format: KjTextFormat): void {
    if (this.destroyed) return;
    this.editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    this.flush();
  }

  private setBlock(create: () => LexicalNode): void {
    this.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Block factories always return ElementNodes; the public ctx type is the
        // broader LexicalNode for ergonomics.
        $setBlocksType(selection, create as () => ElementNode);
      }
    });
  }

  private registerShortcut(shortcut: KjRteShortcut, run: () => void): () => void {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const needMod = parts.includes('mod');
    const needShift = parts.includes('shift');
    const needAlt = parts.includes('alt');
    return this.editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        const mod = event.ctrlKey || event.metaKey;
        if (
          event.key.toLowerCase() === key &&
          needMod === mod &&
          needShift === event.shiftKey &&
          needAlt === event.altKey
        ) {
          event.preventDefault();
          run();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }

  undo(): void {
    if (this.destroyed) return;
    this.editor.dispatchCommand(UNDO_COMMAND, undefined);
    this.flush();
  }

  redo(): void {
    if (this.destroyed) return;
    this.editor.dispatchCommand(REDO_COMMAND, undefined);
    this.flush();
  }

  focus(): void {
    if (this.destroyed) return;
    this.editor.focus();
  }

  clear(): void {
    if (this.destroyed) return;
    this.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createParagraphNode());
    });
  }

  setEditable(editable: boolean): void {
    if (this.destroyed) return;
    this.editor.setEditable(editable);
  }

  // -- value I/O -----------------------------------------------------------

  getHtml(): string {
    let html = '';
    this.editor.getEditorState().read(() => {
      html = $generateHtmlFromNodes(this.editor, null);
    });
    return html;
  }

  setHtml(html: string): void {
    if (this.destroyed) return;
    this.update(() => {
      const root = $getRoot();
      root.clear();
      if (!html) {
        root.append($createParagraphNode());
        return;
      }
      // $generateNodesFromDOM only produces nodes for registered (active) types,
      // so deserialization automatically respects the active feature/node set.
      const dom = new DOMParser().parseFromString(html, 'text/html');
      const nodes = $generateNodesFromDOM(this.editor, dom);
      root.select();
      $insertNodes(nodes);
      if (root.getChildrenSize() === 0) root.append($createParagraphNode());
    });
  }

  getJson(): SerializedEditorState {
    return this.editor.getEditorState().toJSON();
  }

  setJson(json: SerializedEditorState): void {
    if (this.destroyed) return;
    this.editor.setEditorState(this.editor.parseEditorState(json));
    this.flush();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const mounted of this.mounted.values()) {
      try {
        mounted.destroy();
      } catch {
        // ignore
      }
    }
    this.mounted.clear();
    for (const teardown of this.teardowns.reverse()) {
      try {
        teardown();
      } catch {
        // ignore teardown errors
      }
    }
    this.teardowns = [];
    this.editor.setRootElement(null);
  }
}

/** Map a top-level element node to a {@link KjBlockType} via its type string. */
function elementBlockType(element: LexicalNode): KjBlockType {
  const el = element as unknown as {
    getType(): string;
    getTag?(): string;
    getListType?(): string;
  };
  switch (el.getType()) {
    case 'heading': {
      const tag = el.getTag?.();
      return tag === 'h1' || tag === 'h2' || tag === 'h3' ? tag : 'paragraph';
    }
    case 'quote':
      return 'quote';
    case 'code':
      return 'code';
    case 'list':
      return el.getListType?.() === 'number' ? 'number' : 'bullet';
    default:
      return 'paragraph';
  }
}

/** Duck-typed link-node check (avoids importing `@lexical/link`). */
function isLinkNode(node: LexicalNode | null | undefined): boolean {
  return !!node && (node as unknown as { getType(): string }).getType() === 'link';
}
