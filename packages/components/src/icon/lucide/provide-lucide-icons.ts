import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import {
  KJ_ICON_REGISTRY,
  provideIconLoader,
} from '@kouji-ui/core';

/**
 * Encode an SVG string into a `data:` URL fragment safe for use inside a CSS
 * `url(...)` value. Percent-encodes the characters that would otherwise break
 * parsing (`#`, `?`, `<`, `>`, etc.) while leaving the bulk of the SVG
 * human-readable for easier debugging.
 */
function encodeSvgDataUrl(svg: string): string {
  const encoded = svg
    .replace(/"/g, "'")
    .replace(/>\s+</g, '><')
    .trim()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/\?/g, '%3F')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E');
  return `url("data:image/svg+xml;utf8,${encoded}")`;
}

async function fetchLucideSvg(name: string): Promise<string> {
  const mod = (await import(
    /* @vite-ignore */
    `lucide-static/dist/esm/icons/${name}.mjs`
  )) as { default: string };
  return encodeSvgDataUrl(mod.default);
}

/**
 * Eagerly register a known set of Lucide icons. Each name's SVG is fetched
 * via a per-icon dynamic `import()` and written into `KJ_ICON_REGISTRY` as
 * soon as it resolves, so first paint on these icons is sync (registry hit).
 *
 * Use this for the icons your shell renders on every page (chevrons, close,
 * common actions). Pair with {@link provideLucideLoader} to lazily resolve
 * any other Lucide icon a feature page references.
 *
 * @example
 * ```ts
 * provideLucideIcons(['chevron-right', 'x', 'check']),
 * provideLucideLoader(),
 * ```
 *
 * @doc
 * @doc-name icon
 * @doc-description Preloads a fixed set of Lucide icons up front so they render synchronously on first paint.
 */
export function provideLucideIcons(
  names: readonly string[],
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const registry = inject(KJ_ICON_REGISTRY);
      for (const name of names) {
        fetchLucideSvg(name).then((value) => {
          registry.update((m) => ({ ...m, [name]: value }));
        });
      }
    }),
  ]);
}

/**
 * Register a lazy loader for any kebab-case Lucide icon. The first time a
 * directive renders an unknown name, the loader fires `import()` against the
 * matching `lucide-static/dist/esm/icons/<name>.mjs` chunk; the result is
 * memoized into the registry, so subsequent renders are sync.
 *
 * Combine with {@link provideLucideIcons} to pre-warm the registry for the
 * always-on set, and use this as the catch-all for everything else.
 *
 * @example
 * ```ts
 * // Lazy-only — every icon resolved on first render:
 * provideLucideLoader(),
 *
 * // Eager set + lazy fallback:
 * provideLucideIcons(['chevron-right', 'x']),
 * provideLucideLoader(),
 * ```
 *
 * @doc
 * @doc-name icon
 * @doc-description Lazy fallback resolver — any kebab-case Lucide icon resolves on first render.
 */
export function provideLucideLoader(): EnvironmentProviders {
  return provideIconLoader((name: string) => fetchLucideSvg(name));
}
