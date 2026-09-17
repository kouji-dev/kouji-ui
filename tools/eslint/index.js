// @ts-check
'use strict';

/**
 * Local ESLint rules for this repo.
 *
 * `rules/*.md` describes conventions CI could not see — the review found six
 * of the seven files drifting from the code they describe, one binding and one
 * stylesheet at a time. These rules move the mechanically checkable clauses
 * into the build. Everything here is repo-specific; nothing is worth
 * publishing.
 *
 * Wired up in `eslint.config.js`, which also owns the file scoping (core-only
 * for the binding prefix, library sources only for the style contract) and the
 * documented exemption lists.
 */
module.exports = {
  meta: { name: 'eslint-plugin-kouji-local', version: '0.0.0' },
  rules: {
    'binding-prefix': require('./rules/binding-prefix.js'),
    'boolean-input-transform': require('./rules/boolean-input-transform.js'),
    'component-styles-layered': require('./rules/component-styles-layered.js'),
    'no-bespoke-value-accessor': require('./rules/no-bespoke-value-accessor.js'),
  },
};
