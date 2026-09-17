import { Injectable, PendingTasks, inject, isDevMode } from '@angular/core';
import { PLAYGROUND_LOADERS } from './playground-files';
import type { PlaygroundFile } from './playground-types';

/**
 * Async, code-split playground registry — the playground-side twin of
 * `ExampleRegistryService`.
 *
 * `PLAYGROUND_LOADERS` maps `DocItem.symbol` to a thunk, so no playground
 * module (and therefore no component class it instantiates) is in the
 * component-doc route chunk. Opening the Badge page fetches the badge
 * playground chunk and nothing else.
 *
 * Two properties make this safe to call from a template effect:
 *
 * - **Memoised.** The promise is cached per symbol, so re-entering a page, or
 *   two stages asking for the same symbol, costs one network fetch.
 * - **Stability-blocking.** Each load runs inside `PendingTasks.run()`, so
 *   `ApplicationRef.whenStable()` — what the prerender waits on — does not
 *   resolve until the playground has been resolved and mounted. Without it the
 *   prerender finished first and every `/docs/*` page shipped documentation
 *   chrome with an empty stage, which is why no prerendered page ever
 *   instantiated a real component (SSR review F-16).
 */
@Injectable({ providedIn: 'root' })
export class PlaygroundRegistryService {
  private readonly pendingTasks = inject(PendingTasks);
  private readonly cache = new Map<string, Promise<PlaygroundFile | null>>();

  /** Whether `symbol` has a playground at all. Never triggers a load. */
  has(symbol: string): boolean {
    return symbol in PLAYGROUND_LOADERS;
  }

  /**
   * Resolve the playground for `symbol`, or `null` when the symbol has no
   * playground or its chunk fails to load. A failed load is evicted so a
   * later visit retries.
   */
  get(symbol: string): Promise<PlaygroundFile | null> {
    const cached = this.cache.get(symbol);
    if (cached) return cached;

    const loader = PLAYGROUND_LOADERS[symbol];
    if (!loader) return Promise.resolve(null);

    // `PendingTasks.add()` rather than `.run()`: `run()` returns void, and the
    // caller needs the promise. The cleanup runs in `finally` so a rejected
    // chunk cannot leave the application permanently unstable.
    const removeTask = this.pendingTasks.add();
    const pending = loader()
      .catch((err: unknown) => {
        this.cache.delete(symbol);
        if (isDevMode()) {
          console.error(`[playground] failed to load "${symbol}"`, err);
        }
        return null;
      })
      .finally(() => removeTask());
    this.cache.set(symbol, pending);
    return pending;
  }
}
