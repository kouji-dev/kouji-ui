import { describe, it, expect, afterEach } from 'vitest';
import { cssClip } from './css-clip';

describe('cssClip', () => {
  afterEach(() => { document.documentElement.style.overflow = ''; });

  it('onOpen sets overflow:clip; onClose restores', () => {
    const s = cssClip();
    s.attach({} as never);
    s.onOpen!();
    expect(document.documentElement.style.overflow).toBe('clip');
    s.onClose!();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
