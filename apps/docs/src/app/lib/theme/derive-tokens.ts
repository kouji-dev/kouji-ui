import type { DraftTheme, ResolvedTokens } from './types';

/**
 * Resolve a draft to its serializable token shape. With the 17-slot model
 * every editable surface/foreground is explicit, so this is now a near-1:1
 * pass-through; the only work is unit-stringifying shape/typography.
 */
export function deriveTokens(draft: DraftTheme): ResolvedTokens {
  return {
    bg: draft.bg,
    fg: draft.fg,
    shape: {
      radiusBox:      `${draft.shape.radiusBox}px`,
      radiusField:    `${draft.shape.radiusField}px`,
      /** Selector chrome follows field radius (no separate editor control). */
      radiusSelector: `${draft.shape.radiusField}px`,
      border:         `${draft.shape.border}px`,
      depth:          `${draft.shape.depth}`,
    },
    type:   draft.type,
    typography: {
      bodyRem:  `${draft.typography.bodyRem}rem`,
      smallRem: `${draft.typography.smallRem}rem`,
    },
    motion: draft.motion,
  };
}
