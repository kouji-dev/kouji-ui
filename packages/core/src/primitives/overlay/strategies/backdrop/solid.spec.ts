import { describe, it, expect } from 'vitest';
import { solidBackdrop } from './solid';

describe('solidBackdrop', () => {
  it('default options', () => {
    const s = solidBackdrop();
    expect(s.inertSiblings).toBe(true);
    expect(s.closeOnClick).toBe(true);
    expect(s.className).toBe('kj-backdrop');
  });

  it('honours overrides', () => {
    const s = solidBackdrop({ inert: false, closeOnClick: false, className: 'x' });
    expect(s.inertSiblings).toBe(false);
    expect(s.closeOnClick).toBe(false);
    expect(s.className).toBe('x');
  });
});
