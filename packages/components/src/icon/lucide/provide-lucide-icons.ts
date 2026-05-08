import type { EnvironmentProviders } from '@angular/core';
import { provideIconLoader } from '@kouji-ui/core';

/**
 * Encode an SVG string into a `data:` URL fragment safe for use inside a
 * `url(...)` CSS value. We percent-encode the characters that would otherwise
 * break parsing (`#`, `?`, `<`, `>`, `"`, `'`, etc.) while leaving the bulk of
 * the SVG human-readable for easier debugging.
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

/**
 * Register a set of Lucide icons by their kebab-case names.
 *
 * Resolution is **lazy** and **per-icon**: each name triggers a dynamic
 * `import()` against `lucide-static/dist/esm/icons/<name>.mjs`, so the bundler
 * (esbuild) emits a separate chunk per icon rather than pulling the entire
 * Lucide library into the initial bundle. The resulting SVG is wrapped into a
 * CSS-ready `url(data:image/svg+xml;utf8,...)` value and memoized by
 * `@kouji-ui/core`'s icon registry.
 *
 * The `names` argument is informational — it documents the *known set* used by
 * the host application. Any kebab-case name with a corresponding per-icon
 * module in `lucide-static` will resolve at runtime.
 *
 * @example
 * ```ts
 * provideLucideIcons(['chevron-right', 'x', 'check', 'command']);
 * ```
 *
 * @doc
 * @doc-name icon
 */
export function provideLucideIcons(
  // The names are accepted to keep the public API stable and to document the
  // expected icon set, even though resolution itself is lazy and unrestricted.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  names: readonly string[],
): EnvironmentProviders {
  const loader = async (name: string): Promise<string> => {
    const mod = (await import(
      /* @vite-ignore */
      `lucide-static/dist/esm/icons/${name}.mjs`
    )) as { default: string };
    return encodeSvgDataUrl(mod.default);
  };
  return provideIconLoader(loader);
}
