import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tabCycle } from './tab-cycle';
import { KjOverlayController } from '../../controller';
import type { KjOverlayStrategies } from '../../controller';
import type { KjFocusTrapStrategy } from '../../tokens';

/**
 * Every test drives the strategy through a real `KjOverlayController` —
 * the wiring that was missing when the Tab listener never got installed —
 * and dispatches keys from `document.activeElement`, the only place a
 * user's keystroke can originate.
 */
function baseStrategies(focusTrap: KjFocusTrapStrategy | null): KjOverlayStrategies {
  return {
    mount: { portalled: false, attach() {}, onOpen() {}, onClose() {}, detach() {}, resolveContainer: () => document.body },
    position: { attach() {}, onOpen() {}, onClose() {}, detach() {}, update() {} },
    focusTrap,
  };
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

function pressTab(shiftKey = false): boolean {
  const target = document.activeElement ?? document.body;
  return target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));
}

function button(label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  return b;
}

describe('tabCycle', () => {
  let ctrl: KjOverlayController;
  const nodes: Element[] = [];
  const mount = <T extends Element>(el: T): T => { document.body.appendChild(el); nodes.push(el); return el; };
  const newController = (): KjOverlayController =>
    Injector.create({ providers: [KjOverlayController], parent: TestBed.inject(Injector) }).get(KjOverlayController);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    ctrl = newController();
  });

  afterEach(async () => {
    ctrl.dispose();
    await settle();
    for (const n of nodes) n.remove();
    nodes.length = 0;
  });

  async function openPanel(panel: HTMLElement, trap: KjFocusTrapStrategy = tabCycle()): Promise<void> {
    ctrl.bindPanel(panel);
    ctrl.attachStrategies(baseStrategies(trap));
    ctrl.open();
    await settle();
    expect(ctrl.state()).toBe('open');
  }

  it('Tab from the last tabbable wraps to the first; Shift+Tab from the first wraps to the last', async () => {
    const panel = mount(document.createElement('div'));
    const a = button('a'), b = button('b');
    panel.append(a, b);
    await openPanel(panel);

    b.focus();
    expect(document.activeElement).toBe(b);
    expect(pressTab()).toBe(false);
    expect(document.activeElement).toBe(a);

    expect(pressTab(true)).toBe(false);
    expect(document.activeElement).toBe(b);
  });

  it('Tab in the middle of the panel is left to the browser', async () => {
    const panel = mount(document.createElement('div'));
    const a = button('a'), b = button('b'), c = button('c');
    panel.append(a, b, c);
    await openPanel(panel);

    b.focus();
    expect(pressTab()).toBe(true);
    expect(document.activeElement).toBe(b);
  });

  it('hidden, disabled and tabindex="-1" elements are not stops', async () => {
    const panel = mount(document.createElement('div'));
    const a = button('a');
    const hidden = button('hidden');
    hidden.setAttribute('hidden', '');
    const disabled = button('disabled');
    disabled.disabled = true;
    const skipped = button('skipped');
    skipped.tabIndex = -1;
    const b = button('b');
    panel.append(a, hidden, disabled, b, skipped);
    await openPanel(panel);

    b.focus();
    pressTab();
    expect(document.activeElement).toBe(a);
    pressTab(true);
    expect(document.activeElement).toBe(b);
  });

  it('a panel with no tabbable element takes focus itself and keeps it on Tab', async () => {
    const panel = mount(document.createElement('div'));
    panel.textContent = 'Just text';
    await openPanel(panel);

    expect(panel.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(panel);
    expect(pressTab()).toBe(false);
    expect(document.activeElement).toBe(panel);
    expect(pressTab(true)).toBe(false);
    expect(document.activeElement).toBe(panel);
  });

  it('focus that escapes the panel is pulled back to the last focused element inside', async () => {
    const outside = mount(button('outside'));
    const panel = mount(document.createElement('div'));
    const a = button('a'), b = button('b');
    panel.append(a, b);
    await openPanel(panel);

    b.focus();
    outside.focus();
    expect(document.activeElement).toBe(b);
  });

  it('initial focus: [kjAutofocus] wins by default, "first" picks the first tabbable, and focus already inside is left alone', async () => {
    const panel = mount(document.createElement('div'));
    const a = button('a'), b = button('b');
    b.setAttribute('kjAutofocus', '');
    panel.append(a, b);
    await openPanel(panel);
    expect(document.activeElement).toBe(b);
    ctrl.close();
    await settle();

    const second = newController();
    const other = mount(document.createElement('div'));
    const c = button('c'), d = button('d');
    d.setAttribute('kjAutofocus', '');
    other.append(c, d);
    second.bindPanel(other);
    second.attachStrategies(baseStrategies(tabCycle({ initialFocus: 'first' })));
    second.open();
    await settle();
    expect(document.activeElement).toBe(c);
    second.dispose();
    await settle();

    const third = newController();
    const list = mount(document.createElement('div'));
    const e = button('e'), f = button('f');
    list.append(e, f);
    third.bindPanel(list);
    third.attachStrategies(baseStrategies(tabCycle()));
    third.open();
    f.focus();
    await settle();
    expect(document.activeElement).toBe(f);
    third.dispose();
  });

  it('returns focus to the opener on close, and not when returnFocus is false', async () => {
    const opener = mount(button('opener'));
    const panel = mount(document.createElement('div'));
    const a = button('a');
    panel.append(a);
    opener.focus();
    await openPanel(panel);
    expect(document.activeElement).toBe(panel);
    a.focus();

    ctrl.close();
    await settle();
    expect(document.activeElement).toBe(opener);

    const second = newController();
    const other = mount(document.createElement('div'));
    const b = button('b');
    other.append(b);
    opener.focus();
    second.bindPanel(other);
    second.attachStrategies(baseStrategies(tabCycle({ returnFocus: false })));
    second.open();
    await settle();
    b.focus();
    second.close();
    await settle();
    expect(document.activeElement).not.toBe(opener);
    second.dispose();
  });

  it('enabled: false arms neither Tab cycling nor initial focus, but still hands focus back on close', async () => {
    const opener = mount(button('opener'));
    const panel = mount(document.createElement('div'));
    const a = button('a'), b = button('b');
    panel.append(a, b);
    opener.focus();
    await openPanel(panel, tabCycle({ enabled: false }));
    expect(document.activeElement).toBe(opener);

    b.focus();
    expect(pressTab()).toBe(true);
    expect(document.activeElement).toBe(b);

    ctrl.close();
    await settle();
    expect(document.activeElement).toBe(opener);
  });

  it('yields to an overlay stacked above it', async () => {
    const panel = mount(document.createElement('div'));
    const a = button('a');
    panel.append(a);
    await openPanel(panel);
    a.focus();
    expect(document.activeElement).toBe(a);

    const nested = newController();
    const inner = mount(document.createElement('div'));
    const n = button('n');
    inner.append(n);
    nested.bindPanel(inner);
    nested.attachStrategies(baseStrategies(null));
    nested.open();
    await settle();

    n.focus();
    expect(document.activeElement).toBe(n);
    expect(pressTab()).toBe(true);
    expect(document.activeElement).toBe(n);

    nested.close();
    await settle();
    expect(document.activeElement).toBe(a);
    pressTab();
    expect(document.activeElement).toBe(a);
    nested.dispose();
  });
});
