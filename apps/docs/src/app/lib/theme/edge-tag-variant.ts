import type { Edge, TypographyCheck } from './theme-a11y-report';

/** `kj-tag` variant reflecting WCAG outcome: fail → danger; pass tier → success / info / warning. */
export type EdgeTagVariant = 'success' | 'info' | 'warning' | 'danger' | 'secondary';

export function kjVariantForEdge(e: Edge): EdgeTagVariant {
  if (!e.pass) return 'danger';
  switch (e.verdict) {
    case 'AAA':
      return 'success';
    case 'AA':
      return 'info';
    case 'AA-Large':
      return 'warning';
    default:
      return 'secondary';
  }
}

/** `kj-tag` variant for rem-based typography policy chips (Fonts AAA strip). */
export type TypographyTagVariant = 'success' | 'warning' | 'danger';

export function kjVariantForTypographyCheck(c: TypographyCheck): TypographyTagVariant {
  if (c.pass) return 'success';
  return c.severity === 'fail' ? 'danger' : 'warning';
}
