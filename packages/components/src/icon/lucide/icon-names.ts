// Re-generate via:
//   node scripts/generate-lucide-icon-names.mjs
// (script reads the installed lucide-static/icon-nodes.json keys and writes
// this file). We embed the list as a static const instead of importing the
// JSON at runtime so SSR / Vite ESM resolvers don't have to resolve a JSON
// path inside the lucide-static package at request time.

import { LUCIDE_ICON_NAMES_RAW } from './icon-names.generated';

/** Kebab-case Lucide icon name. */
export type LucideIconName = string;

/**
 * All Lucide icon kebab-case names, sorted alphabetically. Generated from
 * `lucide-static/icon-nodes.json`. Useful for galleries, autocomplete, or
 * batch eager registration via {@link provideLucideIcons}.
 */
export const LUCIDE_ICON_NAMES: readonly LucideIconName[] = LUCIDE_ICON_NAMES_RAW;
