import { describe, it, expect } from 'vitest';
import { noTrap } from './no-trap';

describe('noTrap', () => {
  it('all methods are no-ops', () => {
    const s = noTrap();
    expect(() => { s.attach({} as never); s.focusFirst(); s.restoreFocus(); s.detach(); }).not.toThrow();
  });
});
