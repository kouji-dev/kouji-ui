import { describe, it, expect } from 'vitest';
import { noBackdrop } from './none';

describe('noBackdrop', () => {
  it('inert/closeOnClick both false', () => {
    const s = noBackdrop();
    expect(s.inertSiblings).toBe(false);
    expect(s.closeOnClick).toBe(false);
  });
});
