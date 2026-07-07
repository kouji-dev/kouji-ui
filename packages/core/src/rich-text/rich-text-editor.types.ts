/**
 * Public types for the {@link KjRichTextEditor} engine wrapper.
 *
 * These are framework- and engine-agnostic: they contain no Lexical runtime
 * imports so they are safe to import eagerly (including during SSR).
 */

/** Inline text formats that {@link KjRichTextEditor} can toggle on a selection. */
export type KjTextFormat = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code';

/** Block-level node type that the current selection resolves to. */
export type KjBlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'code'
  | 'bullet'
  | 'number';

/**
 * Snapshot of the editor's formatting state, derived from the current
 * selection. Exposed as reactive signals on the directive.
 */
export interface KjRichTextState {
  /** Inline formats active on the current selection. */
  readonly activeFormats: ReadonlySet<KjTextFormat>;
  /** Block type of the selection's top-level element. */
  readonly blockType: KjBlockType;
  /** Whether an undo step is available. */
  readonly canUndo: boolean;
  /** Whether a redo step is available. */
  readonly canRedo: boolean;
  /** Whether the selection is inside a link. */
  readonly isLink: boolean;
  /** Whether the document has no text content. */
  readonly empty: boolean;
}

/** Serialized editor content emitted whenever the document changes. */
export interface KjRichTextValue {
  /** Content serialized to HTML. */
  readonly html: string;
  /** Plain-text content. */
  readonly text: string;
  /** Lexical `SerializedEditorState` (structurally typed as `unknown`). */
  readonly json: unknown;
}

/** Descriptor for an image inserted via {@link KjRichTextEditor.insertImage}. */
export interface KjImageInsert {
  /** Image source URL. */
  readonly src: string;
  /** Alternative text — always supply for WCAG 1.1.1. */
  readonly alt?: string;
  /** Optional intrinsic width in pixels. */
  readonly width?: number;
  /** Optional intrinsic height in pixels. */
  readonly height?: number;
}
