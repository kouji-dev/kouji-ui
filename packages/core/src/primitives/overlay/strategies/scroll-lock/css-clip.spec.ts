import { describe, it, expect, afterEach } from 'vitest';
import { cssClip } from './css-clip';

const html = (): HTMLElement => document.documentElement;

describe('cssClip', () => {
  afterEach(() => {
    html().style.overflow = '';
    html().removeAttribute('data-kj-scroll-lock');
    html().removeAttribute('data-kj-scroll-lock-saved');
  });

  it('onOpen sets overflow:clip; onClose restores', () => {
    const s = cssClip();
    s.attach({} as never);
    s.onOpen!();
    expect(html().style.overflow).toBe('clip');
    s.onClose!();
    expect(html().style.overflow).toBe('');
  });

  it('restores the page even when two instances release out of order (mfe F-2)', () => {
    const a = cssClip();
    const b = cssClip();
    a.attach({} as never);
    b.attach({} as never);
    a.onOpen!();
    b.onOpen!();
    expect(html().getAttribute('data-kj-scroll-lock')).toBe('2');
    a.onClose!();
    b.onClose!();
    expect(html().style.overflow).toBe('');
  });

  it('does nothing off-browser (ssr F-14)', () => {
    const s = cssClip();
    s.attach({ platform: { isBrowser: false } } as never);
    s.onOpen!();
    expect(html().style.overflow).toBe('');
    expect(html().hasAttribute('data-kj-scroll-lock')).toBe(false);
  });
});
