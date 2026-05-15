// packages/core/src/primitives/list/selection.spec.ts
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { KjSelectionModel } from './selection';

function setup<T>(): KjSelectionModel<T> {
  TestBed.configureTestingModule({ providers: [KjSelectionModel] });
  return TestBed.inject(KjSelectionModel) as KjSelectionModel<T>;
}

describe('KjSelectionModel', () => {
  it('defaults to single mode with null value', () => {
    const m = setup<string>();
    expect(m.mode()).toBe('single');
    expect(m.value()).toBeNull();
  });

  it('isSelected uses Object.is by default', () => {
    const m = setup<string>();
    m.setValue('a');
    expect(m.isSelected('a')).toBe(true);
    expect(m.isSelected('b')).toBe(false);
  });

  it('toggle in single mode replaces value and returns closeRequested=true', () => {
    const m = setup<string>();
    const r = m.toggle('a');
    expect(m.value()).toBe('a');
    expect(r.closeRequested).toBe(true);
  });

  it('toggle in multi mode adds/removes and returns closeRequested=false', () => {
    const m = setup<string>();
    m.setMode('multi');
    m.toggle('a');
    m.toggle('b');
    expect(m.value()).toEqual(['a', 'b']);

    const r = m.toggle('a');
    expect(m.value()).toEqual(['b']);
    expect(r.closeRequested).toBe(false);
  });

  it('clear in single mode sets null, in multi mode sets []', () => {
    const m = setup<string>();
    m.setValue('a');
    m.clear();
    expect(m.value()).toBeNull();

    m.setMode('multi');
    m.setValue(['a', 'b']);
    m.clear();
    expect(m.value()).toEqual([]);
  });

  it('compareBy custom fn — by id field', () => {
    type Item = { id: string; label: string };
    const m = setup<Item>();
    m.setCompareBy((a, b) => a.id === b.id);
    m.setValue({ id: 'fr', label: 'France' });
    expect(m.isSelected({ id: 'fr', label: 'France (canonical)' })).toBe(true);
    expect(m.isSelected({ id: 'de', label: 'Germany' })).toBe(false);
  });

  it('isSelected returns false when value is null', () => {
    const m = setup<string>();
    expect(m.isSelected('a')).toBe(false);
  });
});
