import type ts from 'typescript';

/**
 * A pre-parsed source file passed to detectors. The orchestrator parses
 * each file once via `ts.createSourceFile` (no ts-morph, no Program), then
 * hands the same `tsSourceFile` to every detector — eliminating the
 * per-detector reparse that the previous tsquery.ast(...) per-detector
 * approach incurred.
 */
export interface ParsedFile {
  tsSourceFile: ts.SourceFile;
  filePath: string;
}
