import iconNodes from 'lucide-static/icon-nodes.json';

type IconNodes = Record<string, unknown>;

/**
 * Kebab-case Lucide icon name (mirrors the keys in `lucide-static/icon-nodes.json`).
 */
export type LucideIconName = keyof typeof iconNodes & string;

/**
 * All Lucide icon kebab-case names, sorted alphabetically. Derived at compile
 * time from `lucide-static/icon-nodes.json` so the list stays in sync with
 * whatever version of `lucide-static` is resolved in `node_modules`.
 *
 * Useful for galleries, autocomplete, or batch eager registration via
 * {@link provideLucideIcons}.
 */
export const LUCIDE_ICON_NAMES: readonly LucideIconName[] = (
  Object.keys(iconNodes as IconNodes) as LucideIconName[]
).sort((a, b) => a.localeCompare(b));
