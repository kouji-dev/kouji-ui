// packages/core/src/primitives/list/type-ahead.spec.ts
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { KjTypeAhead } from './type-ahead';
import type { KjListItem } from './item';

function item(id: string, label: string, disabled = false): KjListItem<unknown> {
  return {
    id,
    label: () => label,
    disabled: () => disabled,
  } as unknown as KjListItem<unknown>;
}

describe('KjTypeAhead', () => {
  let ta: KjTypeAhead;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [KjTypeAhead] });
    ta = TestBed.inject(KjTypeAhead);
  });

  it('returns the first item whose label starts with the typed char', () => {
    const items = [item('1', 'Apple'), item('2', 'Banana')];
    expect(ta.match('b', items)).toBe('2');
  });

  it('buffers consecutive chars within the debounce window', () => {
    const items = [item('1', 'Apple'), item('2', 'Apricot'), item('3', 'Avocado')];
    expect(ta.match('a', items)).toBe('1');
    expect(ta.match('p', items)).toBe('1');
    expect(ta.match('r', items)).toBe('2');
  });

  it('resets the buffer after the debounce window', async () => {
    const items = [item('1', 'Apple'), item('2', 'Banana')];
    ta.debounceMs.set(10);
    expect(ta.match('a', items)).toBe('1');
    await new Promise(r => setTimeout(r, 20));
    expect(ta.match('b', items)).toBe('2');
  });

  it('skips disabled items', () => {
    const items = [item('1', 'Apple', true), item('2', 'Apricot')];
    expect(ta.match('a', items)).toBe('2');
  });

  it('returns null when nothing matches', () => {
    const items = [item('1', 'Apple')];
    expect(ta.match('z', items)).toBeNull();
  });

  it('reset() clears the buffer', () => {
    const items = [item('1', 'Apple'), item('2', 'Banana')];
    ta.match('a', items);
    ta.reset();
    expect(ta.match('b', items)).toBe('2');
  });

  describe('same-letter cycle (APG)', () => {
    const fruit = () => [item('1', 'Apple'), item('2', 'Apricot'), item('3', 'Banana'), item('4', 'Avocado')];

    it('walks through every item starting with the letter instead of searching "aa"', () => {
      const items = fruit();
      expect(ta.match('a', items, null)).toBe('1');
      expect(ta.match('a', items, '1')).toBe('2');
      expect(ta.match('a', items, '2')).toBe('4');
    });

    it('wraps back to the first match at the end of the cycle', () => {
      const items = fruit();
      ta.match('a', items, null);
      expect(ta.match('a', items, '4')).toBe('1');
    });

    it('skips disabled items while cycling', () => {
      const items = [item('1', 'Apple'), item('2', 'Apricot', true), item('3', 'Avocado')];
      expect(ta.match('a', items, null)).toBe('1');
      expect(ta.match('a', items, '1')).toBe('3');
    });

    it('a single press is a prefix search, not a cycle', () => {
      const items = fruit();
      // Nothing buffered yet, so the active item is irrelevant: first match wins.
      expect(ta.match('a', items, '4')).toBe('1');
    });

    it('still buffers when the second character differs', () => {
      const items = fruit();
      expect(ta.match('a', items, null)).toBe('1');
      expect(ta.match('p', items, '1')).toBe('1');
      // "ap" is a prefix search again, not a cycle over "p".
      expect(ta.match('r', items, '1')).toBe('2');
    });

    it('leaves the cycle when a different letter follows it', () => {
      const items = fruit();
      ta.match('a', items, null);
      ta.match('a', items, '1');
      // Buffer is back to one char, so "a" + "v" searches for "av".
      expect(ta.match('v', items, '2')).toBe('4');
    });

    it('returns null when only the cycled letter matches nothing', () => {
      const items = [item('1', 'Apple')];
      expect(ta.match('z', items, '1')).toBeNull();
      expect(ta.match('z', items, '1')).toBeNull();
    });
  });
});
