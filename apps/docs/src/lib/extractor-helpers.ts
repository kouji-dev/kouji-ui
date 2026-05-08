// apps/docs/src/lib/extractor-helpers.ts
// Shared helpers extracted from docs-extractor.ts for use by detectors.

import { tsquery } from '@phenomnomnominal/tsquery';
import ts from 'typescript';
import type { SourcePkg, InputDef, OutputDef } from './docs-extractor.types';

// ── ts-query selectors ────────────────────────────────────────────────────────

/** Properties initialized with input(), input.required(), or model() signals */
const SIGNAL_INPUT_SELECTOR = [
  'PropertyDeclaration:has(CallExpression > Identifier[text="input"])',
  'PropertyDeclaration:has(CallExpression > PropertyAccessExpression:has(Identifier[text="required"]))',
  'PropertyDeclaration:has(CallExpression > Identifier[text="model"])',
].join(', ');

/** Properties initialized with output() — emits the read-only event signal. */
const OUTPUT_SELECTOR =
  'PropertyDeclaration:has(CallExpression > Identifier[text="output"])';

// ── JSDoc helpers ─────────────────────────────────────────────────────────────

/** True when the node carries a JSDoc `@internal` tag. */
function hasInternalTag(node: ts.Node): boolean {
  return ts.getJSDocTags(node).some(t => t.tagName.text === 'internal');
}

export function getJsDocDescription(node: ts.Node): string {
  const tags = tsquery<ts.JSDoc>(node, 'JSDoc');
  if (!tags.length) return '';
  const comment = tags[0].comment;
  if (!comment) return '';
  // Preserve newlines so markdown (paragraphs, fenced code blocks) renders correctly.
  if (typeof comment === 'string') return comment.replace(/[ \t]+\n/g, '\n').trim();
  // NodeArray<JSDocComment>
  return comment
    .map(c => ('text' in c ? (c as ts.JSDocText).text : ''))
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export function getRequired(node: ts.Node): boolean {
  const tags = tsquery<ts.JSDocTag>(node, 'JSDocTag[tagName.text="required"]');
  return tags.length > 0;
}

// ── Directive decorator metadata extraction ───────────────────────────────────

export function getDecoratorArg(cls: ts.ClassDeclaration): string {
  // Match @Directive(...) OR @Component(...).
  const callExpr = tsquery<ts.CallExpression>(
    cls,
    'Decorator > CallExpression:has(Identifier[text="Directive"]), Decorator > CallExpression:has(Identifier[text="Component"])'
  );
  return callExpr[0]?.arguments[0]?.getText() ?? '';
}

export function extractDecoratorProp(decoratorArg: string, prop: string): string | undefined {
  return decoratorArg.match(new RegExp(`${prop}:\\s*['"\`]([^'"\`]+)['"\`]`))?.[1];
}

/** Extracts bracket-enclosed content with proper depth tracking (handles nested `[]`). */
export function extractBracketContent(text: string, startIdx: number): string {
  let depth = 0;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') { depth--; if (depth === 0) return text.slice(startIdx + 1, i); }
  }
  return '';
}

/**
 * Extracts inputs exposed via hostDirectives with their public kj-prefixed aliases.
 * Uses depth-tracking bracket extraction to handle nested arrays like `inputs: ['x']`
 * inside `hostDirectives: [{ directive: X, inputs: [...] }]`.
 */
export function extractHostDirectiveInputs(decoratorArg: string): InputDef[] {
  const results: InputDef[] = [];

  // Find `hostDirectives:` then extract its array with depth tracking
  const hdKeyIdx = decoratorArg.indexOf('hostDirectives');
  if (hdKeyIdx === -1) return results;

  const bracketStart = decoratorArg.indexOf('[', hdKeyIdx);
  if (bracketStart === -1) return results;

  const hdContent = extractBracketContent(decoratorArg, bracketStart);

  // Find each `inputs: [...]` array inside the hostDirectives entries
  let searchPos = 0;
  while (searchPos < hdContent.length) {
    const inputsIdx = hdContent.indexOf('inputs:', searchPos);
    if (inputsIdx === -1) break;

    const arrStart = hdContent.indexOf('[', inputsIdx);
    if (arrStart === -1) break;

    const inputsList = extractBracketContent(hdContent, arrStart);
    searchPos = arrStart + inputsList.length + 2; // advance past this array

    // Find the `directive: ClassName` for the object literal that owns this
    // `inputs:` array. The matching `directive:` is the last one before the
    // inputs index inside the same object.
    const before = hdContent.slice(0, inputsIdx);
    const dirMatches = [...before.matchAll(/directive\s*:\s*(\w+)/g)];
    const sourceDirective = dirMatches.length ? dirMatches[dirMatches.length - 1][1] : '';

    // Parse each quoted entry: 'originalName: aliasName' or 'name'
    const entryRe = /['"`]([^'"`]+)['"`]/g;
    for (const entry of inputsList.matchAll(entryRe)) {
      const raw = entry[1].trim();
      const parts = raw.split(':').map(s => s.trim());
      const alias = parts[1] ?? parts[0];
      const original = parts[0];

      // Only expose inputs aliased with the kj prefix
      if (!alias || !alias.startsWith('kj')) continue;

      results.push({
        name: alias,
        // Placeholder — resolved against `ownInputsByClass` after every file
        // has been processed. See `resolveHostDirectiveInputTypes`.
        type: 'unknown',
        required: false,
        isModel: false,
        description: sourceDirective
          ? `Forwarded from \`${sourceDirective}.${original}\` via \`hostDirectives\`.`
          : `Forwarded from \`${original}\` via \`hostDirectives\`.`,
        sourceDirective,
      });
    }
  }
  return results;
}

// ── Signal input / output extraction ─────────────────────────────────────────

export function extractInputs(
  cls: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
): InputDef[] {
  const props = tsquery<ts.PropertyDeclaration>(cls, SIGNAL_INPUT_SELECTOR);
  const results: InputDef[] = [];

  for (const prop of props) {
    const name = (prop.name as ts.Identifier).text;
    if (name.startsWith('_')) continue;

    if (hasInternalTag(prop)) continue;
    const description = getJsDocDescription(prop);

    const initText = prop.initializer?.getText(sourceFile) ?? '';
    // Match both `model(…)` and `model<T>(…)` shapes.
    const isModel = /^model\s*[<(]/.test(initText);
    const required =
      /^input(?:\s*<[^>]+>)?\s*\.required\s*[<(]/.test(initText) ||
      tsquery(prop, 'CallExpression > PropertyAccessExpression:has(Identifier[text="required"])').length > 0;

    let type = prop.type?.getText(sourceFile) ?? '';
    if (type) {
      type = unwrapSignalType(type);
    } else {
      type =
        initText.match(/(?:input(?:\.required)?|model)<([^>]+)>/)?.[1] ??
        inferTypeFromCallArg(prop.initializer) ??
        'unknown';
    }

    const defaultValue = required ? undefined : extractLiteralDefault(prop, sourceFile);

    results.push({ name, type, required, isModel, description, defaultValue });
  }

  return results;
}

export function extractOutputs(
  cls: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
): OutputDef[] {
  const props = tsquery<ts.PropertyDeclaration>(cls, OUTPUT_SELECTOR);
  const results: OutputDef[] = [];

  for (const prop of props) {
    const name = (prop.name as ts.Identifier).text;
    if (name.startsWith('_')) continue;
    if (hasInternalTag(prop)) continue;

    const description = getJsDocDescription(prop);
    const initText = prop.initializer?.getText(sourceFile) ?? '';

    let type = prop.type?.getText(sourceFile) ?? '';
    if (type) {
      type = unwrapSignalType(type);
    } else {
      type = initText.match(/output<([^>]+)>/)?.[1] ?? 'void';
    }

    results.push({ name, type, description });
  }

  return results;
}

/**
 * For an input/model/output property whose type isn't annotated and whose
 * call site has no generic argument (e.g. `input(false)`), infer the type
 * from the literal kind of the first call argument. Covers ~95% of the
 * common cases without needing a full TypeChecker.
 */
function inferTypeFromCallArg(init: ts.Expression | undefined): string | undefined {
  if (!init || !ts.isCallExpression(init)) return undefined;
  const arg = init.arguments[0];
  if (!arg) return undefined;
  switch (arg.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return 'string';
    case ts.SyntaxKind.NumericLiteral:
      return 'number';
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
      return 'boolean';
    case ts.SyntaxKind.NullKeyword:
      return 'null';
    case ts.SyntaxKind.ArrayLiteralExpression:
      return 'unknown[]';
    case ts.SyntaxKind.ObjectLiteralExpression:
      return 'object';
    default:
      return undefined;
  }
}

// ── Literal default & signal-type unwrap ──────────────────────────────────────

export function extractLiteralDefault(
  prop: ts.PropertyDeclaration,
  sourceFile: ts.SourceFile,
): string | undefined {
  const init = prop.initializer;
  if (!init || !ts.isCallExpression(init) || init.arguments.length === 0) {
    return undefined;
  }
  const arg = init.arguments[0];
  switch (arg.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
      return arg.getText(sourceFile);
    case ts.SyntaxKind.Identifier:
      return (arg as ts.Identifier).text === 'undefined' ? 'undefined' : undefined;
    default:
      return undefined;
  }
}

export function unwrapSignalType(type: string): string {
  const cleaned = type.replace(/import\("[^"]+"\)\./g, '');
  const m = cleaned.match(/^\s*(?:InputSignal(?:WithTransform)?|ModelSignal|OutputEmitterRef|OutputRef)\s*<\s*([^,>]+(?:<[^>]*>)?)/);
  return m ? m[1].trim() : cleaned;
}

// ── Category tag ──────────────────────────────────────────────────────────────

export function readCategoryTag(node: ts.Node, pkg: SourcePkg): string[] {
  const tag = ts.getJSDocTags(node).find(t => t.tagName.text === 'category');
  if (!tag) return [];
  const raw = typeof tag.comment === 'string'
    ? tag.comment
    : ts.getTextOfJSDocComment(tag.comment) ?? '';
  const segments = raw.trim().split('/').map(s => s.trim()).filter(Boolean);
  if (!segments.length) return [];
  const prefix = pkg === 'core' ? 'Core' : 'Library';
  // If the tag already starts with the package label (any casing), normalise and return as-is.
  if (segments[0].toLowerCase() === prefix.toLowerCase()) {
    segments[0] = prefix;
    return segments;
  }
  return [prefix, ...segments];
}
