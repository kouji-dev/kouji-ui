# Icon — E2E coverage notes

The core icon layer has no consumer-visible UI in this session (no Lucide
adapter, no example refactor). The directive-level integration tests in
`icon.directive.spec.ts` cover the end-to-end path through DI:

- Eager registration via `provideIcons` → directive renders the registered value.
- Async loader path → directive renders nothing while pending, then re-renders on success.
- Decorative vs meaningful a11y modes → axe-clean.
- Mode switching (svg vs font) → correct CSS variable wrapping and `data-kj-icon-mode`.
- Selector restriction → directive only attaches to `span` and `i` hosts; ignores other tags.

Browser-level E2E lands with the Lucide adapter follow-up, when there's a
visible component to drive.
