import { describe, expect, test } from 'vitest';
import { kjVariantForEdge } from './edge-tag-variant';
import type { Edge } from './theme-a11y-report';

function mockEdge(partial: Partial<Edge>): Edge {
  return {
    id: 'x',
    fgToken: 'a',
    bgToken: 'b',
    fgCss: '#000',
    bgCss: '#fff',
    fgHex: '#000',
    bgHex: '#fff',
    ratio: 4.5,
    requirement: 'AAA-normal',
    requiredMin: 7,
    verdict: 'AA',
    pass: false,
    message: '',
    ...partial,
  };
}

describe('kjVariantForEdge', () => {
  test('failing edge → danger', () => {
    expect(kjVariantForEdge(mockEdge({ pass: false }))).toBe('danger');
  });

  test('AAA verdict → success', () => {
    expect(kjVariantForEdge(mockEdge({ pass: true, verdict: 'AAA' }))).toBe('success');
  });

  test('AA verdict → info', () => {
    expect(kjVariantForEdge(mockEdge({ pass: true, verdict: 'AA' }))).toBe('info');
  });

  test('AA-Large verdict → warning', () => {
    expect(kjVariantForEdge(mockEdge({ pass: true, verdict: 'AA-Large' }))).toBe('warning');
  });
});
