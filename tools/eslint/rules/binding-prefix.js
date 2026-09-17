// @ts-check
'use strict';

/**
 * Every `input()` / `output()` / `model()` in the headless package must expose a
 * `kj`-prefixed name to templates — either by being named `kjSomething`, or by
 * passing an explicit `alias: 'kjSomething'`.
 *
 * `rules/code_style.md` states the convention; nothing enforced it, and the
 * review found the core package drifting one binding at a time. The styled
 * `@kouji-ui/components` package deliberately follows the opposite convention
 * (bare names on `<kj-*>` elements, which are already namespaced), so this rule
 * is scoped to core by `eslint.config.js`, not by anything here.
 *
 * Options:
 *   { prefix?: string, allow?: string[] }
 *   - `prefix` — required binding prefix. Default `'kj'`.
 *   - `allow`  — property names exempted, each with a reason in the config.
 */

const BINDING_FACTORIES = new Set(['input', 'output', 'model']);

/** `input(...)`, `input.required(...)`, `model.required(...)` → 'input' | 'model' | 'output'. */
function bindingFactoryName(node) {
  if (!node || node.type !== 'CallExpression') return null;
  const callee = node.callee;
  if (callee.type === 'Identifier' && BINDING_FACTORIES.has(callee.name)) {
    return callee.name;
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    BINDING_FACTORIES.has(callee.object.name) &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'required'
  ) {
    return callee.object.name;
  }
  return null;
}

/** The string literal passed as `alias` in the options object, when there is one. */
function aliasOf(node) {
  for (const arg of node.arguments) {
    if (!arg || arg.type !== 'ObjectExpression') continue;
    for (const prop of arg.properties) {
      if (prop.type !== 'Property' || prop.computed) continue;
      const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
      if (key !== 'alias') continue;
      if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
        return prop.value.value;
      }
      // A non-literal alias cannot be checked statically; treat it as opaque.
      return undefined;
    }
  }
  return null;
}

function hasPrefix(name, prefix) {
  if (!name.startsWith(prefix)) return false;
  const rest = name.slice(prefix.length);
  // `kj` alone, or `kjthing`, is not the convention: what follows the prefix
  // starts a new word, so anything but a lowercase letter (`kjOpen`, `kj12Hour`).
  return rest.length > 0 && !/^[a-z]/.test(rest);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a kj-prefixed public name on every signal input, output and model in the headless package.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          prefix: { type: 'string' },
          allow: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unprefixed:
        "'{{name}}' is a public {{kind}} with no '{{prefix}}' prefix. Rename it '{{suggestion}}', or keep the property name and pass the binding option alias: '{{suggestion}}'.",
      aliasUnprefixed:
        "The alias '{{alias}}' on {{kind}} '{{name}}' has no '{{prefix}}' prefix. The alias is the name templates bind to.",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const prefix = options.prefix || 'kj';
    const allow = new Set(options.allow || []);

    return {
      PropertyDefinition(node) {
        const kind = bindingFactoryName(node.value);
        if (!kind) return;
        if (node.key.type !== 'Identifier' && node.key.type !== 'Literal') return;
        const name = node.key.type === 'Identifier' ? node.key.name : String(node.key.value);
        if (allow.has(name)) return;

        const alias = aliasOf(node.value);
        if (alias === undefined) return; // computed alias — not statically checkable
        const suggestion = prefix + name[0].toUpperCase() + name.slice(1);

        if (alias !== null) {
          if (!hasPrefix(alias, prefix)) {
            context.report({
              node,
              messageId: 'aliasUnprefixed',
              data: { alias, kind, name, prefix },
            });
          }
          return;
        }

        if (!hasPrefix(name, prefix)) {
          context.report({
            node,
            messageId: 'unprefixed',
            data: { name, kind, prefix, suggestion },
          });
        }
      },
    };
  },
};
