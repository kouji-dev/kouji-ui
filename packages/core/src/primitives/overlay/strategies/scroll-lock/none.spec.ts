import { describe, it, expect } from 'vitest';
import { noScrollLock } from './none';

describe('noScrollLock', () => {
  it('all methods are no-ops', () => {
    const s = noScrollLock();
    expect(() => { s.attach({} as never); s.onOpen?.(); s.onClose?.(); s.detach(); }).not.toThrow();
  });
});
