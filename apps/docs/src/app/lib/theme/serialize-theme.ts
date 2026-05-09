import { oklch as parseOklch } from 'culori';
import type { ResolvedTokens } from './types';

function colorScheme(base100: string): 'light' | 'dark' {
  const parsed = parseOklch(base100);
  if (!parsed) return 'light';
  return parsed.l * 100 > 50 ? 'light' : 'dark';
}

/**
 * Serialize resolved tokens to a scoped CSS block:
 *
 *   [data-theme="<name>"] {
 *     color-scheme: light;
 *     --kj-color-base-100: oklch(...);
 *     ...
 *   }
 */
export function serializeToScopedBlock(name: string, t: ResolvedTokens): string {
  const lines: string[] = [];
  lines.push(`color-scheme: ${colorScheme(t.colors['base-100'])};`);

  // colors (slots + derived base shades + contents)
  lines.push(`--kj-color-base-100: ${t.colors['base-100']};`);
  lines.push(`--kj-color-base-200: ${t.derivedBase.base200};`);
  lines.push(`--kj-color-base-300: ${t.derivedBase.base300};`);
  lines.push(`--kj-color-base-content: ${t.contents['base-content']};`);
  for (const slot of ['primary','secondary','accent','neutral','info','success','warning','destructive'] as const) {
    lines.push(`--kj-color-${slot}: ${t.colors[slot]};`);
    lines.push(`--kj-color-${slot}-content: ${t.contents[`${slot}-content`]};`);
  }

  // shape
  lines.push(`--kj-radius-box: ${t.shape.radiusBox};`);
  lines.push(`--kj-radius-field: ${t.shape.radiusField};`);
  lines.push(`--kj-radius-selector: ${t.shape.radiusSelector};`);
  lines.push(`--kj-border: ${t.shape.border};`);
  lines.push(`--kj-depth: ${t.shape.depth};`);

  // type
  lines.push(`--kj-font-sans: ${t.type.fontSans};`);
  lines.push(`--kj-font-mono: ${t.type.fontMono};`);
  lines.push(`--kj-font-display: ${t.type.fontDisplay};`);

  // motion
  lines.push(`--kj-transition: ${t.motion.transition};`);

  lines.push(`--kj-text-body: ${t.typography.bodyRem};`);
  lines.push(`--kj-text-small: ${t.typography.smallRem};`);

  return `[data-theme="${name}"] {\n  ${lines.join('\n  ')}\n}`;
}
