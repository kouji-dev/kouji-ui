// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const kouji = require('./tools/eslint/index.js');

/**
 * Files inside a package's src tree that are not shipped library code: specs,
 * documentation examples and playgrounds. They render in a browser test or a
 * docs page, so the SSR and cascade contracts below do not apply to them.
 */
const NON_LIBRARY = [
  '**/*.spec.ts',
  '**/_examples/**',
  '**/*.example.ts',
  '**/*.playground.ts',
  '**/example-components.ts',
];

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
    // SSR: the library renders on a server, where none of these exist. Reach
    // the DOM through `inject(DOCUMENT)`, inside `afterNextRender()`, or
    // behind an explicit `typeof x !== 'undefined'` guard. Until this rule
    // existed the policy was written down in exactly one place — a code
    // comment in `link.ts` — and three misses had already shipped.
    files: ['packages/*/src/**/*.ts'],
    ignores: NON_LIBRARY,
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'document',
          message:
            'Use inject(DOCUMENT), or read it inside afterNextRender() / behind a typeof guard.',
        },
        {
          name: 'window',
          message: 'Guard with typeof window !== "undefined" or isPlatformBrowser().',
        },
        {
          name: 'navigator',
          message: 'Guard with typeof navigator !== "undefined".',
        },
        {
          name: 'localStorage',
          message: 'Use the guarded helpers in table-storage.ts.',
        },
        {
          name: 'sessionStorage',
          message: 'Use the guarded helpers in table-storage.ts.',
        },
      ],
    },
  },
  {
    // The cascade contract: component CSS ships as global
    // `@layer kj.component` rules under the `.kj-` namespace, so it lives in a
    // .css file (where `pnpm lint:css` can see it) on a component that opts out
    // of Angular's selector rewriting. See rules/code_style.md, 'Encapsulation'.
    files: ['packages/*/src/**/*.ts'],
    ignores: [
      ...NON_LIBRARY,
      // DEBT, not exemptions. Each of these predates the rule and needs its CSS
      // extracted / its encapsulation flipped, which is a visual change that
      // belongs in its own pass. Delete the line once the file is converted;
      // never add one to make a new component pass.
      'packages/components/src/table/table.ts',            // ViewEncapsulation.Emulated + table.css
      'packages/components/src/editor/editor.ts',          // no encapsulation key + editor.css
      'packages/components/src/table/table-toolbar.ts',    // inline styles
      'packages/components/src/table/table-pagination.ts', // inline styles
      'packages/components/src/table/table-side-panel.ts', // inline styles
      'packages/components/src/table/table-status-bar.ts', // inline styles
    ],
    plugins: { kouji },
    rules: {
      'kouji/component-styles-layered': 'error',
    },
  },
  {
    // `kj` prefix on every public binding of the headless package. The styled
    // package deliberately uses bare names (the `<kj-*>` element already
    // namespaces them) — see rules/code_style.md — so the rule stops at core.
    files: ['packages/core/src/**/*.ts'],
    ignores: NON_LIBRARY,
    plugins: { kouji },
    rules: {
      'kouji/binding-prefix': [
        'error',
        {
          prefix: 'kj',
          // Published names. Renaming one is a breaking change — and per the
          // 2026-09-16 maintainer ruling a rename is a CLEAN break (the new
          // name is the only name, never an alias), so it waits for a major
          // rather than being smuggled in. Nothing new belongs in this list.
          allow: [
            'activate',     // KjListItem.activate — the primitive's own output
            'valueChange',  // KjRichTextEditor
            'textChange',   // KjRichTextEditor
            'jsonChange',   // KjRichTextEditor
            'announce',     // KjRichTextEditor
            'id',           // KjFormErrorSummary — deliberately shadows the native id attribute
          ],
        },
      ],
    },
  },
  {
    // arch F-2. A bare `kjDisabled` attribute binds '' and `kjLoading="false"`
    // binds a truthy string, so an uncoerced boolean input silently ignores
    // both forms the docs teach. The sweep that emptied this list found a real
    // a11y defect behind several of them; nothing enforced it, so the count
    // could grow back the day after. `model()` is exempt and has to be — its
    // `ModelOptions` takes no `transform` — which is why `rules/code_style.md`
    // says a two-way boolean is always bound, never written bare.
    files: ['packages/*/src/**/*.ts'],
    ignores: NON_LIBRARY,
    plugins: { kouji },
    rules: {
      'kouji/boolean-input-transform': 'error',
    },
  },
  {
    // arch F-19. `KjFormControl` (packages/core/src/primitives/forms) is the
    // library's single `ControlValueAccessor`; five components used to
    // hand-roll their own alongside it. They all compose it now, and both
    // packages are at zero violations, so the rule has no exemption list —
    // if you need one, compose the primitive instead.
    files: ['packages/*/src/**/*.ts'],
    ignores: NON_LIBRARY,
    plugins: { kouji },
    rules: {
      'kouji/no-bespoke-value-accessor': 'error',
    },
  },
  {
    // arch F-13. The signal APIs replaced all of these, and both packages are
    // at zero — no decorator inputs/outputs, no view/content query decorators,
    // no `@HostListener`, no `EventEmitter`, no `Renderer2`, and no lifecycle
    // hook bodies anywhere in library source. The rule is what keeps it there.
    //
    // The documented exception is registration ordering: a child that must
    // register with its parent in template order does so from its CONSTRUCTOR
    // (constructors run in template order; `afterNextRender` does not), with
    // teardown on `inject(DestroyRef).onDestroy` — not by reintroducing
    // `ngOnInit` / `ngOnDestroy`. See rules/code_style.md, 'Lifecycle'.
    files: ['packages/*/src/**/*.ts'],
    ignores: NON_LIBRARY,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Decorator[expression.callee.name=/^(Input|Output)$/]',
          message:
            'Use the signal APIs: input() / input.required() / model() / output(). See rules/code_style.md.',
        },
        {
          selector:
            'Decorator[expression.callee.name=/^(ViewChild|ViewChildren|ContentChild|ContentChildren)$/]',
          message:
            'Use the signal queries: viewChild() / viewChildren() / contentChild() / contentChildren().',
        },
        {
          selector: 'Decorator[expression.callee.name="HostListener"]',
          message:
            'Declare the listener in the directive `host` object, so dispatch order is visible at the declaration.',
        },
        {
          selector: 'NewExpression[callee.name="EventEmitter"]',
          message: 'Use output() — it needs no manual subscription teardown.',
        },
        {
          selector: 'TSTypeReference[typeName.name=/^(EventEmitter|Renderer2)$/]',
          message:
            'EventEmitter is replaced by output(); Renderer2 by host bindings (and inject(DOCUMENT) for the rare imperative case).',
        },
        {
          selector:
            'MethodDefinition[key.name=/^(ngOnInit|ngOnDestroy|ngAfterViewInit|ngAfterContentInit|ngOnChanges|ngDoCheck)$/]',
          message:
            'No lifecycle hook bodies in library source: use a field initialiser or the constructor for setup that must run in template order, afterNextRender() for DOM work, effect()/computed() for reactive work, and inject(DestroyRef).onDestroy() for teardown.',
        },
        {
          selector:
            'TSClassImplements[expression.name=/^(OnInit|OnDestroy|AfterViewInit|AfterContentInit|OnChanges|DoCheck)$/]',
          message:
            'Implementing a lifecycle interface in library source means a hook body is coming; see the hook rule above.',
        },
      ],
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
