import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { type IconLoader, provideIconLoader, provideIcons } from '@kouji-ui/core';

/**
 * Raw Lucide SVG strings keyed by icon name — the shape of an object built
 * from `lucide-static` named imports (`{ Settings, Trash2 }`). PascalCase
 * export names are normalised to Lucide's kebab-case (`Trash2` → `trash-2`);
 * kebab-case keys are kept as they are.
 * @doc
 * @doc-name icon
 * @doc-order 20
 */
export type KjLucideIconSet = Readonly<Record<string, string>>;

const MISSING_PEER =
  '[kouji-ui] provideLucideIcons() needs "lucide-static", an optional peer dependency of ' +
  '@kouji-ui/components that is not installed. Add it with: pnpm add lucide-static';

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

/**
 * Convert PascalCase ("AArrowDown") → kebab-case ("a-arrow-down").
 *
 * Lucide separates a trailing number from its word with a hyphen and keeps the
 * digits grouped ("Heading1" → "heading-1", "Clock10" → "clock-10"), so a
 * letter→digit boundary also gets a hyphen. Without this, digit-bearing icons
 * (headings, clock-1…12, columns-2, …) resolve to a key that never matches the
 * requested name and render blank.
 * @internal
 */
export function pascalToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .toLowerCase();
}

/** A `lucide-static` export name or an already kebab-cased icon name → kebab. */
function toIconName(key: string): string {
  return /[A-Z]/.test(key) ? pascalToKebab(key) : key;
}

/**
 * Registry entries for a subset: kebab name → CSS-ready `url("data:…")`.
 * @internal
 */
export function lucideIconEntries(icons: KjLucideIconSet): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const [key, svg] of Object.entries(icons)) {
    if (typeof svg !== 'string') continue;
    entries[toIconName(key)] = encodeSvgDataUrl(svg);
  }
  return entries;
}

/** kebab name → raw SVG for every string export of the namespace (aliases included). */
function indexLucide(namespace: object): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  for (const [pascal, svg] of Object.entries(namespace)) {
    if (typeof svg === 'string') index.set(pascalToKebab(pascal), svg);
  }
  return index;
}

/**
 * Builds the `KJ_ICON_LOADER` that resolves any Lucide name from a lazily
 * imported `lucide-static` namespace. The import runs once per loader and is
 * forgotten after a failure so a later request retries; an unknown name
 * rejects, which leaves the icon blank and lets the resolver retry it only
 * when it is asked again.
 * @param importer Loads the `lucide-static` module. Defaults to the dynamic
 *   import; tests inject a stub.
 * @internal
 */
export function createLucideIconLoader(
  importer: () => Promise<object> = () => import('lucide-static'),
): IconLoader {
  let index: Promise<ReadonlyMap<string, string>> | null = null;
  const load = (): Promise<ReadonlyMap<string, string>> =>
    (index ??= importer().then(indexLucide, (cause: unknown) => {
      index = null;
      throw new Error(MISSING_PEER, { cause });
    }));
  return async (name: string): Promise<string> => {
    const svg = (await load()).get(name);
    if (svg === undefined) {
      throw new Error(`[kouji-ui] "${name}" is not a Lucide icon name (see LUCIDE_ICON_NAMES).`);
    }
    return encodeSvgDataUrl(svg);
  };
}

/** One loader per app: the namespace is imported and indexed once, whoever asks first. */
const lucideIconLoader: IconLoader = /* @__PURE__ */ createLucideIconLoader();

/**
 * Wire Lucide icons into the kouji icon registry.
 *
 * **Subset (tree-shaken).** Pass the icons you use as `lucide-static` named
 * imports; only those SVGs reach the bundle and they render synchronously
 * from the first paint:
 *
 * ```ts
 * import { Settings, Trash2 } from 'lucide-static';
 * provideLucideIcons({ Settings, Trash2 }); // renders "settings" and "trash-2"
 * ```
 *
 * **Full set (lazy).** With no argument every Lucide name renders — the
 * `lucide-static` namespace (~300 KB gzipped) is imported as its own chunk the
 * first time an unregistered name is requested, so it never sits in the
 * initial bundle. Icons resolve one tick after that chunk arrives; a pending
 * load holds an Angular pending task, so server rendering and prerendering
 * wait for it and the HTML carries the resolved icons.
 *
 * ```ts
 * // app.config.ts
 * provideLucideIcons(),
 * ```
 *
 * Both forms go through `provideIcons()`, so they scope like it: at the root
 * they seed the app-wide registry; on a lazy route they layer a registry over
 * the parent's for that route only (see `KJ_ICON_REGISTRY`). Compose freely
 * with `provideIcons()` for non-Lucide icons.
 *
 * `lucide-static` is an optional peer dependency of `@kouji-ui/components`;
 * the full-set form throws a clear error when it is not installed.
 *
 * @doc-example Gallery
 *   @doc-file ../_examples/icon.gallery.example.ts
 *
 * @doc-css-var
 *   --kj-icon       — Resolved icon value (url("...") or "glyph"). Set by the directive — read by the rendered .kj-icon.
 *   --kj-icon-font  — Font family for `mode="font"` icons. Set on a parent to wire a pre-loaded icon font.
 *   --kj-icon-size-xs — Token size for the `xs` icon scale. Override per theme.
 *   --kj-icon-size-sm — Token size for the `sm` icon scale.
 *   --kj-icon-size-md — Token size for the `md` icon scale.
 *   --kj-icon-size-lg — Token size for the `lg` icon scale.
 *   --kj-icon-size-xl — Token size for the `xl` icon scale.
 *
 * @doc-category Library/Icon
 * @doc
 * @doc-name icon
 * @doc-is-main
 * @doc-description Wires Lucide icons into the kouji icon registry — a tree-shaken subset from named imports, or the whole set as a lazy chunk.
 */
export function provideLucideIcons(icons?: KjLucideIconSet): EnvironmentProviders {
  if (icons) return provideIcons(lucideIconEntries(icons));
  return makeEnvironmentProviders([provideIcons({}), provideIconLoader(lucideIconLoader)]);
}
