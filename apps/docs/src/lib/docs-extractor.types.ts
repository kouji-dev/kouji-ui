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
  description: string;
  isMain: boolean;
  order: number | null;
  /** Source-file occurrence index, used as deterministic tiebreaker. */
  sourceOrder: number;
  directive?: DirectiveDef;
  service?: ServiceDef;
  function?: FunctionDef;
  token?: TokenDef;
  typeAlias?: TypeAliasDef;
  const?: ConstDef;
  examples?: DocExample[];
}

export interface DocPage {
  name: string;
  pkg: SourcePkg;
  categoryPath: string[];
  title: string;
  description: string;
  mainItemId: string;
  items: DocItem[];
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
