// Typography surface — directives only, no wrapper components.
// Per the analysis, Typography ships no `<kj-h1>` / `<kj-prose>` Angular
// components: the CSS class `kj-prose` plus five attribute directives are
// the entire surface. The components package re-exports the directives
// from `@kouji-ui/core` for ergonomic consumption alongside the rest of
// the library, and ships the `kj-prose` stylesheet via the package's
// stylesheet pipeline.
export { KjLead, KjMuted, KjCode, KjBlockquote, KjTruncate } from '@kouji-ui/core';
