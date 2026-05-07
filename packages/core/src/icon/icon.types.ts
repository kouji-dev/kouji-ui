// packages/core/src/icon/icon.types.ts

/**
 * Resolves an icon name to a CSS-ready value (e.g. `url("data:...")` for svg
 * mode, or a quoted glyph like `"\\f013"` for font mode). Synchronous.
 *
 * Used as a fallback when an icon is not in the registry and no async loader
 * is configured.
 */
export type IconResolver = (name: string) => string;

/**
 * Asynchronously resolves an icon name to a CSS-ready value. Result is
 * memoized into the registry so subsequent reads are synchronous.
 */
export type IconLoader = (name: string) => Promise<string>;

/**
 * Semantic color tokens for `[kjIconColor]`. Maps to
 * `var(--kj-color-icon-{token})`. `'inherit'` is the default and means
 * "use whatever the surrounding text color is" (CSS `currentColor`).
 */
export type KjIconColor =
  | 'inherit'
  | 'muted'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

/**
 * Size tokens for `[kjIconSize]`. Maps to `var(--kj-icon-size-{token})`.
 * Sizes are em-relative so an icon scales with surrounding text by default.
 */
export type KjIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
