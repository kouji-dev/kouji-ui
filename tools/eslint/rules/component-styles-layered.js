// @ts-check
'use strict';

/**
 * The cascade contract, made checkable.
 *
 * Component CSS in this library ships as **global** rules wrapped in
 * `@layer kj.component` under the `.kj-` namespace — see `rules/code_style.md`
 * ("Encapsulation"). Two things have to hold for that to work, and neither was
 * enforced:
 *
 * 1. **Styles live in a `.css` file, never inline.** `stylelint.config.mjs`
 *    (`kouji/layered`, `kouji/known-tokens`) walks `packages/*\/src/**\/*.css`.
 *    A `styles: [...]` array is invisible to it, so an inline block can drop
 *    out of the layer or reference an undeclared token with nothing noticing.
 *
 * 2. **A component that declares styles uses `ViewEncapsulation.None`.**
 *    Emulated encapsulation rewrites every selector with an `_ngcontent`
 *    attribute, which silently stops the rule from reaching projected content,
 *    a portalled overlay panel, or anything a headless core directive renders —
 *    the exact composition this library is built on.
 *
 * The rule says nothing about the `@layer` wrapper itself; stylelint owns that.
 * Together the two cover the whole contract.
 */

/** Finds `@Component({...})` on a class and returns the object literal. */
function componentMetadata(node) {
  const decorators = node.decorators || [];
  for (const decorator of decorators) {
    const expr = decorator.expression;
    if (!expr || expr.type !== 'CallExpression') continue;
    if (expr.callee.type !== 'Identifier' || expr.callee.name !== 'Component') continue;
    const arg = expr.arguments[0];
    if (arg && arg.type === 'ObjectExpression') return arg;
  }
  return null;
}

function propertyNamed(objectExpression, name) {
  for (const prop of objectExpression.properties) {
    if (prop.type !== 'Property' || prop.computed) continue;
    const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
    if (key === name) return prop;
  }
  return null;
}

/** `encapsulation: ViewEncapsulation.None` — as a member expression or a bare identifier. */
function isEncapsulationNone(prop) {
  if (!prop) return false;
  const value = prop.value;
  if (
    value.type === 'MemberExpression' &&
    !value.computed &&
    value.property.type === 'Identifier'
  ) {
    return value.property.name === 'None';
  }
  return value.type === 'Identifier' && value.name === 'None';
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Component styles ship as global @layer kj.component CSS: keep them in a .css file and pair them with ViewEncapsulation.None.',
    },
    schema: [],
    messages: {
      inlineStyles:
        "Inline `styles` escape the stylesheet lint. Move this block to a sibling .css file and reference it with `styleUrl`, so `pnpm lint:css` can enforce the `@layer kj.component` wrapper and the token contract.",
      needsNone:
        'A component that declares `{{key}}` must also declare `encapsulation: ViewEncapsulation.None`. Emulated encapsulation scopes every selector with an `_ngcontent` attribute, which stops the rule reaching projected content and portalled overlay panels.',
    },
  },

  create(context) {
    return {
      ClassDeclaration(node) {
        const metadata = componentMetadata(node);
        if (!metadata) return;

        const inline = propertyNamed(metadata, 'styles');
        if (inline) context.report({ node: inline, messageId: 'inlineStyles' });

        const styleUrl = propertyNamed(metadata, 'styleUrl') || propertyNamed(metadata, 'styleUrls');
        if (!styleUrl) return;

        const encapsulation = propertyNamed(metadata, 'encapsulation');
        if (isEncapsulationNone(encapsulation)) return;

        const key =
          styleUrl.key.type === 'Identifier' ? styleUrl.key.name : String(styleUrl.key.value);
        context.report({
          node: encapsulation || styleUrl,
          messageId: 'needsNone',
          data: { key },
        });
      },
    };
  },
};
