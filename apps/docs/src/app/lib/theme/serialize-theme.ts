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

  // ─── new token system (additive) ───
  // Map the resolved slot colors to the new semantic token names so themes
  // exported from the generator are forward-compatible with the new system.
  const isDark = colorScheme(t.colors['base-100']) === 'dark';

  // Neutral surfaces
  lines.push(`--kj-bg-body: ${t.colors['base-100']};`);
  lines.push(`--kj-bg-surface: ${t.derivedBase.base200};`);
  lines.push(`--kj-bg-field: ${t.derivedBase.base200};`);
  lines.push(`--kj-bg-elevated: ${t.derivedBase.base300};`);
  lines.push(`--kj-bg-overlay: ${isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.5)'};`);
  lines.push(`--kj-bg-inverse: ${t.contents['base-content']};`);
  lines.push(`--kj-bg-disabled: ${t.derivedBase.base300};`);

  // Intent surfaces
  lines.push(`--kj-bg-primary: ${t.colors.primary};`);
  lines.push(`--kj-bg-primary-subtle: color-mix(in oklch, ${t.colors.primary} 15%, ${t.colors['base-100']});`);
  lines.push(`--kj-bg-accent: ${t.colors.accent};`);
  lines.push(`--kj-bg-accent-subtle: color-mix(in oklch, ${t.colors.accent} 15%, ${t.colors['base-100']});`);
  lines.push(`--kj-bg-info: ${t.colors.info};`);
  lines.push(`--kj-bg-info-subtle: color-mix(in oklch, ${t.colors.info} 15%, ${t.colors['base-100']});`);
  lines.push(`--kj-bg-success: ${t.colors.success};`);
  lines.push(`--kj-bg-success-subtle: color-mix(in oklch, ${t.colors.success} 15%, ${t.colors['base-100']});`);
  lines.push(`--kj-bg-warning: ${t.colors.warning};`);
  lines.push(`--kj-bg-warning-subtle: color-mix(in oklch, ${t.colors.warning} 15%, ${t.colors['base-100']});`);
  lines.push(`--kj-bg-danger: ${t.colors.destructive};`);
  lines.push(`--kj-bg-danger-subtle: color-mix(in oklch, ${t.colors.destructive} 15%, ${t.colors['base-100']});`);

  // FG Class A (text on body)
  lines.push(`--kj-fg-default: ${t.contents['base-content']};`);
  lines.push(`--kj-fg-muted: color-mix(in oklch, ${t.contents['base-content']} 70%, ${t.colors['base-100']});`);
  lines.push(`--kj-fg-subtle: color-mix(in oklch, ${t.contents['base-content']} 50%, ${t.colors['base-100']});`);
  lines.push(`--kj-fg-disabled: color-mix(in oklch, ${t.contents['base-content']} 35%, ${t.colors['base-100']});`);

  // FG Class B (text on intent fills)
  lines.push(`--kj-fg-on-primary: ${t.contents['primary-content']};`);
  lines.push(`--kj-fg-on-accent: ${t.contents['accent-content']};`);
  lines.push(`--kj-fg-on-info: ${t.contents['info-content']};`);
  lines.push(`--kj-fg-on-success: ${t.contents['success-content']};`);
  lines.push(`--kj-fg-on-warning: ${t.contents['warning-content']};`);
  lines.push(`--kj-fg-on-danger: ${t.contents['destructive-content']};`);
  lines.push(`--kj-fg-on-inverse: ${t.colors['base-100']};`);

  // FG Class C (intent text on body)
  lines.push(`--kj-fg-primary: ${t.colors.primary};`);
  lines.push(`--kj-fg-accent: ${t.colors.accent};`);
  lines.push(`--kj-fg-info: ${t.colors.info};`);
  lines.push(`--kj-fg-success: ${t.colors.success};`);
  lines.push(`--kj-fg-warning: ${t.colors.warning};`);
  lines.push(`--kj-fg-danger: ${t.colors.destructive};`);

  // Borders
  lines.push(`--kj-border-default: ${t.derivedBase.base300};`);
  lines.push(`--kj-border-muted: ${t.derivedBase.base200};`);
  lines.push(`--kj-border-strong: color-mix(in oklch, ${t.derivedBase.base300} 60%, ${t.contents['base-content']});`);
  lines.push(`--kj-border-focus: ${t.colors.primary};`);
  lines.push(`--kj-border-disabled: ${t.derivedBase.base300};`);
  lines.push(`--kj-border-primary: ${t.colors.primary};`);
  lines.push(`--kj-border-danger: ${t.colors.destructive};`);

  // Shadows
  lines.push(`--kj-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);`);
  lines.push(`--kj-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);`);
  lines.push(`--kj-shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.18);`);
  lines.push(`--kj-shadow-focus: 0 0 0 3px color-mix(in oklch, ${t.colors.primary} 40%, transparent);`);

  return `[data-theme="${name}"] {\n  ${lines.join('\n  ')}\n}`;
}
