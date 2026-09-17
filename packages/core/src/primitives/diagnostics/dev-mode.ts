/**
 * Whether the app is running a development build.
 *
 * This is the `ngDevMode` form, not `isDevMode()` from `@angular/core`.
 * `isDevMode()` is a function call the optimiser cannot fold away, so both the
 * guarded branch **and its message strings** ship to production. `ngDevMode` is
 * a global the Angular CLI statically defines as `false` for a production
 * build, so the whole branch is dead code the minifier deletes.
 *
 * Prefer {@link kjDevWarn} / {@link kjDevAssert}; reach for this directly only
 * when the guarded work is more than one message.
 *
 * @returns `true` in a development build (and in tests, where `ngDevMode` is unset).
 *
 * @doc-category Core/Primitives
 */
export function kjDevMode(): boolean {
  return typeof ngDevMode === 'undefined' || !!ngDevMode;
}

/**
 * Warn about misuse, in development builds only.
 *
 * Every library diagnostic goes through here so the message shape is one thing
 * rather than four: `[<scope>] <message>`, where `scope` is the selector or
 * class the author typed (`'kj-alert'`, `'KjForm'`), so the warning points at
 * the element they can find in their template.
 *
 * @param scope - Selector or class name the warning is about.
 * @param message - What is wrong and what to do instead.
 *
 * @example
 * ```ts
 * kjDevWarn('kj-alert', `unknown variant "${v}". Allowed values: ${allowed}.`);
 * ```
 *
 * @doc-category Core/Primitives
 */
export function kjDevWarn(scope: string, message: string): void {
  if (!kjDevMode()) return;
  console.warn(`[${scope}] ${message}`);
}

/**
 * Throw when a contract the library cannot recover from is broken.
 *
 * Unlike {@link kjDevWarn} the error is raised in production too — a broken
 * invariant does not become acceptable in a release build — but the
 * explanatory message is only built in development, so the guidance text is
 * dropped from the production bundle.
 *
 * @param condition - The invariant. Nothing is thrown while it holds.
 * @param scope - Selector or class name the error is about.
 * @param message - Why the invariant matters and how to satisfy it. Pass a
 *   function to keep an expensive message out of the hot path.
 * @throws Error when `condition` is falsy.
 *
 * @doc-category Core/Primitives
 */
export function kjDevAssert(
  condition: unknown,
  scope: string,
  message: string | (() => string),
): asserts condition {
  if (condition) return;
  throw kjError(scope, typeof message === 'function' ? message() : message);
}

/**
 * Build the library's standard `Error` — the same `[<scope>] <message>` shape
 * {@link kjDevWarn} prints — without throwing it.
 *
 * @param scope - Selector or class name the error is about.
 * @param message - What went wrong and how to fix it.
 * @returns The error, for the caller to throw or reject with.
 *
 * @doc-category Core/Primitives
 */
export function kjError(scope: string, message: string): Error {
  return new Error(`[${scope}] ${message}`);
}
