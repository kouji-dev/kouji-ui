/**
 * kouji-ui stylelint plugin — the three CSS invariants the review batches
 * made machine-enforced:
 *
 *   kouji/layered       every rule-bearing stylesheet under packages/*\/src
 *                       wraps its rules in a `@layer kj.*` block. Unlayered
 *                       author CSS beats every layered rule on the page, so a
 *                       sheet that forgets the wrapper cannot be overridden by
 *                       a consumer's own layered CSS or by a theme.
 *
 *   kouji/known-tokens  every `var(--kj-…)` chain resolves: the token is
 *                       declared by @kouji-ui/themes, by the same stylesheet
 *                       (a `--kj-<component>-*` knob), by a host style binding
 *                       in the package's TypeScript, or the chain ends in a
 *                       literal fallback. A chain whose innermost fallback is
 *                       an undeclared token computes to the guaranteed-invalid
 *                       value and the whole declaration silently disappears —
 *                       two focus rings shipped that way.
 *
 *   kouji/namespaced    every selector is anchored by a kouji identifier —
 *                       a `.kj-*` class, a `kj-*` element, a `[data-*]` hook,
 *                       `:root`, `:host` or `::backdrop`. `ViewEncapsulation.None`
 *                       is the permanent architecture here (see
 *                       rules/code_style.md), so every one of these rules is a
 *                       GLOBAL rule in the consumer's document: a bare `.card`
 *                       or `button` selector would restyle their markup. The
 *                       `.kj-` namespace is what replaces encapsulation, and
 *                       this is the half of that contract a CSS linter can see.
 *
 * Wired up by `stylelint.config.mjs` at the repo root; run `pnpm lint:css`.
 * `packages/themes/src/lint-css.spec.ts` exercises all three.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import postcss from 'postcss';

const { createPlugin, utils } = stylelint;
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const THEMES_SRC = resolve(REPO_ROOT, 'packages', 'themes', 'src');

// ─── kouji/layered ────────────────────────────────────────────────────────

const layeredName = 'kouji/layered';
const layeredMessages = utils.ruleMessages(layeredName, {
  unlayered: (selector) =>
    `Rule "${selector}" is outside a @layer block — wrap the stylesheet in \`@layer kj.component { … }\``,
  unknownLayer: (name) =>
    `Layer "${name}" is not pinned by packages/themes/src/layers.css — its cascade position depends on load order`,
});

/** Layer names pinned by the published order statement. */
export function pinnedLayers(layersCss = readFileSync(resolve(THEMES_SRC, 'layers.css'), 'utf8')) {
  const out = new Set();
  postcss.parse(layersCss).walkAtRules('layer', (at) => {
    if (at.nodes) return; // a block, not the order statement
    for (const name of at.params.split(',')) out.add(name.trim());
  });
  return out;
}

/** True when `node` sits inside a `@layer name { … }` block (any depth). */
function insideLayerBlock(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'atrule' && p.name === 'layer' && p.nodes) return true;
  }
  return false;
}

const layeredRule = (primary, secondary) => (root, result) => {
  if (!primary) return;
  const pinned = secondary?.layers ? new Set(secondary.layers) : pinnedLayers();
  root.walkRules((rule) => {
    if (insideLayerBlock(rule)) return;
    // Keyframe steps (`from`, `to`, `50%`) are not cascade rules; keyframes
    // are legitimately declared outside any layer.
    for (let p = rule.parent; p; p = p.parent) {
      if (p.type === 'atrule' && /keyframes$/.test(p.name)) return;
    }
    utils.report({ ruleName: layeredName, result, node: rule, message: layeredMessages.unlayered(rule.selector) });
  });
  root.walkAtRules('layer', (at) => {
    const names = at.nodes ? [at.params.trim()] : at.params.split(',').map((s) => s.trim());
    for (const name of names) {
      if (!name) continue;
      // `@layer kj.component.sub` pins under kj.component; only check the head.
      if (!pinned.has(name)) {
        utils.report({ ruleName: layeredName, result, node: at, message: layeredMessages.unknownLayer(name) });
      }
    }
  });
};
layeredRule.ruleName = layeredName;
layeredRule.messages = layeredMessages;
layeredRule.meta = { url: 'https://github.com/kouji-dev/kouji-ui/blob/main/tools/stylelint/index.mjs' };

// ─── kouji/known-tokens ───────────────────────────────────────────────────

const tokensName = 'kouji/known-tokens';
const tokensMessages = utils.ruleMessages(tokensName, {
  unresolved: (chain, name) =>
    `"${chain}" never resolves: --kj- token "${name}" is declared nowhere (themes, this stylesheet, a host [style.${name}] binding) and the chain has no literal fallback`,
});

function walkCss(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walkCss(full, out);
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

let themeTokenCache;
/** Every `--kj-*` custom property @kouji-ui/themes declares (base, density, layers, every theme). */
export function themeTokens() {
  if (themeTokenCache) return themeTokenCache;
  const out = new Set();
  for (const file of walkCss(THEMES_SRC)) {
    postcss.parse(readFileSync(file, 'utf8')).walkDecls((d) => {
      if (d.prop.startsWith('--kj-')) out.add(d.prop);
    });
  }
  themeTokenCache = out;
  return out;
}

let runtimeCache;
/**
 * Tokens a directive writes from TypeScript: `[style.--kj-x]` host bindings
 * and `setProperty('--kj-x', …)` calls anywhere under packages/<pkg>/src. They
 * never appear in a stylesheet yet every element the rule matches carries
 * them (a core directive such as `[kjToast]` sets `--kj-toast-index`, and
 * the components package styles it).
 */
export function runtimeTokens(packagesDir = resolve(REPO_ROOT, 'packages')) {
  if (runtimeCache) return runtimeCache;
  const out = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        const source = readFileSync(full, 'utf8');
        for (const m of source.matchAll(/\[style\.(--kj-[a-z0-9-]+)\]/g)) out.add(m[1]);
        for (const m of source.matchAll(/setProperty\(\s*['"`](--kj-[a-z0-9-]+)['"`]/g)) out.add(m[1]);
      }
    }
  };
  if (existsSync(packagesDir)) {
    for (const pkg of readdirSync(packagesDir, { withFileTypes: true })) {
      const src = resolve(packagesDir, pkg.name, 'src');
      if (pkg.isDirectory() && existsSync(src)) walk(src);
    }
  }
  runtimeCache = out;
  return out;
}

/** Every top-level `var(...)` expression in a value, with its argument text. */
export function varExpressions(value) {
  const out = [];
  const re = /var\(/g;
  let m;
  while ((m = re.exec(value))) {
    let depth = 1;
    let k = m.index + 4;
    for (; k < value.length && depth > 0; k++) {
      if (value[k] === '(') depth++;
      else if (value[k] === ')') depth--;
    }
    out.push({ text: value.slice(m.index, k), args: value.slice(m.index + 4, k - 1) });
    // Continue after the closing paren so a var() nested in a fallback is
    // reached through the chain, not reported a second time on its own.
    re.lastIndex = k;
  }
  return out;
}

function splitVarArgs(args) {
  let depth = 0;
  for (let k = 0; k < args.length; k++) {
    if (args[k] === '(') depth++;
    else if (args[k] === ')') depth--;
    else if (args[k] === ',' && depth === 0) return [args.slice(0, k).trim(), args.slice(k + 1).trim()];
  }
  return [args.trim(), undefined];
}

/**
 * Follows a `var()` chain: returns the first `--kj-` name that is neither
 * declared nor backed by a literal fallback, or undefined when the chain is
 * sound. Non-`--kj-` names (consumer knobs like `--my-brand`) are ignored
 * because the library cannot know what a host declares.
 */
export function unresolvedToken(varText, declared) {
  const [name, fallback] = splitVarArgs(varText.slice(4, -1));
  if (!name.startsWith('--kj-')) return undefined;
  if (declared.has(name)) return undefined;
  if (fallback === undefined) return name;
  const inner = varExpressions(fallback);
  // A fallback that is exactly one var() keeps the chain going; anything
  // else (a literal, or a literal mixing var()s) terminates it.
  if (inner.length === 1 && inner[0].text === fallback) return unresolvedToken(fallback, declared);
  return undefined;
}

const tokensRule = (primary, secondary) => (root, result) => {
  if (!primary) return;
  const declared = new Set(secondary?.tokens ?? themeTokens());
  for (const extra of secondary?.extraTokens ?? []) declared.add(extra);
  if (!secondary?.tokens) for (const t of runtimeTokens()) declared.add(t);
  // Knobs the stylesheet declares itself (`--kj-button-bg: …`) count.
  root.walkDecls((d) => {
    if (d.prop.startsWith('--kj-')) declared.add(d.prop);
  });
  root.walkDecls((d) => {
    if (d.prop.startsWith('--') && !d.prop.startsWith('--kj-')) return;
    for (const v of varExpressions(d.value)) {
      const missing = unresolvedToken(v.text, declared);
      if (missing) {
        utils.report({ ruleName: tokensName, result, node: d, message: tokensMessages.unresolved(v.text, missing) });
      }
    }
  });
};
tokensRule.ruleName = tokensName;
tokensRule.messages = tokensMessages;
tokensRule.meta = { url: 'https://github.com/kouji-dev/kouji-ui/blob/main/tools/stylelint/index.mjs' };

// ─── kouji/namespaced ─────────────────────────────────────────────────────

const namespacedName = 'kouji/namespaced';
const namespacedMessages = utils.ruleMessages(namespacedName, {
  unnamespaced: (selector) =>
    `Selector "${selector}" is not anchored by a kouji identifier — component CSS ships unencapsulated, so this rule would apply to the consumer's own markup. Anchor it on a \`.kj-*\` class, a \`kj-*\` element, a \`[data-*]\` hook, \`:root\`, \`:host\` or \`::backdrop\`.`,
});

/**
 * What counts as anchored. `.kj-card`, `kj-field`, `[data-theme="dark"]`,
 * `:root`, `:host` and `::backdrop` all name something the library owns;
 * `[dir="rtl"] .kj-chat` qualifies through its `.kj-` half, and a descendant
 * such as `.kj-prose h2` through its container.
 */
const ANCHORED = /\.kj-|kj-[a-z0-9-]+|\[data-|:root|:host|::backdrop/;

const namespacedRule = (primary) => (root, result) => {
  if (!primary) return;
  root.walkRules((rule) => {
    // Keyframe steps (`from`, `to`, `50%`) select nothing in the document.
    for (let p = rule.parent; p; p = p.parent) {
      if (p.type === 'atrule' && /keyframes$/.test(p.name)) return;
    }
    for (const selector of rule.selectors) {
      const s = selector.trim();
      if (!s || ANCHORED.test(s)) continue;
      utils.report({
        ruleName: namespacedName,
        result,
        node: rule,
        message: namespacedMessages.unnamespaced(s),
      });
    }
  });
};
namespacedRule.ruleName = namespacedName;
namespacedRule.messages = namespacedMessages;
namespacedRule.meta = { url: 'https://github.com/kouji-dev/kouji-ui/blob/main/tools/stylelint/index.mjs' };

export default [
  createPlugin(layeredName, layeredRule),
  createPlugin(tokensName, tokensRule),
  createPlugin(namespacedName, namespacedRule),
];
