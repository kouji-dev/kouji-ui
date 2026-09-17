import { describe, it, expect } from 'vitest';
import { KJ_BACKDROP_BLUR_CLASS, blurredBackdrop } from './blurred';

describe('blurredBackdrop', () => {
  it('default className is the solid scrim class plus the blur modifier', () => {
    expect(KJ_BACKDROP_BLUR_CLASS).toBe('kj-backdrop--blur');
    expect(blurredBackdrop().className).toBe('kj-backdrop kj-backdrop--blur');
  });
  it('honours className override', () => {
    expect(blurredBackdrop({ className: 'x' }).className).toBe('x');
  });
  it('is a solid backdrop otherwise: inert page and close-on-click by default', () => {
    const s = blurredBackdrop();
    expect(s.inertSiblings).toBe(true);
    expect(s.closeOnClick).toBe(true);
    expect(blurredBackdrop({ closeOnClick: false }).closeOnClick).toBe(false);
  });
});
