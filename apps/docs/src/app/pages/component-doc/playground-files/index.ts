import type { PlaygroundLoader } from '../playground-types';
import { BUCKET_A_LOADERS } from './bucket-a';
import { BUCKET_B_LOADERS } from './bucket-b';
import { BUCKET_C_LOADERS } from './bucket-c';
import { BUCKET_D_LOADERS } from './bucket-d';
import { BUCKET_E_LOADERS } from './bucket-e';
import { BUCKET_F_LOADERS } from './bucket-f';

/**
 * Aggregated playground registry. Keys are `DocItem.symbol`; values are
 * **loaders**, not playground objects.
 *
 * The indirection is load-bearing. `PlaygroundFile.component` is a live
 * `Type<unknown>` that the stage instantiates, so a registry holding 69 of
 * them retains every one of those classes — and, transitively, most of
 * `@kouji-ui/components` — in whichever chunk imports this module. Because
 * `component-doc.ts` imports it, that chunk is the one every
 * component-doc slug route downloads, whichever component the reader opened. No amount of
 * `"sideEffects": false` can shake a class reference out of a module-scope
 * object literal.
 *
 * As arrow functions, nothing here references a playground module until the
 * loader is called, so the bundler emits one chunk per playground and a page
 * fetches exactly the one it renders. Resolution (and the per-symbol promise
 * cache) lives in `PlaygroundRegistryService`.
 */
export const PLAYGROUND_LOADERS: Record<string, PlaygroundLoader> = {
  ...BUCKET_A_LOADERS,
  ...BUCKET_B_LOADERS,
  ...BUCKET_C_LOADERS,
  ...BUCKET_D_LOADERS,
  ...BUCKET_E_LOADERS,
  ...BUCKET_F_LOADERS,
};

/** Whether `symbol` has an interactive playground. Does **not** load it. */
export function hasPlayground(symbol: string): boolean {
  return symbol in PLAYGROUND_LOADERS;
}
