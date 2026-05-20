import { Injectable, Type } from '@angular/core';
import {
  EXAMPLE_LOADERS as ComponentsLoaders,
  EXAMPLE_OWNER as ComponentsOwner,
} from '@kouji-ui/components/examples';
import {
  EXAMPLE_LOADERS as CoreLoaders,
  EXAMPLE_OWNER as CoreOwner,
} from '@kouji-ui/core/examples';

type Loader = () => Promise<Record<string, Type<unknown>>>;

/**
 * Async, code-split example component registry.
 *
 * Each package (`@kouji-ui/core`, `@kouji-ui/components`) ships:
 *   - `EXAMPLE_LOADERS`: folder → `() => import('./<folder>/_examples')`
 *   - `EXAMPLE_OWNER`:   exportName → folder
 *
 * Looking up an example by exportName resolves its owning folder, calls
 * that folder's loader exactly once (the promise is cached), and pulls the
 * class out of the resolved module. Each folder becomes its own chunk in
 * the docs build output — opening one component's page only downloads the
 * examples for that component, not the whole library.
 *
 * Owner maps are static (no chunk weight) so name → folder lookup is sync.
 */
@Injectable({ providedIn: 'root' })
export class ExampleRegistryService {
  /**
   * Folder keys are namespaced by package — `components:<folder>` /
   * `core:<folder>` — so a shared name like `button` (which exists in both
   * packages, each holding its own example set) doesn't collide. Without
   * the prefix the second spread overwrote the first, and resolving a
   * components-owned example resolved core's loader and returned `null`.
   */
  private readonly loaders: Record<string, Loader> = {
    ...prefix('components:', ComponentsLoaders),
    ...prefix('core:', CoreLoaders),
  };

  /**
   * exportName → owning namespaced folder. Components shadow core on
   * export-name collisions (matches the previous merge ordering).
   */
  private readonly owner: Record<string, string> = {
    ...mapValues(CoreOwner, (f) => `core:${f}`),
    ...mapValues(ComponentsOwner, (f) => `components:${f}`),
  };

  /** Folder → resolved-module promise. Memoised so a folder loads exactly once. */
  private readonly cache = new Map<string, Promise<Record<string, Type<unknown>>>>();

  /**
   * Resolve the example class for `exportName`. Returns `null` if the name
   * is unknown to either package, or the module loads but doesn't expose
   * that export (e.g. typo / stale registry).
   */
  async get(exportName: string): Promise<Type<unknown> | null> {
    const folder = this.owner[exportName];
    if (!folder) return null;
    const loader = this.loaders[folder];
    if (!loader) return null;
    let pending = this.cache.get(folder);
    if (!pending) {
      pending = loader();
      this.cache.set(folder, pending);
    }
    const mod = await pending;
    return mod[exportName] ?? null;
  }

  /**
   * Eagerly warm the chunk owning `exportName`. By the time the user
   * scrolls a recipe-card into view, its chunk is already in the cache and
   * the live preview mounts synchronously. No-op if the name isn't known.
   *
   * `ComponentDocComponent` calls this once per page-example when the page
   * loads — typically all examples on one page share a folder so only one
   * chunk is actually fetched.
   */
  preload(exportName: string): void {
    const folder = this.owner[exportName];
    if (!folder) return;
    const loader = this.loaders[folder];
    if (!loader) return;
    if (this.cache.has(folder)) return;
    this.cache.set(folder, loader().catch((err) => {
      this.cache.delete(folder);
      throw err;
    }));
  }
}

function prefix<T>(pre: string, src: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of Object.keys(src)) out[pre + k] = src[k];
  return out;
}

function mapValues<T, U>(src: Record<string, T>, fn: (v: T) => U): Record<string, U> {
  const out: Record<string, U> = {};
  for (const k of Object.keys(src)) out[k] = fn(src[k]);
  return out;
}
