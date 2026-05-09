import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { KJ_ICON_REGISTRY } from '@kouji-ui/core';
import * as lucideIcons from 'lucide-static';

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

/** Convert PascalCase ("AArrowDown") → kebab-case ("a-arrow-down"). */
function pascalToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/** Lazily build the kebab-name → encoded-data-url map once per app. */
let _registryEntries: Record<string, string> | null = null;
function buildLucideRegistry(): Record<string, string> {
  if (_registryEntries) return _registryEntries;
  const entries: Record<string, string> = {};
  const map = lucideIcons as unknown as Record<string, string>;
  for (const [pascal, svg] of Object.entries(map)) {
    if (typeof svg !== 'string') continue;
    entries[pascalToKebab(pascal)] = encodeSvgDataUrl(svg);
  }
  _registryEntries = entries;
  return entries;
}

/**
 * Wire Lucide icons into the kouji icon registry.
 *
 * The full Lucide icon set is bundled once and registered into
 * `KJ_ICON_REGISTRY` at app start, so any kebab-case Lucide name renders
 * synchronously the first time it appears in the DOM.
 *
 * The transferred bundle cost is ~300 KB gzipped for the whole set, which
 * lets us keep the API surface minimal and works identically in dev and
 * production — Vite/esbuild can't reliably code-split per-icon dynamic
 * imports against `lucide-static`'s package layout, so a single static
 * namespace import is the predictable choice.
 *
 * @example
 * ```ts
 * // app.config.ts
 * provideLucideIcons(),
 * ```
 *
 * @doc-example Gallery
 *   @doc-file ../icon.gallery.example.ts
 * @doc-category Library/Icon
 * @doc
 * @doc-name icon
 * @doc-is-main
 * @doc-description Wires the full Lucide icon set into the kouji icon registry — any kebab-case Lucide name renders by name.
 */
export function provideLucideIcons(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const registry = inject(KJ_ICON_REGISTRY);
      registry.update((m) => ({ ...m, ...buildLucideRegistry() }));
    }),
  ]);
}
