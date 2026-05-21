/**
 * Resolves the chart color palette from kj theme tokens on the given host element.
 * Reads `--kj-chart-1..6` first; for any empty slot, falls back to the matching
 * intent token (`--kj-bg-primary`, `--kj-bg-accent`, `--kj-bg-success`,
 * `--kj-bg-warning`, `--kj-bg-danger`) in that order. Slots that remain empty
 * after fallback are dropped.
 */
export function resolveChartPalette(host: HTMLElement): string[] {
  const cs = getComputedStyle(host);
  const fallbacks = [
    '--kj-bg-primary',
    '--kj-bg-accent',
    '--kj-bg-success',
    '--kj-bg-warning',
    '--kj-bg-danger',
  ];
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    const chart = cs.getPropertyValue(`--kj-chart-${i + 1}`).trim();
    if (chart) {
      out.push(chart);
      continue;
    }
    const fallback = fallbacks[i];
    if (fallback) {
      const v = cs.getPropertyValue(fallback).trim();
      if (v) out.push(v);
    }
  }
  return out;
}
