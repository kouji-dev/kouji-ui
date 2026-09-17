import {
  InjectionToken,
  type WritableSignal,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import type { IconLoader, IconResolver } from './icon.types';

/**
 * Multi-provider entries contributed by `provideIcons(...)`. Each entry is a
 * `Record<name, cssReadyValue>`. The registry factory merges all entries at
 * injection time.
 *
 * Internal — consumers use `provideIcons(...)`.
 * @internal
 */
export const KJ_ICON_ENTRIES = new InjectionToken<Record<string, string>>(
  'KJ_ICON_ENTRIES',
);

/** Merges the multi-provider entries of one injector, later entries winning. */
function mergeEntries(
  entries: Record<string, string>[] | Record<string, string> | null,
): Record<string, string> {
  const list: Record<string, string>[] = Array.isArray(entries)
    ? entries
    : entries
      ? [entries]
      : [];
  return list.reduce<Record<string, string>>((acc, m) => ({ ...acc, ...m }), {});
}

/**
 * Runtime icon registry. A writable signal so the async loader can fill in
 * resolved icons and any consuming directive's computed re-evaluates.
 *
 * Stored values are CSS-ready: `url("...")` for svg mode, quoted glyphs for
 * font mode. Adapter authors are responsible for the wrapping.
 *
 * Resolution is hierarchical: the root registry merges every
 * `provideIcons()` call made at the root, and each environment injector that
 * calls `provideIcons()` (a lazy route, a `createEnvironmentInjector()`) gets
 * its own registry that layers its entries over the parent's — a nested
 * scope sees every icon registered above it and can shadow or extend the set
 * without touching the page-global map. Loader results are written into the
 * nearest registry.
 * @doc
 * @doc-name icon
 * @doc-order 6
 */
export const KJ_ICON_REGISTRY = new InjectionToken<
  WritableSignal<Record<string, string>>
>('KJ_ICON_REGISTRY', {
  providedIn: 'root',
  factory: () =>
    signal<Record<string, string>>(
      mergeEntries(inject(KJ_ICON_ENTRIES, { optional: true })),
    ),
});

/**
 * Factory behind the registry `provideIcons()` installs at its injector.
 * Layers this injector's `KJ_ICON_ENTRIES` over the parent registry and
 * follows the parent as it changes, while keeping the writes made to this
 * registry (loader results) across those changes.
 * @internal
 */
export function createScopedIconRegistry(): WritableSignal<Record<string, string>> {
  const parent = inject(KJ_ICON_REGISTRY, { skipSelf: true, optional: true });
  const local = mergeEntries(inject(KJ_ICON_ENTRIES, { optional: true, self: true }));
  if (!parent) return signal<Record<string, string>>(local);

  return linkedSignal<Record<string, string>, Record<string, string>>({
    source: parent,
    computation: (parentMap, previous) => {
      const next: Record<string, string> = { ...parentMap, ...local };
      if (!previous) return next;
      // Anything the previous value held that neither the previous parent
      // map nor the local entries explain is a write made to this registry
      // (an async loader result); carry it over.
      const explained: Record<string, string> = { ...previous.source, ...local };
      for (const [name, value] of Object.entries(previous.value)) {
        if (explained[name] !== value) next[name] = value;
      }
      return next;
    },
  });
}

/**
 * Synchronous fallback resolver. Called when a name is not in the registry
 * and no async loader is configured. Returns a CSS-ready string.
 *
 * Default: returns the name unchanged.
 * @doc
 * @doc-name icon
 * @doc-order 7
 */
export const KJ_ICON_RESOLVER = new InjectionToken<IconResolver>(
  'KJ_ICON_RESOLVER',
  { providedIn: 'root', factory: () => (name: string) => name },
);

/**
 * Optional async loader. When set, missing icons are loaded via this fn and
 * the result is written into `KJ_ICON_REGISTRY`. While loading, the
 * directive renders nothing for that name. If unset, the resolver fallback
 * is used instead.
 *
 * A pending load registers an Angular pending task, so server rendering
 * waits for it and the prerendered HTML carries the resolved icon.
 * @doc
 * @doc-name icon
 * @doc-order 8
 */
export const KJ_ICON_LOADER = new InjectionToken<IconLoader | null>(
  'KJ_ICON_LOADER',
  { providedIn: 'root', factory: () => null },
);

/**
 * Resolvable path to the kouji icon stylesheet.
 *
 * ```ts
 * import { KJ_ICON_CSS_PATH } from '@kouji-ui/core';
 * // or import the file directly:
 * import '@kouji-ui/core/icon/icon.css';
 * ```
 * @doc
 * @doc-name icon
 * @doc-order 9
 */
export const KJ_ICON_CSS_PATH = '@kouji-ui/core/icon/icon.css' as const;
