#!/usr/bin/env node
// Adds @doc, @doc-name, @doc-is-main to every public exported @Directive/@Component
// class in packages/core and packages/components. One main per folder; the main
// is the class whose name (after stripping "Kj" prefix, lowercased) matches the
// folder name; otherwise the first exported class in the folder.
//
// Behaviour for an already-tagged class: skip if it already has BOTH @doc AND @doc-name.
// If it has @doc but NOT @doc-name, add the missing @doc-name (and @doc-is-main if applicable).
// Behaviour for @internal classes: skip.
// Idempotent: running twice is a no-op.
//
// Strategy: pure text/regex manipulation — processes each file independently,
// finds JSDoc blocks that immediately precede @Directive/@Component decorators.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SRC_ROOTS = [
  resolve(ROOT, 'packages/core/src'),
  resolve(ROOT, 'packages/components/src'),
];

function walkTs(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTs(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

function shouldSkipFile(fp) {
  const name = basename(fp);
  return (
    name.includes('.spec.') ||
    name === 'index.ts' ||
    name === 'public-api.ts' ||
    name === 'test-setup.ts' ||
    name.endsWith('.example.ts')
  );
}

function folderSlug(fp) {
  return basename(dirname(fp));
}

function normName(s) {
  return s.toLowerCase().replace(/^kj/, '').replace(/[^a-z0-9]/g, '');
}

function isMainCandidate(className, folder) {
  return normName(className) === normName(folder);
}

// Parse class descriptors from file text.
// For each exported @Directive/@Component class, find:
//   - className
//   - whether it has an immediately preceding JSDoc block
//   - whether that JSDoc contains @doc / @doc-name / @internal
//   - the line positions of the JSDoc close (*/) and decorator start
//
// The key constraint: the JSDoc must be IMMEDIATELY before the decorator
// (only blank lines allowed between them, and no other code/class in between).
function parseClasses(text) {
  const lines = text.split('\n');
  const results = [];

  // Find all decorator starts: lines matching @Directive( or @Component(
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('@Directive') && !trimmed.startsWith('@Component')) continue;

    // Find the export class line after the decorator (may span multiple lines)
    let classLineIdx = -1;
    let className = '';
    for (let j = i + 1; j < Math.min(i + 80, lines.length); j++) {
      const m = lines[j].match(/^export\s+(?:abstract\s+)?class\s+(\w+)/);
      if (m) {
        classLineIdx = j;
        className = m[1];
        break;
      }
    }
    if (!className) continue;

    // Search backward from decorator line for JSDoc block.
    // Only traverse blank lines going up; stop at any non-blank non-comment line.
    let jsdocEndLine = -1;
    let hasDoc = false;
    let hasDocName = false;
    let hasInternal = false;
    let jsdocStartLine = -1;

    for (let j = i - 1; j >= 0; j--) {
      const l = lines[j];
      const trimL = l.trim();

      if (trimL === '') continue; // blank line between jsdoc and decorator is OK

      if (trimL.endsWith('*/')) {
        // Found end of a JSDoc or block comment
        jsdocEndLine = j;

        // Scan backward to find the opening /**
        for (let k = j; k >= 0; k--) {
          const tl = lines[k].trim();
          if (tl.startsWith('/**')) {
            jsdocStartLine = k;
            break;
          }
          // Scan tags within the block
          if (tl === '* @doc' || tl === '*@doc') hasDoc = true;
          if (tl.startsWith('* @doc-name') || tl.startsWith('*@doc-name')) hasDocName = true;
          if (tl.startsWith('* @internal') || tl.startsWith('*@internal')) hasInternal = true;
        }
        break;
      }

      // Non-blank line that's not part of a comment block — no JSDoc
      break;
    }

    // Check for single-line /** ... */ JSDoc (e.g., /** Click target. */)
    if (jsdocEndLine >= 0 && jsdocStartLine >= 0) {
      // Scan the whole block for tags (handles both single and multi-line)
      for (let k = jsdocStartLine; k <= jsdocEndLine; k++) {
        const tl = lines[k].trim();
        if (tl === '* @doc' || tl === '*@doc') hasDoc = true;
        if (tl.match(/\* @doc\s*$/)) hasDoc = true;
        if (tl.startsWith('* @doc-name') || tl.startsWith('*@doc-name')) hasDocName = true;
        if (tl.startsWith('* @internal') || tl.startsWith('*@internal')) hasInternal = true;
        // Single-line: /** @doc @doc-name ... */
        if (tl.includes('@doc') && !tl.includes('@doc-')) hasDoc = true;
        if (tl.includes('@doc-name')) hasDocName = true;
        if (tl.includes('@internal')) hasInternal = true;
      }
    }

    results.push({
      className,
      decoratorLine: i,
      classLineIdx,
      jsdocEndLine,
      jsdocStartLine,
      hasDoc,
      hasDocName,
      hasInternal,
    });
  }

  return results;
}

// Insert tag lines just before the closing */ of a JSDoc block.
// Returns the number of lines inserted.
function insertTagsBeforeClose(lines, jsdocEndLine, jsdocStartLine, tags) {
  const closingLine = lines[jsdocEndLine];
  const isSingleLine = jsdocStartLine === jsdocEndLine;

  if (isSingleLine) {
    // /** Some comment. */ -> expand to multi-line
    const match = closingLine.match(/^(\s*)\/\*\*(.*)\*\/\s*$/);
    if (match) {
      const indent = match[1];
      const content = match[2].trim();
      const newLines = [
        `${indent}/**`,
        ...(content ? [`${indent} * ${content}`] : []),
        ...tags.map(t => `${indent} * ${t}`),
        `${indent} */`,
      ];
      lines.splice(jsdocEndLine, 1, ...newLines);
      return newLines.length - 1; // net line delta
    }
  }

  // Multi-line JSDoc: insert before the closing */
  const indentMatch = closingLine.match(/^(\s*)\*\//);
  const indent = indentMatch ? indentMatch[1] : ' ';
  const tagLines = tags.map(t => `${indent}* ${t}`);
  lines.splice(jsdocEndLine, 0, ...tagLines);
  return tagLines.length;
}

// Add a new JSDoc block before the decorator line.
// Returns the number of lines inserted.
function addJsdocBefore(lines, decoratorLine, tags) {
  const decorLine = lines[decoratorLine];
  const indentMatch = decorLine.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';
  const newLines = [
    `${indent}/**`,
    ...tags.map(t => `${indent} * ${t}`),
    `${indent} */`,
  ];
  lines.splice(decoratorLine, 0, ...newLines);
  return newLines.length;
}

let touched = 0;
let skipped = 0;

for (const srcRoot of SRC_ROOTS) {
  const allFiles = walkTs(srcRoot).filter(fp => !shouldSkipFile(fp));

  // Group by folder slug to determine main
  // Step 1: parse all files to get candidate classes grouped by folder
  const folders = new Map(); // slug -> [{fp, ...classInfo}]

  for (const fp of allFiles) {
    const text = readFileSync(fp, 'utf8');
    const classes = parseClasses(text);
    for (const cls of classes) {
      if (cls.hasInternal) continue;
      const slug = folderSlug(fp);
      const list = folders.get(slug) ?? [];
      list.push({ fp, ...cls });
      folders.set(slug, list);
    }
  }

  // Step 2: determine what to do for each class
  // Group by file to process file-by-file
  const fileActions = new Map(); // fp -> [{decoratorLine, jsdocEndLine, jsdocStartLine, tagsToAdd}]

  for (const [slug, list] of folders.entries()) {
    let mainIdx = list.findIndex(({ className }) => isMainCandidate(className, slug));
    if (mainIdx < 0) mainIdx = 0;

    for (let i = 0; i < list.length; i++) {
      const { fp, hasDoc, hasDocName, decoratorLine, jsdocEndLine, jsdocStartLine } = list[i];
      const isMain = i === mainIdx;

      if (hasDoc && hasDocName) {
        skipped++;
        continue;
      }

      let tagsToAdd;
      if (hasDoc && !hasDocName) {
        tagsToAdd = [
          `@doc-name ${slug}`,
          ...(isMain ? ['@doc-is-main'] : []),
        ];
      } else {
        tagsToAdd = [
          '@doc',
          `@doc-name ${slug}`,
          ...(isMain ? ['@doc-is-main'] : []),
        ];
      }

      const actions = fileActions.get(fp) ?? [];
      actions.push({ decoratorLine, jsdocEndLine, jsdocStartLine, tagsToAdd });
      fileActions.set(fp, actions);
      touched++;
    }
  }

  // Step 3: apply changes to files, processing from bottom to top within each file
  for (const [fp, actions] of fileActions.entries()) {
    const text = readFileSync(fp, 'utf8');
    const lines = text.split('\n');

    // Sort descending by the insertion point line so we don't shift earlier indices
    actions.sort((a, b) => {
      const aLine = a.jsdocEndLine >= 0 ? a.jsdocEndLine : a.decoratorLine;
      const bLine = b.jsdocEndLine >= 0 ? b.jsdocEndLine : b.decoratorLine;
      return bLine - aLine;
    });

    for (const { decoratorLine, jsdocEndLine, jsdocStartLine, tagsToAdd } of actions) {
      if (jsdocEndLine >= 0) {
        insertTagsBeforeClose(lines, jsdocEndLine, jsdocStartLine, tagsToAdd);
      } else {
        addJsdocBefore(lines, decoratorLine, tagsToAdd);
      }
    }

    writeFileSync(fp, lines.join('\n'), 'utf8');
  }
}

console.log(`migrated ${touched} class JSDocs (skipped ${skipped} already tagged)`);
