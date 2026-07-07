import { describe, it, expect } from 'vitest';
import { resolveChartPalette } from './chart-tokens';

function makeHost(vars: Record<string, string>): HTMLElement {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  document.body.appendChild(el);
  return el;
}

describe('resolveChartPalette', () => {
  it('returns 6 colors when --kj-chart-1..6 are all set', () => {
    const host = makeHost({
      '--kj-chart-1': '#aaa', '--kj-chart-2': '#bbb', '--kj-chart-3': '#ccc',
      '--kj-chart-4': '#ddd', '--kj-chart-5': '#eee', '--kj-chart-6': '#fff',
    });
    expect(resolveChartPalette(host)).toEqual(['#aaa', '#bbb', '#ccc', '#ddd', '#eee', '#fff']);
  });

  it('falls back to --kj-bg-* intent vars when chart vars are absent', () => {
    const host = makeHost({
      '--kj-bg-primary': '#111', '--kj-bg-accent': '#222',
      '--kj-bg-success': '#333', '--kj-bg-warning': '#444', '--kj-bg-danger': '#555',
    });
    expect(resolveChartPalette(host)).toEqual(['#111', '#222', '#333', '#444', '#555']);
  });

  it('mixes chart vars with intent-var fallback for missing slots', () => {
    const host = makeHost({
      '--kj-chart-1': '#aaa', '--kj-chart-2': '#bbb',
      '--kj-bg-success': '#333', '--kj-bg-warning': '#444', '--kj-bg-danger': '#555',
    });
    expect(resolveChartPalette(host)).toEqual(['#aaa', '#bbb', '#333', '#444', '#555']);
  });

  it('returns empty array when no relevant vars are set', () => {
    const host = makeHost({});
    expect(resolveChartPalette(host)).toEqual([]);
  });

  it('trims whitespace from CSS var values', () => {
    const host = makeHost({ '--kj-chart-1': '  #aaa  ' });
    expect(resolveChartPalette(host)).toEqual(['#aaa']);
  });
});
