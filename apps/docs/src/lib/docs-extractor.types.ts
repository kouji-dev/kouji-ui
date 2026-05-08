// apps/docs/src/lib/docs-extractor.types.ts

export type SourcePkg = 'core' | 'components';

export type DocKind =
  | 'directive'
  | 'service'
  | 'provider-fn'
  | 'inject-fn'
  | 'function'
  | 'token'
  | 'type-alias'
  | 'const';

export interface InputDef {
  name: string;
  type: string;
  required: boolean;
  isModel: boolean;
  description: string;
  defaultValue?: string;
  sourceDirective?: string;
}

export type ModelDef = InputDef;

export interface OutputDef {
  name: string;
  type: string;
  description: string;
  sourceDirective?: string;
}

export interface DirectiveDef {
  className: string;
  selector: string;
  exportAs?: string;
  inputs: InputDef[];
  outputs: OutputDef[];
  models: ModelDef[];
  required: boolean;
}

export interface ServiceDef {
  className: string;
  methods: { name: string; signature: string; description: string }[];
  properties: { name: string; type: string; description: string }[];
}

export interface FunctionParam {
  name: string;
  type: string;
  description: string;
  optional: boolean;
}

export interface FunctionDef {
  name: string;
  signature: string;
  parameters: FunctionParam[];
  returnType: string;
}

export interface TokenDef {
  name: string;
  type: string;
  description: string;
}

export interface TypeAliasDef {
  name: string;
  type: string;
  description: string;
}

export interface ConstDef {
  name: string;
  type: string;
  literalValue?: string;
  description: string;
}

export interface ExampleFile {
  lang: 'ts' | 'html' | 'css';
  filename: string;
  content: string;
  exportName?: string;
}

export interface DocExample {
  label: string;
  themedFiles: Record<string, ExampleFile[]>;
}

export interface DocItem {
  /** Stable id within a manifest. Built from `<pkg>:<filePath>:<symbol>`. */
  id: string;
  symbol: string;
  pageName: string;
  kind: DocKind;
  pkg: SourcePkg;
  filePath: string;
  /** tsDoc summary block — shown in the Definitions section for this item. */
  description: string;
  /**
   * Value of `@doc-description` if present. Only meaningful on the main item:
   * the page assembler copies it into `DocPage.description` (page header).
   * Other items leave it undefined.
   */
  docDescription?: string;
  isMain: boolean;
  order: number | null;
  /** Source-file occurrence index, used as deterministic tiebreaker. */
  sourceOrder: number;
  categoryPath: string[];
  directive?: DirectiveDef;
  service?: ServiceDef;
  function?: FunctionDef;
  token?: TokenDef;
  typeAlias?: TypeAliasDef;
  const?: ConstDef;
  examples?: DocExample[];
}

/**
 * One entry in a page's flattened example list. The example originates on a
 * specific definition (`itemId`/`itemSymbol`), but the page-level layout
 * renders all examples together in an Examples section.
 */
export interface PageExample {
  itemId: string;
  itemSymbol: string;
  example: DocExample;
}

export interface DocPage {
  /** @doc-name slug (e.g. 'date-picker'). Used as URL segment. */
  name: string;
  pkg: SourcePkg;
  categoryPath: string[];
  /** Display title — `name` formatted (`date-picker` → `Date picker`). */
  title: string;
  /**
   * Page description. Sourced from the first non-empty `@doc-description` on
   * any item of the page (main item preferred); falls back to the main
   * item's tsDoc summary.
   */
  description: string;
  mainItemId: string;
  /** Items that make up the page's Definitions section (sorted, main first). */
  definitions: DocItem[];
  /** Flattened examples across all definitions, in definition order. */
  examples: PageExample[];
}

export type ExtractorWarningKind =
  | 'no-main'
  | 'multi-main'
  | 'cross-package'
  | 'unsupported-carrier'
  | 'unknown-tag'
  | 'duplicate-id';

export interface ExtractorWarning {
  kind: ExtractorWarningKind;
  message: string;
  filePath?: string;
  line?: number;
  pageName?: string;
}

export interface DocsManifest {
  generatedAt: string;
  pages: DocPage[];
  warnings: ExtractorWarning[];
}
