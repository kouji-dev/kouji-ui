/**
 * Browser-only orchestration layer around Lexical.
 *
 * This module is loaded exclusively via a dynamic `import()` from
 * {@link KjRichTextEditor} inside `afterNextRender`, so its eager Lexical
 * imports never execute during SSR. It owns editor creation, plugin
 * registration, reactive state derivation, and all editor commands.
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
  COMMAND_PRIORITY_LOW,
  type LexicalEditor,
  type SerializedEditorState,
  type EditorThemeClasses,
} from 'lexical';
import {
  registerRichText,
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from '@lexical/rich-text';
import {
  ListNode,
  ListItemNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import { LinkNode, $toggleLink, $isLinkNode } from '@lexical/link';
import { CodeNode, CodeHighlightNode, $createCodeNode, $isCodeNode } from '@lexical/code';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $setBlocksType } from '@lexical/selection';
import { KjImageNode, $createKjImageNode } from './image-node';
import { defaultPlugins } from './plugins';
import type { KjRichTextPlugin } from './rich-text-plugin';
import type {
  KjBlockType,
  KjImageInsert,
  KjRichTextState,
  KjTextFormat,
} from './rich-text-editor.types';

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
  /** Extra consumer plugins, appended after the built-in default set. */
  plugins?: readonly KjRichTextPlugin[];
  /** Lexical namespace (diagnostics only). */
  namespace?: string;
}

/** Callbacks the engine invokes to push state/value changes to the directive. */
export interface RichTextEngineCallbacks {
  onState(state: KjRichTextState): void;
  onValue(value: { html: string; text: string; json: SerializedEditorState }): void;
}

/**
 * Create and mount a Lexical editor on `root` and return an engine handle
 * exposing commands and lifecycle.
 */
export function createRichTextEngine(
  root: HTMLElement,
  config: RichTextEngineConfig,
  callbacks: RichTextEngineCallbacks,
): RichTextEngine {
  const editor = createEditor({
    namespace: config.namespace ?? 'kj-rich-text',
    editable: true,
    theme: THEME,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      CodeNode,
      CodeHighlightNode,
      KjImageNode,
    ],
    onError: (error: Error) => {
      // Surface engine errors without breaking the host application.
      console.error('[KjRichTextEditor]', error);
    },
  });

  editor.setRootElement(root);
  const engine = new RichTextEngine(editor, callbacks);
  engine.init(config);
  return engine;
}

/** Handle around a mounted Lexical editor. Command methods are no-ops if destroyed. */
export class RichTextEngine {
  private teardowns: Array<() => void> = [];
  private canUndo = false;
  private canRedo = false;
  private destroyed = false;

  constructor(
    readonly editor: LexicalEditor,
    private readonly callbacks: RichTextEngineCallbacks,
  ) {}

  /** @internal Register core behaviour, plugins, listeners, and seed content. */
  init(config: RichTextEngineConfig): void {
    // Core rich-text behaviour (selection, formatting commands, paste).
    this.teardowns.push(registerRichText(this.editor));

    // Built-in + consumer plugins.
    const plugins = [...defaultPlugins(), ...(config.plugins ?? [])];
    for (const plugin of plugins) {
      try {
        this.teardowns.push(plugin.setup({ editor: this.editor }));
      } catch (error) {
        console.error(`[KjRichTextEditor] plugin "${plugin.name}" failed to register`, error);
      }
    }

    // Undo/redo availability.
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

    // Value + state on every document/selection change.
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

    if (config.initialHtml) {
      this.setHtml(config.initialHtml);
    } else {
      this.emitState();
    }
  }

  // -- reactive state ------------------------------------------------------

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

      if ($isHeadingNode(element)) {
        const tag = element.getTag();
        blockType = tag === 'h1' || tag === 'h2' || tag === 'h3' ? tag : 'paragraph';
      } else if ($isQuoteNode(element)) {
        blockType = 'quote';
      } else if ($isCodeNode(element)) {
        blockType = 'code';
      } else if ($isListNode(element)) {
        blockType = element.getListType() === 'number' ? 'number' : 'bullet';
      } else {
        blockType = 'paragraph';
      }

      isLink = selection
        .getNodes()
        .some((node) => $isLinkNode(node) || $isLinkNode(node.getParent()));
    });

    return { activeFormats, blockType, canUndo: this.canUndo, canRedo: this.canRedo, isLink, empty };
  }

  // -- commands ------------------------------------------------------------

  /**
   * Force any pending (batched) Lexical updates to commit synchronously so
   * that subsequent reads and derived state observe the change immediately.
   */
  private flush(): void {
    this.editor.update(() => {}, { discrete: true });
  }

  toggleFormat(format: KjTextFormat): void {
    if (this.destroyed) return;
    this.editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    this.flush();
  }

  setBlock(block: Exclude<KjBlockType, 'bullet' | 'number'>): void {
    if (this.destroyed) return;
    this.editor.update(
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        switch (block) {
          case 'paragraph':
            $setBlocksType(selection, () => $createParagraphNode());
            break;
          case 'quote':
            $setBlocksType(selection, () => $createQuoteNode());
            break;
          case 'code':
            $setBlocksType(selection, () => $createCodeNode());
            break;
          default:
            $setBlocksType(selection, () => $createHeadingNode(block as HeadingTagType));
        }
      },
      { discrete: true },
    );
  }

  toggleList(type: 'bullet' | 'number'): void {
    if (this.destroyed) return;
    const current = this.readState().blockType;
    if (current === type) {
      this.editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      this.editor.dispatchCommand(
        type === 'number' ? INSERT_ORDERED_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
        undefined,
      );
    }
    this.flush();
  }

  toggleLink(url: string | null): void {
    if (this.destroyed) return;
    this.editor.update(
      () => {
        $toggleLink(url && url.trim() ? url.trim() : null);
      },
      { discrete: true },
    );
  }

  getSelectedLinkUrl(): string | null {
    let url: string | null = null;
    this.editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      for (const node of selection.getNodes()) {
        const link = $isLinkNode(node) ? node : $isLinkNode(node.getParent()) ? node.getParent() : null;
        if (link && $isLinkNode(link)) {
          url = link.getURL();
          break;
        }
      }
    });
    return url;
  }

  insertImage(image: KjImageInsert): void {
    if (this.destroyed || !image.src) return;
    this.editor.update(
      () => {
        $insertNodes([$createKjImageNode(image)]);
      },
      { discrete: true },
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
    this.editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      },
      { discrete: true },
    );
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
    this.editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        if (!html) {
          root.append($createParagraphNode());
          return;
        }
        const dom = new DOMParser().parseFromString(html, 'text/html');
        const nodes = $generateNodesFromDOM(this.editor, dom);
        root.select();
        $insertNodes(nodes);
        if (root.getChildrenSize() === 0) {
          root.append($createParagraphNode());
        }
      },
      { discrete: true },
    );
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
