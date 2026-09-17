// @ts-check
'use strict';

/**
 * One `ControlValueAccessor` implementation, in `primitives/forms/`.
 *
 * arch F-19: the repo shipped `KjFormControl` and then five components
 * implemented `writeValue` / `registerOnChange` / `registerOnTouched` /
 * `setDisabledState` by hand anyway — five chances to diverge on touched-state
 * timing, disabled propagation and the `NG_VALUE_ACCESSOR` provider shape, and
 * five places to fix whenever Angular's forms semantics move. They now compose
 * the primitive through `hostDirectives`; this is what stops a sixth appearing.
 *
 * Flagged:
 *   - a `NG_VALUE_ACCESSOR` provider in any `@Directive` / `@Component`
 *     metadata outside `primitives/forms/`;
 *   - `implements ControlValueAccessor` on any class outside it.
 *
 * The fix is always the same shape:
 *
 * ```ts
 * @Directive({ hostDirectives: [KjFormControl] })
 * export class KjThing {
 *   readonly formCtrl = inject(KjFormControl);
 * }
 * ```
 *
 * A wrapper whose real control is a directive in its own view calls
 * `formCtrl.delegateTo(inner)` instead of writing a second accessor.
 */

/** The one directory allowed to provide the token. */
const HOME = 'primitives/forms/';

/** @param {string} filename */
function isHome(filename) {
  return filename.replace(/\\/g, '/').includes(HOME);
}

/**
 * `NG_VALUE_ACCESSOR`, however it was spelled — a bare identifier, or
 * `forms.NG_VALUE_ACCESSOR`.
 * @param {any} node
 */
function namesValueAccessor(node) {
  if (!node) return false;
  if (node.type === 'Identifier') return node.name === 'NG_VALUE_ACCESSOR';
  if (node.type === 'MemberExpression') return namesValueAccessor(node.property);
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid a bespoke ControlValueAccessor outside primitives/forms/; compose KjFormControl instead.',
    },
    schema: [],
    messages: {
      provider:
        'Do not provide NG_VALUE_ACCESSOR here. Compose the shared primitive instead: `hostDirectives: [KjFormControl]` plus `inject(KjFormControl)`. A styled wrapper delegates with `formCtrl.delegateTo(inner)`. (arch F-19)',
      implementsCva:
        '`{{name}}` implements ControlValueAccessor by hand. `KjFormControl` in `primitives/forms/` is the library\'s only accessor — compose it via `hostDirectives` rather than writing a second one. (arch F-19)',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (isHome(filename)) return {};

    return {
      // `providers: [{ provide: NG_VALUE_ACCESSOR, … }]` anywhere in the file.
      Property(node) {
        const key = node.key;
        const named =
          (key.type === 'Identifier' && key.name === 'provide') ||
          (key.type === 'Literal' && key.value === 'provide');
        if (!named) return;
        if (!namesValueAccessor(node.value)) return;
        context.report({ node, messageId: 'provider' });
      },

      ClassDeclaration(node) {
        for (const impl of node.implements ?? []) {
          const expr = impl.expression ?? impl;
          if (expr?.type === 'Identifier' && expr.name === 'ControlValueAccessor') {
            context.report({
              node: impl,
              messageId: 'implementsCva',
              data: { name: node.id?.name ?? 'this class' },
            });
          }
        }
      },
    };
  },
};
