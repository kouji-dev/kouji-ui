import { signal } from '@angular/core';
import { afterEach, describe, expect, it } from 'vitest';
import { inertBased } from './inert-based';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(null), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('inertBased', () => {
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

  it('onOpen makes the page behind the overlay container inert; onClose releases it', () => {
    const { app, panel } = portalled();
    const s = inertBased();
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(app.hasAttribute('inert')).toBe(true);
    expect(panel.closest('.kj-overlay-container')!.hasAttribute('inert')).toBe(false);
    s.onClose!();
    expect(app.hasAttribute('inert')).toBe(false);
  });

  it('detach releases inert left behind by an interrupted close', () => {
    const { app, panel } = portalled();
    const s = inertBased();
    s.attach(makeCtx(panel));
    s.onOpen!();
    s.detach();
    expect(app.hasAttribute('inert')).toBe(false);
  });

  it('focusFirst moves focus into the panel; restoreFocus returns it to the opener', () => {
    const opener = mount(document.createElement('button'));
    const { panel } = portalled();
    const inner = document.createElement('button');
    inner.setAttribute('autofocus', '');
    panel.appendChild(inner);
    opener.focus();

    const s = inertBased();
    s.attach(makeCtx(panel));
    s.onOpen!();
    s.focusFirst();
    expect(document.activeElement).toBe(inner);
    s.onClose!();
    s.restoreFocus();
    expect(document.activeElement).toBe(opener);
  });
});
