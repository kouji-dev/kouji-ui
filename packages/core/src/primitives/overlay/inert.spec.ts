import { afterEach, describe, expect, it } from 'vitest';
import { inertSiblingsOf, releaseInert, retainInert } from './inert';

function mkWrapper(container: HTMLElement): { wrapper: HTMLElement; panel: HTMLElement } {
  const wrapper = document.createElement('div');
  wrapper.className = 'kj-overlay-wrapper';
  const panel = document.createElement('div');
  wrapper.appendChild(panel);
  container.appendChild(wrapper);
  return { wrapper, panel };
}

describe('inert helpers', () => {
  const added: Element[] = [];
  const add = <T extends Element>(el: T): T => { document.body.appendChild(el); added.push(el); return el; };

  afterEach(() => {
    for (const el of added) el.remove();
    added.length = 0;
  });

  it('retainInert / releaseInert are reference counted', () => {
    const el = add(document.createElement('div'));
    retainInert(el);
    retainInert(el);
    expect(el.hasAttribute('inert')).toBe(true);
    releaseInert(el);
    expect(el.hasAttribute('inert')).toBe(true);
    releaseInert(el);
    expect(el.hasAttribute('inert')).toBe(false);
  });

  it('never removes an inert attribute the app set itself', () => {
    const el = add(document.createElement('div'));
    el.setAttribute('inert', '');
    retainInert(el);
    releaseInert(el);
    expect(el.hasAttribute('inert')).toBe(true);
  });

  it('inertSiblingsOf freezes body-level siblings and earlier wrappers, not later ones or live regions', () => {
    const app = add(document.createElement('app-root'));
    const live = add(document.createElement('div'));
    live.setAttribute('aria-live', 'polite');
    const container = add(document.createElement('div'));
    container.className = 'kj-overlay-container';
    const below = mkWrapper(container);
    const own = mkWrapper(container);
    const above = mkWrapper(container);

    const release = inertSiblingsOf(own.panel);
    expect(app.hasAttribute('inert')).toBe(true);
    expect(live.hasAttribute('inert')).toBe(false);
    expect(container.hasAttribute('inert')).toBe(false);
    expect(below.wrapper.hasAttribute('inert')).toBe(true);
    expect(own.wrapper.hasAttribute('inert')).toBe(false);
    expect(above.wrapper.hasAttribute('inert')).toBe(false);

    release();
    release();
    expect(app.hasAttribute('inert')).toBe(false);
    expect(below.wrapper.hasAttribute('inert')).toBe(false);
  });

  it('two stacked modals keep the page inert until the last one releases', () => {
    const app = add(document.createElement('app-root'));
    const container = add(document.createElement('div'));
    container.className = 'kj-overlay-container';
    const a = mkWrapper(container);
    const b = mkWrapper(container);

    const releaseA = inertSiblingsOf(a.panel);
    const releaseB = inertSiblingsOf(b.panel);
    expect(app.hasAttribute('inert')).toBe(true);
    expect(a.wrapper.hasAttribute('inert')).toBe(true);
    releaseB();
    expect(app.hasAttribute('inert')).toBe(true);
    expect(a.wrapper.hasAttribute('inert')).toBe(false);
    releaseA();
    expect(app.hasAttribute('inert')).toBe(false);
  });

  it('leaves a body child that contains the panel alone (inline-mounted modal)', () => {
    const app = add(document.createElement('app-root'));
    const panel = document.createElement('div');
    app.appendChild(panel);
    const other = add(document.createElement('div'));
    const release = inertSiblingsOf(panel);
    expect(app.hasAttribute('inert')).toBe(false);
    expect(other.hasAttribute('inert')).toBe(true);
    release();
    expect(other.hasAttribute('inert')).toBe(false);
  });
});
