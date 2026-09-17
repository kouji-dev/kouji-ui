import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { KJ_OVERLAY_Z_BASE, KjOverlayStack, applyOverlayZIndex, clearOverlayZIndex } from './stack';

/** A pointer press that begins and ends on `el`, as an engine dispatches it. */
function pressAndClick(el: Element): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
}

describe('KjOverlayStack', () => {
  it('register returns a handle with isTopmost=true for newly registered', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const handle = stack.register('a', { onClose });
    expect(handle.isTopmost()).toBe(true);
    handle.unregister();
  });

  it('only the topmost receives Escape, with the "escape" reason', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const closeA = vi.fn();
    const closeB = vi.fn();
    const ha = stack.register('a', { onClose: closeA });
    const hb = stack.register('b', { onClose: closeB });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeB).toHaveBeenCalledTimes(1);
    expect(closeB).toHaveBeenCalledWith('escape');
    expect(closeA).not.toHaveBeenCalled();
    ha.unregister(); hb.unregister();
  });

  it('an outside press dismisses on its click, not on the down event, and only when it began outside contentEl', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const inside = document.createElement('div');
    const outside = document.createElement('div');
    document.body.append(inside, outside);
    const handle = stack.register('a', { onClose });
    stack.markContentEl('a', inside);

    pressAndClick(inside);
    expect(onClose).not.toHaveBeenCalled();

    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose, 'the down event arms the press, nothing more').not.toHaveBeenCalled();
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith('outside');

    handle.unregister();
    inside.remove(); outside.remove();
  });

  it('a click with no press of its own outside contentEl does not dismiss, a secondary-button press dismisses on the down event', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const inside = document.createElement('div');
    const outside = document.createElement('div');
    document.body.append(inside, outside);
    const handle = stack.register('a', { onClose });
    stack.markContentEl('a', inside);

    // A retargeted click: its press began on a node that has since left the document.
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(onClose).not.toHaveBeenCalled();

    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(onClose).toHaveBeenCalledWith('outside');

    handle.unregister();
    inside.remove(); outside.remove();
  });

  it('a press on the registered trigger element is the trigger\'s gesture, not an outside press', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const content = document.createElement('div');
    const trigger = document.createElement('button');
    const icon = document.createElement('span');
    trigger.appendChild(icon);
    document.body.append(content, trigger);
    const handle = stack.register('a', { onClose, triggerEl: () => trigger });
    stack.markContentEl('a', content);

    pressAndClick(icon);
    expect(onClose).not.toHaveBeenCalled();
    pressAndClick(document.body);
    expect(onClose).toHaveBeenCalledWith('outside');

    handle.unregister();
    content.remove(); trigger.remove();
  });

  it('an entry that marked no content element is never dismissed by an outside press', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const handle = stack.register('a', { onClose });
    pressAndClick(document.body);
    expect(onClose).not.toHaveBeenCalled();
    handle.unregister();
  });

  it('respects closeOnEsc=false and closeOnOutside=false', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const content = document.createElement('div');
    document.body.appendChild(content);
    const handle = stack.register('a', { onClose, closeOnEsc: false, closeOnOutside: false });
    stack.markContentEl('a', content);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    pressAndClick(document.body);
    expect(onClose).not.toHaveBeenCalled();
    handle.unregister();
    content.remove();
  });

  it('closeOnEsc=false on the topmost entry does not let Escape fall through to the one beneath', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const closeA = vi.fn();
    const closeB = vi.fn();
    const ha = stack.register('a', { onClose: closeA });
    const hb = stack.register('b', { onClose: closeB, closeOnEsc: false });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closeA).not.toHaveBeenCalled();
    expect(closeB).not.toHaveBeenCalled();
    hb.unregister(); ha.unregister();
  });

  it('a passive entry takes a level above what is open but never owns a gesture (F-4)', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const closeDialog = vi.fn();
    const closeToast = vi.fn();
    const content = document.createElement('div');
    document.body.appendChild(content);
    const dialog = stack.register('dialog', { onClose: closeDialog });
    stack.markContentEl('dialog', content);
    const toast = stack.register('toast', { onClose: closeToast, passive: true });

    expect(toast.zIndex).toBeGreaterThan(dialog.zIndex);
    expect(toast.isTopmost()).toBe(false);
    expect(dialog.isTopmost(), 'the dialog still owns gestures under a toast').toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closeDialog).toHaveBeenCalledWith('escape');
    expect(closeToast).not.toHaveBeenCalled();

    pressAndClick(document.body);
    expect(closeDialog).toHaveBeenCalledWith('outside');
    expect(closeToast).not.toHaveBeenCalled();

    toast.unregister(); dialog.unregister();
    content.remove();
  });
});

describe('KjOverlayStack — z-index stacking', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });
  afterEach(() => {
    document.documentElement.style.removeProperty('--kj-overlay-z-base');
  });

  it('a single overlay gets the base level (1000)', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const a = stack.register('a', { onClose: () => {} });
    expect(a.zIndex).toBe(1000);
    expect(stack.zIndexOf('a')).toBe(1000);
    a.unregister();
    expect(stack.zIndexOf('a')).toBeNull();
  });

  it('three nested levels are strictly increasing', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const a = stack.register('a', { onClose: () => {} });
    const b = stack.register('b', { onClose: () => {} });
    const c = stack.register('c', { onClose: () => {} });
    expect([a.zIndex, b.zIndex, c.zIndex]).toEqual([1000, 1001, 1002]);
    expect(b.zIndex).toBeGreaterThan(a.zIndex);
    expect(c.zIndex).toBeGreaterThan(b.zIndex);
    c.unregister(); b.unregister(); a.unregister();
  });

  it('closing the inner overlay restores: the next one reopens one above what is still open', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const outer = stack.register('outer', { onClose: () => {} });
    const inner = stack.register('inner', { onClose: () => {} });
    expect(inner.zIndex).toBe(1001);
    inner.unregister();
    expect(stack.zIndexOf('outer')).toBe(1000);
    expect(stack.nextZIndex).toBe(1001);
    const again = stack.register('inner-2', { onClose: () => {} });
    expect(again.zIndex).toBe(1001);
    again.unregister(); outer.unregister();
    expect(stack.nextZIndex).toBe(1000);
  });

  it('a later overlay never sinks below an earlier one when a middle overlay closes', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const a = stack.register('a', { onClose: () => {} });
    const b = stack.register('b', { onClose: () => {} });
    const c = stack.register('c', { onClose: () => {} });
    b.unregister();
    // c keeps 1002; the next overlay goes above c, not into b's old slot.
    expect(stack.zIndexOf('c')).toBe(1002);
    const d = stack.register('d', { onClose: () => {} });
    expect(d.zIndex).toBe(1003);
    d.unregister(); c.unregister(); a.unregister();
  });

  it('KJ_OVERLAY_Z_BASE moves the whole stack', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: KJ_OVERLAY_Z_BASE, useValue: 5000 }] });
    const stack = TestBed.inject(KjOverlayStack);
    const a = stack.register('a', { onClose: () => {} });
    const b = stack.register('b', { onClose: () => {} });
    expect([a.zIndex, b.zIndex]).toEqual([5000, 5001]);
    b.unregister(); a.unregister();
  });

  it('--kj-overlay-z-base on :root is the fallback while the token is at its default (when the browser resolves it)', () => {
    const stack = TestBed.inject(KjOverlayStack);
    document.documentElement.style.setProperty('--kj-overlay-z-base', '3000');
    const resolved = getComputedStyle(document.documentElement).getPropertyValue('--kj-overlay-z-base').trim();
    const a = stack.register('a', { onClose: () => {} });
    // jsdom may not surface custom properties through getComputedStyle; in
    // that case the DI base still applies.
    expect(a.zIndex).toBe(resolved === '3000' ? 3000 : 1000);
    a.unregister();
  });

  it('a KJ_OVERLAY_Z_BASE provided by the app wins over --kj-overlay-z-base on :root (cust F-9)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: KJ_OVERLAY_Z_BASE, useValue: 5000 }] });
    const stack = TestBed.inject(KjOverlayStack);
    document.documentElement.style.setProperty('--kj-overlay-z-base', '3000');
    const a = stack.register('a', { onClose: () => {} });
    expect(a.zIndex).toBe(5000);
    a.unregister();
  });

  it('applyOverlayZIndex writes --kj-overlay-z on the panel and z-index on its .kj-overlay-wrapper; clear reverses', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'kj-overlay-wrapper';
    const panel = document.createElement('div');
    wrapper.appendChild(panel);

    applyOverlayZIndex(panel, 1004);
    expect(panel.style.getPropertyValue('--kj-overlay-z')).toBe('1004');
    expect(wrapper.style.getPropertyValue('--kj-overlay-z')).toBe('1004');
    expect(wrapper.style.zIndex).toBe('1004');

    clearOverlayZIndex(panel);
    expect(panel.style.getPropertyValue('--kj-overlay-z')).toBe('');
    expect(wrapper.style.getPropertyValue('--kj-overlay-z')).toBe('');
    expect(wrapper.style.zIndex).toBe('');
  });

  it('applyOverlayZIndex leaves a non-wrapper parent alone', () => {
    const parent = document.createElement('div');
    const panel = document.createElement('div');
    parent.appendChild(panel);
    applyOverlayZIndex(panel, 1000);
    expect(panel.style.getPropertyValue('--kj-overlay-z')).toBe('1000');
    expect(parent.style.zIndex).toBe('');
    expect(parent.style.getPropertyValue('--kj-overlay-z')).toBe('');
  });
});
