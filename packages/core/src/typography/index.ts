export { KjLead } from './lead';
export { KjMuted } from './muted';
export { KjCode } from './code';
export { KjBlockquote } from './blockquote';
export { KjTruncate } from './truncate';

/**
 * Resolvable path to the kouji prose stylesheet. Consumers import the CSS
 * once at the application root:
 *
 * ```ts
 * import { KJ_PROSE_CSS_PATH } from '@kouji-ui/core';
 * // or import the file directly:
 * import '@kouji-ui/core/typography/prose.css';
 * ```
 *
 * The path is exposed as a string so build tools can locate the file via
 * `require.resolve(KJ_PROSE_CSS_PATH)` when programmatic resolution is
 * needed (for example, when wiring the stylesheet into a docs-site
 * pipeline).
 */
export const KJ_PROSE_CSS_PATH = '@kouji-ui/core/typography/prose.css';
