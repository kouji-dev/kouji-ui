import ts from 'typescript';
import type { ParsedFile } from '../../parsed-file';

/**
 * Helper for detector specs: parses an inline TS source string into the
 * `ParsedFile` shape detectors now consume. Mirrors what the orchestrator
 * does for real files.
 */
export function parseTestFile(filePath: string, src: string): ParsedFile {
  const tsSourceFile = ts.createSourceFile(
    filePath,
    src,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );
  return { tsSourceFile, filePath };
}
