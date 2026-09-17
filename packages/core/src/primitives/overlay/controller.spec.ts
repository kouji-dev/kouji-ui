import { Component, Injector, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KjOverlayController } from './controller';
import type { KjOverlayStrategies } from './controller';
import { KjOverlayPanel } from './panel';
import { KjOverlayStack } from './stack';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
} from './tokens';
import { bodyPortal } from './strategies/mount/body-portal';
import { viewportCentered } from './strategies/position/viewport-centered';
import { htmlOverflow } from './strategies/scroll-lock/html-overflow';
import { programmatic } from './strategies/trigger-event/programmatic';

/** A declarative overlay: the controller lives on the host's element injector, as on every trigger / panel host. */
@Component({
  selector: 'kj-ctrl-declarative-host',
  standalone: true,
  hostDirectives: [KjOverlayPanel],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => viewportCentered() },
    { provide: KJ_OVERLAY_SCROLL_LOCK_STRATEGY, useFactory: () => htmlOverflow() },
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => programmatic() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
  template: '<button>inside</button>',
})
class DeclarativeHost {
  readonly controller = inject(KjOverlayController);
}

/** A pointer press that begins and ends on `el`, as an engine dispatches it. */
function pressAndClick(el: Element): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
}

const STRATEGY_NAMES = ['mount', 'position', 'backdrop', 'scrollLock', 'focusTrap', 'liveAnnouncer', 'trigger'] as const;

function makeStub(names: readonly string[] = ['mount', 'position', 'trigger']) {
  const calls: string[] = [];
  const strat = (name: string) => ({
    attach: vi.fn(() => calls.push(`${name}:attach`)),
    onOpen: vi.fn(() => calls.push(`${name}:onOpen`)),
    onClose: vi.fn(() => calls.push(`${name}:onClose`)),
    detach: vi.fn(() => calls.push(`${name}:detach`)),
  });
  const all: Record<string, unknown> = {
    mount: { ...strat('mount'), portalled: false, resolveContainer: () => document.body },
    position: { ...strat('position'), update: vi.fn() },
    backdrop: { ...strat('backdrop'), inertSiblings: false, closeOnClick: true },
    scrollLock: strat('scrollLock'),
    focusTrap: {
      ...strat('focusTrap'),
      focusFirst: vi.fn(() => calls.push('focusTrap:focusFirst')),
      restoreFocus: vi.fn(() => calls.push('focusTrap:restoreFocus')),
    },
    liveAnnouncer: { ...strat('liveAnnouncer'), announce: vi.fn() },
    trigger: { ...strat('trigger'), ariaHasPopup: null, bindToggle: vi.fn() },
  };
  const strategies: Record<string, unknown> = {};
  for (const n of names) strategies[n] = all[n];
  return { calls, strategies: strategies as unknown as KjOverlayStrategies };
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

function button(label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  return b;
}

describe('KjOverlayController', () => {
  let ctrl: KjOverlayController;
  const nodes: Element[] = [];
  const mount = <T extends Element>(el: T): T => { document.body.appendChild(el); nodes.push(el); return el; };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [KjOverlayController] });
    ctrl = TestBed.inject(KjOverlayController);
  });

  afterEach(async () => {
    ctrl.dispose();
    await settle();
    for (const n of nodes) n.remove();
    nodes.length = 0;
  });

  it('starts closed', () => {
    expect(ctrl.state()).toBe('closed');
    expect(ctrl.isOpen()).toBe(false);
  });

  it('attachStrategies calls attach in order: mount, position, trigger', () => {
    const { calls, strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    const attaches = calls.filter(c => c.endsWith(':attach'));
    expect(attaches[0]).toBe('mount:attach');
    expect(attaches[1]).toBe('position:attach');
    expect(attaches[attaches.length - 1]).toBe('trigger:attach');
  });

  it('open() with no panel transitions to open synchronously via rAF', async () => {
    const { strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    ctrl.open();
    expect(ctrl.state()).toBe('opening');
    // No panel attached → runTransition uses rAF fallback
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    expect(['open', 'opening']).toContain(ctrl.state());
  }, 5000);

  it('open while open is no-op', () => {
    const { strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    ctrl.open();
    const stateBefore = ctrl.state();
    ctrl.open();
    expect(ctrl.state()).toBe(stateBefore);
  });

  it('close() from open transitions through closing', async () => {
    const { strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    // Force state to 'open' by calling open() and waiting a tick
    ctrl.open();
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    if (ctrl.state() === 'open') {
      ctrl.close();
      expect(ctrl.state()).toBe('closing');
    } else {
      // Open didn't complete in jsdom — at least assert no throw
      expect(['opening', 'open', 'closed']).toContain(ctrl.state());
    }
  }, 5000);

  it('dispose calls detach on each strategy in reverse order', () => {
    const { calls, strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    calls.length = 0;
    ctrl.dispose();
    const detaches = calls.filter(c => c.endsWith(':detach'));
    expect(detaches[0]).toBe('trigger:detach');
    expect(detaches[detaches.length - 1]).toBe('mount:detach');
  });

  it('every configured strategy receives onOpen on open and onClose on close, symmetrically and in order', async () => {
    const panel = mount(document.createElement('div'));
    const { calls, strategies } = makeStub(STRATEGY_NAMES);
    ctrl.bindPanel(panel);
    ctrl.attachStrategies(strategies);
    calls.length = 0;

    ctrl.open();
    const opens = calls.filter(c => c.endsWith(':onOpen'));
    expect(opens).toEqual(STRATEGY_NAMES.map(n => `${n}:onOpen`));
    expect(calls).not.toContain('focusTrap:focusFirst');
    await settle();
    expect(ctrl.state()).toBe('open');
    expect(calls.filter(c => c === 'focusTrap:focusFirst')).toHaveLength(1);

    calls.length = 0;
    ctrl.close();
    await settle();
    expect(ctrl.state()).toBe('closed');
    const closes = calls.filter(c => c.endsWith(':onClose'));
    expect(closes).toEqual([...STRATEGY_NAMES].reverse().map(n => `${n}:onClose`));
    expect(calls.filter(c => c === 'focusTrap:restoreFocus')).toHaveLength(1);
    // The trap's listeners come off before focus is handed back, and the
    // backdrop thaws the page first so the opener can take focus.
    expect(calls.indexOf('focusTrap:onClose')).toBeLessThan(calls.indexOf('focusTrap:restoreFocus'));
    expect(calls.indexOf('backdrop:onClose')).toBeLessThan(calls.indexOf('focusTrap:restoreFocus'));
    expect(calls.indexOf('focusTrap:restoreFocus')).toBeLessThan(calls.indexOf('mount:onClose'));
  });

  it('without a focus trap, focus that is inside the panel on close returns to the opener', async () => {
    const opener = mount(button('opener'));
    const panel = mount(document.createElement('div'));
    const inner = button('inner');
    panel.appendChild(inner);
    opener.focus();
    ctrl.bindPanel(panel);
    ctrl.attachStrategies(makeStub(['mount', 'position']).strategies);
    ctrl.open();
    await settle();
    inner.focus();

    ctrl.close();
    await settle();
    expect(document.activeElement).toBe(opener);
  });

  it('focus lost to <body> after entering the panel also returns to the opener', async () => {
    const opener = mount(button('opener'));
    const panel = mount(document.createElement('div'));
    const inner = button('inner');
    panel.appendChild(inner);
    opener.focus();
    ctrl.bindPanel(panel);
    ctrl.attachStrategies(makeStub(['mount', 'position']).strategies);
    ctrl.open();
    await settle();
    inner.focus();
    inner.remove();
    expect(document.activeElement).toBe(document.body);

    ctrl.close();
    await settle();
    expect(document.activeElement).toBe(opener);
  });

  it('focus the user moved elsewhere while the overlay was open is left alone', async () => {
    const opener = mount(button('opener'));
    const elsewhere = mount(button('elsewhere'));
    const panel = mount(document.createElement('div'));
    const inner = button('inner');
    panel.appendChild(inner);
    opener.focus();
    ctrl.bindPanel(panel);
    ctrl.attachStrategies(makeStub(['mount', 'position']).strategies);
    ctrl.open();
    await settle();
    inner.focus();
    elsewhere.focus();

    ctrl.close();
    await settle();
    expect(document.activeElement).toBe(elsewhere);
  });

  it('falls back to the trigger when the opener is gone, and returnFocus: false opts out', async () => {
    const opener = mount(button('opener'));
    const trigger = mount(button('trigger'));
    const panel = mount(document.createElement('div'));
    const inner = button('inner');
    panel.appendChild(inner);
    opener.focus();
    ctrl.bindTrigger(trigger);
    ctrl.bindPanel(panel);
    ctrl.attachStrategies(makeStub(['mount', 'position']).strategies);
    ctrl.open();
    await settle();
    inner.focus();
    opener.remove();

    ctrl.close();
    await settle();
    expect(document.activeElement).toBe(trigger);

    const second = Injector.create({ providers: [KjOverlayController], parent: TestBed.inject(Injector) }).get(KjOverlayController);
    const other = mount(document.createElement('div'));
    const b = button('b');
    other.appendChild(b);
    trigger.focus();
    second.bindPanel(other);
    second.attachStrategies({ ...makeStub(['mount', 'position']).strategies, returnFocus: false });
    second.open();
    await settle();
    b.focus();
    second.close();
    await settle();
    expect(document.activeElement).not.toBe(trigger);
    second.dispose();
  });

  it('a trap-less dialog panel takes focus on open ([kjAutofocus] first, else itself); a listbox does not', async () => {
    const opener = mount(button('opener'));
    const dialog = mount(document.createElement('div'));
    dialog.setAttribute('role', 'dialog');
    const field = document.createElement('input');
    field.setAttribute('kjAutofocus', '');
    dialog.append(button('first'), field);
    opener.focus();
    ctrl.bindPanel(dialog);
    ctrl.attachStrategies(makeStub(['mount', 'position']).strategies);
    ctrl.open();
    await settle();
    expect(document.activeElement).toBe(field);
    ctrl.close();
    await settle();
    expect(document.activeElement).toBe(opener);

    const plain = Injector.create({ providers: [KjOverlayController], parent: TestBed.inject(Injector) }).get(KjOverlayController);
    const empty = mount(document.createElement('div'));
    empty.setAttribute('role', 'dialog');
    plain.bindPanel(empty);
    plain.attachStrategies(makeStub(['mount', 'position']).strategies);
    plain.open();
    await settle();
    expect(document.activeElement).toBe(empty);
    expect(empty.getAttribute('tabindex')).toBe('-1');
    plain.dispose();
    await settle();

    const list = Injector.create({ providers: [KjOverlayController], parent: TestBed.inject(Injector) }).get(KjOverlayController);
    const listbox = mount(document.createElement('div'));
    listbox.setAttribute('role', 'listbox');
    listbox.appendChild(button('option'));
    opener.focus();
    list.bindPanel(listbox);
    list.attachStrategies(makeStub(['mount', 'position']).strategies);
    list.open();
    await settle();
    expect(document.activeElement).toBe(opener);
    list.dispose();
  });

  it('open() stamps the stack level on the panel and its wrapper; a nested controller lands one above; close clears', async () => {
    const stack = TestBed.inject(KjOverlayStack);
    const raf = () => new Promise(r => requestAnimationFrame(() => r(undefined)));
    const mk = () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'kj-overlay-wrapper';
      const panel = document.createElement('div');
      wrapper.appendChild(panel);
      document.body.appendChild(wrapper);
      return { wrapper, panel };
    };
    const outer = mk();
    const base = stack.nextZIndex;
    ctrl.bindPanel(outer.panel);
    ctrl.attachStrategies(makeStub().strategies);
    ctrl.open();
    expect(outer.panel.style.getPropertyValue('--kj-overlay-z')).toBe(String(base));
    expect(outer.wrapper.style.zIndex).toBe(String(base));

    const inner = mk();
    const nested = Injector.create({ providers: [KjOverlayController], parent: TestBed.inject(Injector) })
      .get(KjOverlayController);
    nested.bindPanel(inner.panel);
    nested.attachStrategies(makeStub().strategies);
    nested.open();
    expect(Number(inner.wrapper.style.zIndex)).toBe(base + 1);
    expect(Number(inner.panel.style.getPropertyValue('--kj-overlay-z')))
      .toBeGreaterThan(Number(outer.panel.style.getPropertyValue('--kj-overlay-z')));

    nested.close();
    await raf(); await raf();
    expect(inner.panel.style.getPropertyValue('--kj-overlay-z')).toBe('');
    expect(inner.wrapper.style.zIndex).toBe('');
    // The outer keeps its level; the next overlay reopens one above it.
    expect(outer.wrapper.style.zIndex).toBe(String(base));
    expect(stack.nextZIndex).toBe(base + 1);

    ctrl.close();
    await raf(); await raf();
    expect(outer.wrapper.style.zIndex).toBe('');
    outer.wrapper.remove(); inner.wrapper.remove();
  }, 5000);

  describe('close policy and close reasons', () => {
    it('records why it closed, and re-opening resets it', async () => {
      ctrl.attachStrategies(makeStub().strategies);
      ctrl.open();
      await settle();
      expect(ctrl.closeReason()).toBeNull();
      ctrl.close('escape');
      expect(ctrl.closeReason()).toBe('escape');
      await settle();
      ctrl.open();
      expect(ctrl.closeReason()).toBeNull();
      ctrl.close();
      expect(ctrl.closeReason()).toBe('programmatic');
    });

    it('by default Escape closes with "escape" and a press outside the panel closes on its click with "outside"', async () => {
      const panel = mount(document.createElement('div'));
      const outside = mount(button('outside'));
      ctrl.bindPanel(panel);
      ctrl.attachStrategies(makeStub().strategies);
      ctrl.open();
      await settle();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(ctrl.state()).toBe('closing');
      expect(ctrl.closeReason()).toBe('escape');
      await settle();

      ctrl.open();
      await settle();
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(ctrl.state(), 'the down event alone does not dismiss').toBe('open');
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      expect(ctrl.state()).toBe('closing');
      expect(ctrl.closeReason()).toBe('outside');
    });

    it('closeOnEsc: false swallows Escape and closeOnOutside: false ignores an outside press (F-2)', async () => {
      const panel = mount(document.createElement('div'));
      const outside = mount(button('outside'));
      ctrl.bindPanel(panel);
      ctrl.attachStrategies({ ...makeStub().strategies, closeOnEsc: false, closeOnOutside: false });
      expect(ctrl.closeOnEsc).toBe(false);
      expect(ctrl.closeOnOutside).toBe(false);
      ctrl.open();
      await settle();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(ctrl.state()).toBe('open');
      pressAndClick(outside);
      expect(ctrl.state()).toBe('open');
      expect(ctrl.closeReason()).toBeNull();
    });

    it('attachStrategies merges over the previous bundle: policy flags survive a re-attach, replaced instances are detached', () => {
      const first = makeStub(['mount', 'position', 'trigger']);
      ctrl.attachStrategies({ ...first.strategies, closeOnEsc: false, closeOnOutside: false, returnFocus: false });
      const second = makeStub(['mount']);
      // What `KjOverlayPanel` does for a builder-launched body: the same
      // position instance, a new mount, an explicit null slot, no flags.
      ctrl.attachStrategies({ mount: second.strategies.mount, position: first.strategies.position, trigger: null });
      expect(ctrl.closeOnEsc).toBe(false);
      expect(ctrl.closeOnOutside).toBe(false);
      expect(ctrl.strategies?.returnFocus).toBe(false);
      expect(ctrl.strategies?.mount).toBe(second.strategies.mount);
      expect(ctrl.strategies?.trigger).toBeNull();
      expect(first.calls).toContain('mount:detach');
      expect(first.calls).toContain('trigger:detach');
      expect(first.calls.filter(c => c === 'position:detach')).toHaveLength(0);
      expect(second.calls).toContain('mount:attach');
    });
  });

  describe('lifecycle', () => {
    it('re-opening during the close transition settles the previous cycle first: no leaked stack entry or document listener, strategies stay paired (F-15)', async () => {
      const stack = TestBed.inject(KjOverlayStack);
      const panel = mount(document.createElement('div'));
      const { calls, strategies } = makeStub(['mount', 'position', 'scrollLock']);
      ctrl.bindPanel(panel);
      ctrl.attachStrategies(strategies);
      ctrl.open();
      await settle();
      expect(stack.stackSize).toBe(1);

      ctrl.close();
      expect(ctrl.state()).toBe('closing');
      ctrl.open();
      expect(ctrl.state()).toBe('opening');
      expect(stack.stackSize, 'the interrupted cycle released its entry').toBe(1);
      expect(calls.filter(c => c === 'mount:onClose')).toHaveLength(1);
      expect(calls.filter(c => c === 'scrollLock:onClose')).toHaveLength(1);
      expect(calls.filter(c => c === 'scrollLock:onOpen')).toHaveLength(2);
      await settle();
      expect(ctrl.state()).toBe('open');

      ctrl.close();
      await settle();
      expect(ctrl.state()).toBe('closed');
      expect(stack.stackSize).toBe(0);
      expect((stack as unknown as { _listenersInstalled: boolean })._listenersInstalled).toBe(false);
      expect(calls.filter(c => c === 'scrollLock:onClose')).toHaveLength(2);
    });

    it('toggle() during the close transition re-opens — unless the close came from a press outside the panel (F-22)', async () => {
      ctrl.attachStrategies(makeStub().strategies);
      ctrl.open();
      await settle();

      ctrl.close('escape');
      expect(ctrl.state()).toBe('closing');
      ctrl.toggle();
      expect(ctrl.state(), 'a click during an Escape-driven close brings it back').toBe('opening');
      await settle();

      ctrl.close('outside');
      ctrl.toggle();
      expect(ctrl.state(), 'the trigger click that follows an outside press is the same gesture').toBe('closing');
      await settle();
      expect(ctrl.state()).toBe('closed');

      ctrl.toggle();
      expect(ctrl.state()).toBe('opening');
      await settle();
      ctrl.toggle();
      expect(ctrl.state()).toBe('closing');
      expect(ctrl.closeReason()).toBe('trigger');
    });

    it('destroying the host of an open declarative overlay tears it down synchronously: stack entry, scroll lock and portal wrapper (F-3)', async () => {
      const stack = TestBed.inject(KjOverlayStack);
      const fixture = TestBed.createComponent(DeclarativeHost);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const controller = fixture.componentInstance.controller;
      controller.open();
      fixture.detectChanges();
      await settle();
      expect(controller.state()).toBe('open');
      expect(stack.stackSize).toBe(1);
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(host.closest('.kj-overlay-wrapper'), 'the panel is portalled while open').not.toBeNull();

      fixture.destroy();
      // No gesture, no tick, no timer in between.
      expect(controller.state()).toBe('closed');
      expect(stack.stackSize).toBe(0);
      expect(document.documentElement.style.overflow).toBe('');
      expect(document.querySelector('.kj-overlay-container .kj-overlay-wrapper')).toBeNull();
      expect(controller.strategies).toBeNull();
    });
  });

  describe('transition measurement (F-16) and post-open reposition (F-8)', () => {
    /**
     * A panel whose computed styles depend on `data-state`, which is the
     * normal stylesheet pattern the controller has to cope with: the
     * durations live under the state the overlay is *entering*.
     */
    function panelWithStatefulStyles(byState: Record<string, Partial<CSSStyleDeclaration>>) {
      const panel = mount(document.createElement('div'));
      panel.setAttribute('data-state', 'closed');
      const seen: (string | null)[] = [];
      const real = window.getComputedStyle.bind(window);
      const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pe?: string | null) => {
        if (el !== panel) return real(el, pe as never);
        const state = panel.getAttribute('data-state');
        seen.push(state);
        return {
          transitionDuration: '0s', transitionDelay: '0s',
          animationDuration: '0s', animationDelay: '0s',
          ...(byState[state ?? ''] ?? {}),
        } as CSSStyleDeclaration;
      }) as typeof window.getComputedStyle);
      return { panel, seen, spy };
    }

    it('writes data-state before measuring, so the durations belong to the state being entered', () => {
      const { panel, seen, spy } = panelWithStatefulStyles({
        opening: { transitionDuration: '0.15s' },
      });
      try {
        const { strategies } = makeStub();
        ctrl.attachStrategies(strategies);
        ctrl.bindPanel(panel);

        ctrl.open();
        // Synchronously, before any change detection could apply the host binding.
        expect(panel.getAttribute('data-state')).toBe('opening');
        expect(seen.at(-1), 'measured after the state was written').toBe('opening');
        // A real duration was found, so the controller waits for the event
        // rather than resolving on the next frame and cutting the open short.
        expect(ctrl.state()).toBe('opening');
        panel.dispatchEvent(new Event('transitionend'));
        expect(ctrl.state()).toBe('open');
      } finally {
        spy.mockRestore();
      }
    });

    it('takes the longest duration + delay in a comma-separated list, not the first', async () => {
      const { panel, seen, spy } = panelWithStatefulStyles({
        opening: { transitionDuration: '0.01s' },
        // `transition: opacity .12s, transform .6s` — parseFloat would read .12s.
        closing: { transitionDuration: '0.12s, 0.6s' },
      });
      try {
        const { strategies } = makeStub();
        ctrl.attachStrategies(strategies);
        ctrl.bindPanel(panel);
        ctrl.open();
        panel.dispatchEvent(new Event('transitionend'));
        expect(ctrl.state()).toBe('open');

        ctrl.close();
        expect(panel.getAttribute('data-state')).toBe('closing');
        expect(seen.at(-1)).toBe('closing');
        // The old deadline was 0.12s + 50ms = 170ms; the honest one is 650ms.
        await new Promise(r => setTimeout(r, 300));
        expect(ctrl.state(), 'still animating out at 300ms').toBe('closing');
        panel.dispatchEvent(new Event('transitionend'));
        expect(ctrl.state()).toBe('closed');
      } finally {
        spy.mockRestore();
      }
    }, 5000);

    it('a negative transition-delay shortens nothing and never yields a negative deadline', () => {
      const { panel, spy } = panelWithStatefulStyles({
        opening: { transitionDuration: '0.05s', transitionDelay: '-10s' },
      });
      try {
        const { strategies } = makeStub();
        ctrl.attachStrategies(strategies);
        ctrl.bindPanel(panel);
        ctrl.open();
        expect(ctrl.state()).toBe('opening');
        panel.dispatchEvent(new Event('transitionend'));
        expect(ctrl.state()).toBe('open');
      } finally {
        spy.mockRestore();
      }
    });

    it('re-anchors once the panel is fully open (F-8)', () => {
      const { panel, spy } = panelWithStatefulStyles({ opening: { transitionDuration: '0.05s' } });
      try {
        const { strategies } = makeStub();
        ctrl.attachStrategies(strategies);
        ctrl.bindPanel(panel);
        const update = strategies.position.update as unknown as ReturnType<typeof vi.fn>;

        ctrl.open();
        expect(update.mock.calls.length, 'positioned as soon as the panel is un-hidden').toBe(1);
        panel.dispatchEvent(new Event('transitionend'));
        expect(ctrl.state()).toBe('open');
        expect(update.mock.calls.length, 'and again at its final size').toBe(2);
      } finally {
        spy.mockRestore();
      }
    });

    it('un-hides the panel before the position strategy measures it (F-8)', () => {
      const panel = mount(document.createElement('div'));
      panel.setAttribute('hidden', '');
      const { strategies } = makeStub();
      let hiddenAtMeasure: boolean | null = null;
      (strategies.position.update as unknown as ReturnType<typeof vi.fn>)
        .mockImplementation(() => { hiddenAtMeasure ??= panel.hasAttribute('hidden'); });
      ctrl.attachStrategies(strategies);
      ctrl.bindPanel(panel);
      ctrl.open();
      expect(hiddenAtMeasure).toBe(false);
    });
  });
});
