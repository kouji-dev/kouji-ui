/**
 * Library CSS invariants. `pnpm lint:css` runs this over every stylesheet
 * under packages/*\/src; the three rules live in tools/stylelint/index.mjs.
 * No preset is loaded on purpose — this is not a style guide, it is the
 * cascade contract (@layer wrapping + token resolution) the review found
 * broken in a dozen places.
 */
export default {
  plugins: ['./tools/stylelint/index.mjs'],
  rules: {
    'kouji/layered': true,
    'kouji/known-tokens': true,
    'kouji/namespaced': true,
  },
  ignoreFiles: [
    // Pure @import aggregators own no rules of their own.
    'packages/core/src/styles.css',
    'packages/components/src/overlay/overlay.css',
    'packages/themes/src/index.css',
  ],
};
