import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach } from 'vitest';
import { cssClip } from './css-clip';
import { htmlOverflow } from './html-overflow';

const html = (): HTMLElement => document.documentElement;

describe('htmlOverflow', () => {
  afterEach(() => {
    html().style.overflow = '';
    html().style.paddingRight = '';
    html().removeAttribute('data-kj-scroll-lock');
    html().removeAttribute('data-kj-scroll-lock-saved');
  });

  it('onOpen acquires lock; onClose releases', () => {
    TestBed.runInInjectionContext(() => {
      const s = htmlOverflow();
      s.attach({} as never);
      s.onOpen!();
      expect(html().style.overflow).toBe('hidden');
      s.onClose!();
      expect(html().style.overflow).toBe('');
    });
  });

  it('keeps the refcount and the saved styles on <html>, not in module state (mfe F-2)', () => {
    const s = htmlOverflow();
    s.attach({} as never);
    s.onOpen!();
    expect(html().getAttribute('data-kj-scroll-lock')).toBe('1');
    expect(JSON.parse(html().getAttribute('data-kj-scroll-lock-saved')!)).toEqual({
      'overflow': '',
      'padding-right': '',
    });
    s.onClose!();
    expect(html().hasAttribute('data-kj-scroll-lock')).toBe(false);
    expect(html().hasAttribute('data-kj-scroll-lock-saved')).toBe(false);
  });

  it('a second, independent strategy instance joins the same count', () => {
    const a = htmlOverflow();
    const b = htmlOverflow();
    a.attach({} as never);
    b.attach({} as never);
    a.onOpen!();
    b.onOpen!();
    expect(html().getAttribute('data-kj-scroll-lock')).toBe('2');
    a.onClose!();
    expect(html().style.overflow).toBe('hidden');
    b.onClose!();
    expect(html().style.overflow).toBe('');
  });

  it('a non-LIFO release does not strand the page unscrollable (mfe F-2)', () => {
    // A opens first and saves the page's real overflow; B opens on top of it.
    // Releasing A before B used to hand B's *observed* value ("hidden") back
    // to the page as if it were the original.
    const a = htmlOverflow();
    const b = htmlOverflow();
    a.attach({} as never);
    b.attach({} as never);
    a.onOpen!();
    b.onOpen!();
    a.onClose!();
    b.onClose!();
    expect(html().style.overflow).toBe('');
    expect(html().hasAttribute('data-kj-scroll-lock')).toBe(false);
  });

  it('shares its count with cssClip so mixing strategies cannot strand the page', () => {
    const a = htmlOverflow();
    const b = cssClip();
    a.attach({} as never);
    b.attach({} as never);
    a.onOpen!();
    b.onOpen!();
    expect(html().getAttribute('data-kj-scroll-lock')).toBe('2');
    // The first lock's style wins while anything is still holding.
    expect(html().style.overflow).toBe('hidden');
    a.onClose!();
    expect(html().style.overflow).toBe('hidden');
    b.onClose!();
    expect(html().style.overflow).toBe('');
  });

  it('does nothing when the overlay context reports a non-browser platform (ssr F-14)', () => {
    const s = htmlOverflow();
    s.attach({ platform: { isBrowser: false } } as never);
    s.onOpen!();
    expect(html().hasAttribute('data-kj-scroll-lock')).toBe(false);
    expect(html().style.overflow).toBe('');
  });

  it('release is idempotent', () => {
    const s = htmlOverflow();
    s.attach({} as never);
    s.onOpen!();
    s.onClose!();
    s.onClose!();
    s.detach();
    expect(html().hasAttribute('data-kj-scroll-lock')).toBe(false);
  });
});
