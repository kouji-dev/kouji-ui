import { signal } from '@angular/core';
import { afterEach, describe, expect, it } from 'vitest';
import { solidBackdrop } from './solid';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(null), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('solidBackdrop', () => {
  const nodes: Element[] = [];
  const mount = <T extends Element>(el: T): T => { document.body.appendChild(el); nodes.push(el); return el; };
  afterEach(() => { for (const n of nodes) n.remove(); nodes.length = 0; });

  function portalled(): { app: HTMLElement; panel: HTMLElement } {
    const app = mount(document.createElement('app-root'));
    const container = mount(document.createElement('div'));
    container.className = 'kj-overlay-container';
    const wrapper = document.createElement('div');
    wrapper.className = 'kj-overlay-wrapper';
    const panel = document.createElement('div');
    wrapper.appendChild(panel);
    container.appendChild(wrapper);
    return { app, panel };
  }

  it('default options', () => {
    const s = solidBackdrop();
    expect(s.inertSiblings).toBe(true);
    expect(s.closeOnClick).toBe(true);
    expect(s.className).toBe('kj-backdrop');
  });

  it('honours overrides', () => {
    const s = solidBackdrop({ inert: false, closeOnClick: false, className: 'x' });
    expect(s.inertSiblings).toBe(false);
    expect(s.closeOnClick).toBe(false);
    expect(s.className).toBe('x');
  });

  it('inert: true (default) freezes the page behind the overlay on open and thaws it on close', () => {
    const { app, panel } = portalled();
    const s = solidBackdrop();
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(app.hasAttribute('inert')).toBe(true);
    expect(panel.closest('.kj-overlay-container')!.hasAttribute('inert')).toBe(false);
    s.onClose!();
    expect(app.hasAttribute('inert')).toBe(false);
  });

  it('inert: false never touches the page', () => {
    const { app, panel } = portalled();
    const s = solidBackdrop({ inert: false });
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(app.hasAttribute('inert')).toBe(false);
    s.onClose!();
  });

  it('detach releases inert held by an overlay disposed while open', () => {
    const { app, panel } = portalled();
    const s = solidBackdrop();
    s.attach(makeCtx(panel));
    s.onOpen!();
    s.detach();
    expect(app.hasAttribute('inert')).toBe(false);
  });
});
