// @ts-check
'use strict';

/**
 * Every boolean signal `input()` must coerce with a `transform`.
 *
 * Angular binds a bare attribute to the empty string: `<button kjButton
 * kjDisabled>` sets `kjDisabled` to `''`, which is falsy, so the author's
 * stated intent is a silent no-op. The inverse bites too — `kjShowSummary
 * ="false"` sets the *string* `"false"`, which is truthy, so an input that
 * defaults to `true` cannot be switched off by attribute at all. Only
 * `booleanAttribute` maps both forms the way HTML boolean attributes read.
 *
 * The batch-6 review found 29 of these in one partition alone and a real
 * accessibility defect behind several of them (`<div kjDivider kjStructural>`
 * stayed `aria-hidden` instead of reaching `role="separator"`). This rule
 * stops the count growing back.
 *
 * What counts as boolean, deliberately narrowly:
 *   - an explicit `boolean` type argument — `input<boolean>(…)`,
 *     `input.required<boolean>()`;
 *   - a property annotated `InputSignal<boolean>` / `InputSignalWithTransform`
 *     whose *value* type is `boolean`;
 *   - a `true` / `false` first argument with no type argument saying otherwise.
 *
 * A union is never flagged. `readonly number[] | 'auto' | false` and
 * `boolean | 'auto'` are tri-states whose third state `booleanAttribute` would
 * destroy; they need a hand-written transform whose shape only the author
 * knows, so the rule leaves them to TSDoc and review.
 *
 * `model()` is exempt, and cannot be otherwise: Angular's `ModelOptions` is
 * `{ alias, debugName }` — it takes no `transform` (verified against the
 * installed 22.x typings). A two-way boolean therefore has to be bound,
 * never written bare. `rules/code_style.md` states that convention.
 *
 * Any transform satisfies the rule, not just `booleanAttribute`: several
 * inputs in this repo are genuinely tri-state and use
 * `v == null ? undefined : booleanAttribute(v)` so an absent input keeps
 * meaning "auto" (`KjLink.kjExternal`, `KjInputGroupAddon.kjAriaHidden`).
 */

/** `input(...)` / `input.required(...)` → the call node, else null. */
function inputCall(node) {
  if (!node || node.type !== 'CallExpression') return null;
  const callee = node.callee;
  if (callee.type === 'Identifier' && callee.name === 'input') return node;
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'input' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'required'
  ) {
    return node;
  }
  return null;
}

/** The explicit type arguments of the call, across ESTree/TS-ESLint spellings. */
function typeArgumentsOf(node) {
  const params = node.typeArguments || node.typeParameters;
  return (params && params.params) || null;
}

function isBooleanKeyword(t) {
  return !!t && t.type === 'TSBooleanKeyword';
}

/**
 * `InputSignal<boolean>` / `InputSignalWithTransform<boolean, …>` on the
 * property itself — the shape used when a directive publishes its input type.
 */
function annotationValueType(node) {
  const ann = node.typeAnnotation && node.typeAnnotation.typeAnnotation;
  if (!ann || ann.type !== 'TSTypeReference') return null;
  const name = ann.typeName;
  if (name.type !== 'Identifier') return null;
  if (name.name !== 'InputSignal' && name.name !== 'InputSignalWithTransform') return null;
  const args = (ann.typeArguments || ann.typeParameters || {}).params;
  return (args && args[0]) || null;
}

/** Whether the options object literal passed to the call declares `transform`. */
function hasTransform(node) {
  for (const arg of node.arguments) {
    if (!arg || arg.type !== 'ObjectExpression') continue;
    for (const prop of arg.properties) {
      if (prop.type === 'SpreadElement') {
        // A spread could carry `transform`; not statically knowable, so the
        // call is treated as configured rather than reported wrongly.
        return true;
      }
      if (prop.computed) continue;
      const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
      if (key === 'transform') return true;
    }
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a coercing transform on every boolean signal input, so the bare-attribute and attr="false" forms both work.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingTransform:
        "Boolean input '{{name}}' has no transform, so a bare `{{name}}` attribute binds '' (falsy) and `{{name}}=\"false\"` binds a truthy string. Add `{ transform: booleanAttribute }` from @angular/core, or a custom transform if the input is tri-state.",
    },
  },

  create(context) {
    const allow = new Set((context.options[0] || {}).allow || []);

    return {
      PropertyDefinition(node) {
        const call = inputCall(node.value);
        if (!call) return;
        if (node.key.type !== 'Identifier' && node.key.type !== 'Literal') return;
        const name = node.key.type === 'Identifier' ? node.key.name : String(node.key.value);
        if (allow.has(name)) return;

        const typeArgs = typeArgumentsOf(call);
        let boolean;
        if (typeArgs && typeArgs.length > 0) {
          // An explicit type argument is the author's own statement of the
          // value type; a union among them is a tri-state, never flagged.
          boolean = isBooleanKeyword(typeArgs[0]);
        } else {
          const annotated = annotationValueType(node);
          if (annotated) {
            boolean = isBooleanKeyword(annotated);
          } else {
            const first = call.arguments[0];
            boolean =
              !!first &&
              first.type === 'Literal' &&
              typeof first.value === 'boolean';
          }
        }
        if (!boolean) return;
        if (hasTransform(call)) return;

        context.report({ node, messageId: 'missingTransform', data: { name } });
      },
    };
  },
};
