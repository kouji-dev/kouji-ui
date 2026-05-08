import { describe, it, expect } from 'vitest';
import { silent } from './silent';

describe('silent', () => {
  it('announce is a no-op (no live region created)', () => {
    document.querySelectorAll('[data-kj-live-region]').forEach(el => el.remove());
    const s = silent();
    s.attach({} as never);
    s.announce('hello');
    expect(document.querySelector('[data-kj-live-region]')).toBeNull();
  });
});
