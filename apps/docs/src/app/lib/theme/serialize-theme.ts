import { oklch as parseOklch } from 'culori';
import type { ResolvedTokens } from './types';

function colorScheme(bgBody: string): 'light' | 'dark' {
  const parsed = parseOklch(bgBody);
  if (!parsed) return 'light';
  return parsed.l * 100 > 50 ? 'light' : 'dark';
}

/**
 * Serialize resolved tokens to a scoped CSS block:
 *
 *   [data-theme="<name>"] {
 *     color-scheme: light;
 *     --kj-bg-body: oklch(...);
 *     --kj-fg-default: oklch(...);
 *     ...
 *   }
 *
 * Editable slots emit 1:1. Derived tokens (fg-muted, borders, shadows, etc.)
 * are computed from the editable slots via color-mix at runtime.
 */
export function serializeToScopedBlock(name: string, t: ResolvedTokens): string {
  const lines: string[] = [];
  const isDark = colorScheme(t.bg['bg-body']) === 'dark';
  lines.push(`color-scheme: ${isDark ? 'dark' : 'light'};`);

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

  // typography
  lines.push(`--kj-text-body: ${t.typography.bodyRem};`);
  lines.push(`--kj-text-small: ${t.typography.smallRem};`);

  // ── Background surfaces (editable) ──
  lines.push(`--kj-bg-body:     ${t.bg['bg-body']};`);
  lines.push(`--kj-bg-surface:  ${t.bg['bg-surface']};`);
  lines.push(`--kj-bg-field:    ${t.bg['bg-field']};`);
  lines.push(`--kj-bg-elevated: ${t.bg['bg-elevated']};`);

  // ── Intent surfaces (editable) ──
  lines.push(`--kj-bg-primary:  ${t.bg['bg-primary']};`);
  lines.push(`--kj-bg-accent:   ${t.bg['bg-accent']};`);
  lines.push(`--kj-bg-info:     ${t.bg['bg-info']};`);
  lines.push(`--kj-bg-success:  ${t.bg['bg-success']};`);
  lines.push(`--kj-bg-warning:  ${t.bg['bg-warning']};`);
  lines.push(`--kj-bg-danger:   ${t.bg['bg-danger']};`);

  // ── Derived bg helpers ──
  lines.push(`--kj-bg-overlay:  ${isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.5)'};`);
  lines.push(`--kj-bg-inverse:  ${t.fg['fg-default']};`);
  lines.push(`--kj-bg-disabled: ${t.bg['bg-field']};`);

  // ── Foregrounds (editable) ──
  lines.push(`--kj-fg-default: ${t.fg['fg-default']};`);

  // Class A — derived muted/subtle/disabled from fg-default toward bg-body
  lines.push(`--kj-fg-muted:    color-mix(in oklch, ${t.fg['fg-default']} 70%, ${t.bg['bg-body']});`);
  lines.push(`--kj-fg-subtle:   color-mix(in oklch, ${t.fg['fg-default']} 50%, ${t.bg['bg-body']});`);
  lines.push(`--kj-fg-disabled: color-mix(in oklch, ${t.fg['fg-default']} 35%, ${t.bg['bg-body']});`);

  // Class B — text on intent fills (editable)
  lines.push(`--kj-fg-on-primary: ${t.fg['fg-on-primary']};`);
  lines.push(`--kj-fg-on-accent:  ${t.fg['fg-on-accent']};`);
  lines.push(`--kj-fg-on-info:    ${t.fg['fg-on-info']};`);
  lines.push(`--kj-fg-on-success: ${t.fg['fg-on-success']};`);
  lines.push(`--kj-fg-on-warning: ${t.fg['fg-on-warning']};`);
  lines.push(`--kj-fg-on-danger:  ${t.fg['fg-on-danger']};`);
  lines.push(`--kj-fg-on-inverse: ${t.bg['bg-body']};`);

  // Class C — intent-as-text (derived from the intent surface tokens)
  lines.push(`--kj-fg-primary: ${t.bg['bg-primary']};`);
  lines.push(`--kj-fg-accent:  ${t.bg['bg-accent']};`);
  lines.push(`--kj-fg-info:    ${t.bg['bg-info']};`);
  lines.push(`--kj-fg-success: ${t.bg['bg-success']};`);
  lines.push(`--kj-fg-warning: ${t.bg['bg-warning']};`);
  lines.push(`--kj-fg-danger:  ${t.bg['bg-danger']};`);

  // ── Borders (derived) ──
  lines.push(`--kj-border-default:  ${t.bg['bg-elevated']};`);
  lines.push(`--kj-border-muted:    ${t.bg['bg-field']};`);
  lines.push(`--kj-border-strong:   color-mix(in oklch, ${t.bg['bg-elevated']} 60%, ${t.fg['fg-default']});`);
  lines.push(`--kj-border-focus:    ${t.bg['bg-primary']};`);
  lines.push(`--kj-border-disabled: ${t.bg['bg-elevated']};`);
  lines.push(`--kj-border-primary:  ${t.bg['bg-primary']};`);
  lines.push(`--kj-border-danger:   ${t.bg['bg-danger']};`);

  // ── Shadows (theme-independent values) ──
  lines.push(`--kj-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);`);
  lines.push(`--kj-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);`);
  lines.push(`--kj-shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.18);`);
  lines.push(`--kj-shadow-focus: 0 0 0 3px color-mix(in oklch, ${t.bg['bg-primary']} 40%, transparent);`);

  return `[data-theme="${name}"] {\n  ${lines.join('\n  ')}\n}`;
}
