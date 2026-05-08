import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { KjId } from './id';

describe('KjId', () => {
  it('mints unique ids with default prefix', () => {
    const svc = TestBed.inject(KjId);
    expect(svc.mint()).not.toBe(svc.mint());
  });

  it('honours custom prefix', () => {
    const svc = TestBed.inject(KjId);
    expect(svc.mint('panel')).toMatch(/^kj-panel-\d+$/);
  });

  it('produces deterministic sequence within an injector', () => {
    const svc = TestBed.inject(KjId);
    const a = svc.mint('x');
    const b = svc.mint('x');
    const aN = Number(a.split('-').at(-1));
    const bN = Number(b.split('-').at(-1));
    expect(bN).toBe(aN + 1);
  });
});
