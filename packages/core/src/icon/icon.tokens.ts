import { InjectionToken, type WritableSignal, inject, signal } from '@angular/core';
import type { IconLoader, IconResolver } from './icon.types';

/**
 * Multi-provider entries contributed by `provideIcons(...)`. Each entry is a
 * `Record<name, cssReadyValue>`. The registry factory merges all entries at
 * injection time.
 *
 * Internal — consumers use `provideIcons(...)`.
 */
export const KJ_ICON_ENTRIES = new InjectionToken<Record<string, string>>(
  'KJ_ICON_ENTRIES',
);

/**
 * Runtime icon registry. A writable signal so the async loader can fill in
 * resolved icons and any consuming directive's computed re-evaluates.
 *
 * Stored values are CSS-ready: `url("...")` for svg mode, quoted glyphs for
 * font mode. Adapter authors are responsible for the wrapping.
 */
export const KJ_ICON_REGISTRY = new InjectionToken<
  WritableSignal<Record<string, string>>
>('KJ_ICON_REGISTRY', {
  providedIn: 'root',
  factory: () => {
    const entries = inject(KJ_ICON_ENTRIES, { optional: true }) as
      | Record<string, string>[]
      | Record<string, string>
      | null;
    const list: Record<string, string>[] = Array.isArray(entries)
      ? entries
      : entries
        ? [entries]
        : [];
    const merged = list.reduce<Record<string, string>>(
      (acc, m) => ({ ...acc, ...m }),
      {},
    );
    return signal<Record<string, string>>(merged);
  },
});

/**
 * Synchronous fallback resolver. Called when a name is not in the registry
 * and no async loader is configured. Returns a CSS-ready string.
 *
 * Default: returns the name unchanged.
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
 */
export const KJ_ICON_CSS_PATH = '@kouji-ui/core/icon/icon.css' as const;
