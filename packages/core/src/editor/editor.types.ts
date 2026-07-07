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

/**
 * A code language for the editor. The listed ids get editor autocomplete, but
 * any Monaco language id (or a short alias like `ts` / `md` / `yml`, normalised
 * for you) is accepted — hence the open `(string & {})`. This is a kj-level
 * abstraction: callers never import a Monaco type to set a language.
 */
export type KjEditorLanguage =
  | 'plaintext'
  | 'typescript'
  | 'javascript'
  | 'json'
  | 'html'
  | 'css'
  | 'scss'
  | 'less'
  | 'markdown'
  | 'yaml'
  | 'xml'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'sql'
  | 'shell'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'php'
  | 'ruby'
  | (string & {});

/**
 * Lazily loads one language's Monaco contribution (grammar + config). The
 * returned promise resolves once the language is registered. Typically an
 * `import(...)` of a `monaco-editor/esm/vs/basic-languages/<lang>/<lang>.contribution`
 * module, which self-registers into Monaco as a side effect.
 */
export type KjMonacoLanguageLoader = () => Promise<unknown>;
