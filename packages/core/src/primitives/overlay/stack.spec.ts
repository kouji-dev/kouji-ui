import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { KjOverlayStack } from './stack';

describe('KjOverlayStack', () => {
  it('register returns a handle with isTopmost=true for newly registered', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const handle = stack.register('a', { onClose });
    expect(handle.isTopmost()).toBe(true);
    handle.unregister();
  });

  it('only the topmost receives Escape', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const closeA = vi.fn();
    const closeB = vi.fn();
    const ha = stack.register('a', { onClose: closeA });
    const hb = stack.register('b', { onClose: closeB });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeB).toHaveBeenCalledTimes(1);
    expect(closeA).not.toHaveBeenCalled();
    ha.unregister(); hb.unregister();
  });

  it('outside pointerdown calls onClose only when not inside contentEl', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const inside = document.createElement('div');
    document.body.appendChild(inside);
    const handle = stack.register('a', { onClose });
    stack.markContentEl('a', inside);

    inside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);

    handle.unregister();
    inside.remove();
  });

  it('respects closeOnEsc=false and closeOnOutside=false', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const handle = stack.register('a', { onClose, closeOnEsc: false, closeOnOutside: false });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
    handle.unregister();
  });
});
