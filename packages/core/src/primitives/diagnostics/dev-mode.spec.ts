import { describe, expect, it, vi } from 'vitest';
import { kjDevAssert, kjDevMode, kjDevWarn, kjError } from './dev-mode';

describe('kjDevMode (arch F-14)', () => {
  it('is true while ngDevMode is unset or truthy, false once it is turned off', () => {
    const g = globalThis as { ngDevMode?: unknown };
    const original = g.ngDevMode;
    try {
      delete g.ngDevMode;
      expect(kjDevMode()).toBe(true);
      g.ngDevMode = true;
      expect(kjDevMode()).toBe(true);
      // What a production build substitutes. The guard has to read the global
      // lazily: Angular sets it during bootstrap, so a module-level snapshot
      // would capture `undefined` and warn in production.
      g.ngDevMode = false;
      expect(kjDevMode()).toBe(false);
    } finally {
      if (original === undefined) delete g.ngDevMode;
      else g.ngDevMode = original;
    }
  });
});

describe('kjDevWarn (arch F-14)', () => {
  it('prints one consistent `[scope] message` shape', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      kjDevWarn('kj-alert', 'static mode requires an accessible name.');
      expect(warn).toHaveBeenCalledWith('[kj-alert] static mode requires an accessible name.');
    } finally {
      warn.mockRestore();
    }
  });

  it('says nothing in a production build', () => {
    const g = globalThis as { ngDevMode?: unknown };
    const original = g.ngDevMode;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      g.ngDevMode = false;
      kjDevWarn('kj-alert', 'never shown');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      if (original === undefined) delete g.ngDevMode;
      else g.ngDevMode = original;
    }
  });
});

describe('kjDevAssert / kjError (arch F-14)', () => {
  it('kjError builds the same scoped shape without throwing', () => {
    const err = kjError('KjProgressBar', 'kjMin (5) must be less than kjMax (1).');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('[KjProgressBar] kjMin (5) must be less than kjMax (1).');
  });

  it('kjDevAssert is a no-op while the invariant holds and throws when it breaks', () => {
    expect(() => kjDevAssert(true, 'KjThing', 'unreachable')).not.toThrow();
    expect(() => kjDevAssert(false, 'KjThing', 'needs a parent')).toThrow('[KjThing] needs a parent');
  });

  it('kjDevAssert builds a lazy message only when it throws', () => {
    const message = vi.fn(() => 'expensive');
    kjDevAssert(1, 'KjThing', message);
    expect(message).not.toHaveBeenCalled();
    expect(() => kjDevAssert(0, 'KjThing', message)).toThrow('[KjThing] expensive');
    expect(message).toHaveBeenCalledTimes(1);
  });
});
