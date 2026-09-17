/**
 * Lazy access to `@tanstack/virtual-core`, an optional peer dependency of
 * `@kouji-ui/components`: only a table that virtualizes its rows pays for the
 * package, as its own chunk, and an install that lacks it fails with a
 * message that names the fix instead of a bare module-not-found.
 *
 * Not part of the public API (the table barrel does not re-export this file).
 */

/** The peer's module namespace. */
export type KjVirtualCore = typeof import('@tanstack/virtual-core');

const MISSING_PEER =
  '[kouji-ui] <kj-table> virtual scrolling ([kjTableVirtual]) needs "@tanstack/virtual-core", ' +
  'an optional peer dependency of @kouji-ui/components that is not installed. ' +
  'Add it with: pnpm add @tanstack/virtual-core';

/**
 * Runs `importer` and turns a failed import into the clear error above.
 * @param importer Loads the peer; the directive passes the dynamic import.
 */
export function resolveVirtualCore(importer: () => Promise<KjVirtualCore>): Promise<KjVirtualCore> {
  return importer().catch((cause: unknown) => {
    throw new Error(MISSING_PEER, { cause });
  });
}

let pending: Promise<KjVirtualCore> | null = null;

/**
 * The peer, imported once per app and memoised; a failure is forgotten so the
 * next mount retries instead of caching the error forever.
 */
export function loadVirtualCore(): Promise<KjVirtualCore> {
  return (pending ??= resolveVirtualCore(() => import('@tanstack/virtual-core')).catch(
    (error: unknown) => {
      pending = null;
      throw error;
    },
  ));
}
