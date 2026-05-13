import type { BgSlot, FgSlot } from './types';
import type { Edge } from './theme-a11y-report';

/** Row identity for contrast chip labels (any editable slot). */
export type ThemeColorRowSlot = BgSlot | FgSlot;

/**
 * Visible label for a contrast edge under a color row: the row heading already names `slot`,
 * so show only the other token (e.g. primary row: `primary→base-100` → `base-100`).
 */
export function shortContrastPairLabel(slot: ThemeColorRowSlot, e: Pick<Edge, 'fgToken' | 'bgToken'>): string {
  if (e.fgToken === slot) return e.bgToken;
  if (e.bgToken === slot) return e.fgToken;
  return `${e.fgToken}→${e.bgToken}`;
}
