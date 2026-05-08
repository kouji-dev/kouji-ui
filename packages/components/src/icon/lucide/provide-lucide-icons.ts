import type { EnvironmentProviders } from '@angular/core';
import { provideIconLoader } from '@kouji-ui/core';

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
 * Wire Lucide icons into the kouji icon registry. The loader resolves any
 * kebab-case Lucide name on first render via a per-icon dynamic
 * `import('lucide-static/dist/esm/icons/<name>.mjs')`, so the bundler emits
 * one chunk per icon and only the icons your app actually renders ship.
 *
 * The result is memoized into `KJ_ICON_REGISTRY`, so subsequent renders are
 * sync.
 *
 * @example
 * ```ts
 * // app.config.ts
 * provideLucideIcons(),
 * ```
 *
 * @doc-example Gallery
 *   @doc-file ../icon.gallery.example.ts
 * @category Library/Icon
 * @doc
 * @doc-name icon
 * @doc-is-main
 * @doc-description Wires Lucide as the on-demand icon resolver — any kebab-case Lucide name renders via lazy per-icon import.
 */
export function provideLucideIcons(): EnvironmentProviders {
  return provideIconLoader((name: string) => fetchLucideSvg(name));
}
