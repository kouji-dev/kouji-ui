import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { KjBackdrop } from './backdrop';
import { KjDismissPress } from './dismiss-press';
import { KjOverlayController } from './controller';
import { KjOverlayStack } from './stack';
import { KJ_OVERLAY_BACKDROP_STRATEGY } from './tokens';

/** A pointer-driven click, as an engine dispatches it (`detail >= 1`). */
function pointerClick(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
}

function press(el: Element): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
}

describe('KjDismissPress', () => {
  it('a click is owned only when a press armed it', () => {
    const p = new KjDismissPress();
    expect(p.owns(new MouseEvent('click', { detail: 1 }))).toBe(false);
    p.arm();
    expect(p.owns(new MouseEvent('click', { detail: 1 }))).toBe(true);
  });

  it('an arming is consumed by the first click it answers', () => {
    const p = new KjDismissPress();
    p.arm();
    expect(p.owns(new MouseEvent('click', { detail: 1 }))).toBe(true);
    expect(p.owns(new MouseEvent('click', { detail: 1 }))).toBe(false);
  });

  it('a click with no pointer behind it (detail 0) is always owned', () => {
    // `element.click()`, keyboard activation, assistive tooling: no
    // pointerdown ever arrives, so there is nothing to match against.
    const p = new KjDismissPress();
    expect(p.owns(new MouseEvent('click'))).toBe(true);
  });

  it('reset drops a pending arming', () => {
    const p = new KjDismissPress();
    p.arm();
    p.reset();
    expect(p.owns(new MouseEvent('click', { detail: 1 }))).toBe(false);
  });
});

describe('KjBackdrop dismisses only a press it owns', () => {
  async function mount(closeOnClick = true) {
    @Component({
      standalone: true,
      imports: [KjBackdrop],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useValue: {
          inertSiblings: true, closeOnClick, className: 'kj-backdrop',
          attach() {}, onOpen() {}, onClose() {}, detach() {},
        }},
      ],
      template: '<kj-backdrop></kj-backdrop>',
    })
    class Host {
      readonly ctrl = inject(KjOverlayController);
    }
    const { fixture, container } = await render(Host);
    const closeSpy = vi.spyOn(fixture.componentInstance.ctrl, 'close');
    return { el: container.querySelector('kj-backdrop') as HTMLElement, closeSpy };
  }

  it('a press on the scrim followed by its click closes', async () => {
    const { el, closeSpy } = await mount();
    press(el);
    pointerClick(el);
    expect(closeSpy).toHaveBeenCalledWith('outside');
  });

  it('a click retargeted onto the scrim, with no press of its own, does not close', async () => {
    // The gesture began on an element in an overlay above that was
    // re-rendered away before the pointer came up; the engine handed the
    // click to whatever was underneath — this scrim.
    const { el, closeSpy } = await mount();
    pointerClick(el);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('an arming is not reusable by a second, stray click', async () => {
    const { el, closeSpy } = await mount();
    press(el);
    pointerClick(el);
    closeSpy.mockClear();
    pointerClick(el);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('closeOnClick=false still wins over an owned press', async () => {
    const { el, closeSpy } = await mount(false);
    press(el);
    pointerClick(el);
    expect(closeSpy).not.toHaveBeenCalled();
  });
});

describe('KjOverlayStack outside-detection', () => {
  it('a pointerdown whose target has left the document is not an outside click', () => {
    // `contains()` reports false for a detached node exactly as it would
    // for a genuine outside click, so an overlay would dismiss on a
    // gesture that started inside it and was re-rendered away.
    const stack = TestBed.inject(KjOverlayStack);
    const content = document.createElement('div');
    const inner = document.createElement('span');
    content.appendChild(inner);
    document.body.appendChild(content);

    // Registered BEFORE the overlay, so this capture listener runs first
    // and can detach the target while the event is still in flight —
    // which is what a re-render does mid-gesture.
    const detach = () => inner.remove();
    document.addEventListener('pointerdown', detach, true);

    const onClose = vi.fn();
    const handle = stack.register('probe', { onClose });
    stack.markContentEl('probe', content);

    inner.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(inner.isConnected, 'the target left the document mid-dispatch').toBe(false);
    expect(onClose, 'a vanished target is not "outside"').not.toHaveBeenCalled();

    document.removeEventListener('pointerdown', detach, true);
    handle.unregister();
    content.remove();
  });

  it('a pointerdown on a node that never was inside still dismisses', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const content = document.createElement('div');
    document.body.appendChild(content);
    const outside = document.createElement('div');
    document.body.appendChild(outside);

    const onClose = vi.fn();
    const handle = stack.register('probe2', { onClose });
    stack.markContentEl('probe2', content);

    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).toHaveBeenCalled();

    handle.unregister();
    content.remove();
    outside.remove();
  });
});
