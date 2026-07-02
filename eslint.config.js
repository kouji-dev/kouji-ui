// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    // Test fixtures are synthetic source files used by extractor tests —
    // they're test data, not real Angular directives, so the kj/app prefix
    // rule (and other source rules) don't apply.
    ignores: ['**/tests/fixtures/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'kj',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'kj',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['apps/docs/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: ['kj', 'app'],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['kj', 'app'],
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    // The Angular 22 migration set `ChangeDetectionStrategy.Eager` on spec test-host
    // components, doc examples, and docs-app components to preserve their pre-migration
    // (non-OnPush) behavior. None are shipped library primitives — converting them to
    // OnPush is a separate, deliberate follow-up, not a side effect of a dependency bump.
    files: ['**/*.spec.ts', '**/*.example.ts', 'apps/docs/**/*.ts'],
    rules: {
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  }
);
