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
});
