import { describe, it, expect } from 'vitest';
import { blurredBackdrop } from './blurred';

describe('blurredBackdrop', () => {
  it('default className includes --blur', () => {
    expect(blurredBackdrop().className).toBe('kj-backdrop kj-backdrop--blur');
  });
  it('honours className override', () => {
    expect(blurredBackdrop({ className: 'x' }).className).toBe('x');
  });
});
