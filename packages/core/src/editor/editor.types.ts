import type { editor } from 'monaco-editor';

/**
 * The Monaco namespace (`typeof import('monaco-editor')`). Imported as a
 * **type only** so `monaco-editor` never becomes a runtime dependency of the
 * base bundle — the actual module is resolved lazily by {@link KjEditorLoader}.
 */
export type KjMonaco = typeof import('monaco-editor');

/** A function that resolves a ready-to-use Monaco namespace. */
export type KjMonacoLoaderFn = () => Promise<KjMonaco>;

/**
 * Monaco standalone editor construction options. Re-exported under a `kj` name
 * so consumers don't need a direct `monaco-editor` type import at call sites.
 */
export type KjEditorOptions = editor.IStandaloneEditorConstructionOptions;

/** The live Monaco editor instance. */
export type KjEditorInstance = editor.IStandaloneCodeEditor;

/** Gutter line-number rendering mode. */
export type KjEditorLineNumbers = 'on' | 'off' | 'relative';

/** Soft-wrap mode. */
export type KjEditorWordWrap = 'on' | 'off';
