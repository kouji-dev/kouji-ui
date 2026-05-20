import { describe, expect, it } from 'vitest';
import { exportCsv, exportJson, toTsv } from './table-export';

describe('exportCsv', () => {
  it('escapes commas + quotes + newlines', () => {
    const csv = exportCsv({
      rows: [{ a: 'hi, bob', b: 'with "quotes"', c: 'line\nbreak' }],
      columns: ['a', 'b', 'c'],
    });
    expect(csv).toBe('a,b,c\n"hi, bob","with ""quotes""","line\nbreak"');
  });
  it('uses column accessors via the getValue fn', () => {
    const csv = exportCsv({
      rows: [{ name: 'Alice' }],
      columns: ['name'],
      getValue: (row, col) => col === 'name' ? (row as { name: string }).name.toUpperCase() : '',
    });
    expect(csv).toBe('name\nALICE');
  });
});

describe('exportJson', () => {
  it('pretty-prints by default', () => {
    const json = exportJson({ rows: [{ a: 1 }] });
    expect(json).toBe('[\n  {\n    "a": 1\n  }\n]');
  });
});

describe('toTsv', () => {
  it('returns tab-separated values', () => {
    expect(toTsv({ rows: [{ a: 1, b: 2 }], columns: ['a', 'b'] })).toBe('a\tb\n1\t2');
  });
});
