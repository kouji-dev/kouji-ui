import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { KjOverlayBuilder, type KjOverlayHandle } from './builder';
import type { KjOverlayStrategies } from './controller';
import { KJ_OVERLAY_CONTAINER } from './container';
import { inPlace } from './strategies/mount/in-place';
import { bodyPortal } from './strategies/mount/body-portal';
import { viewportCentered } from './strategies/position/viewport-centered';
import { solidBackdrop } from './strategies/backdrop/solid';
import { programmatic } from './strategies/trigger-event/programmatic';

function makeStrategies(): KjOverlayStrategies {
  return {
    mount: bodyPortal(),
    position: viewportCentered(),
    trigger: programmatic(),
  };
}

/** A modal bundle as the dialog / drawer / sheet services build it (scrim without page inerting, so the fixture stays live). */
function modalStrategies(): KjOverlayStrategies {
  return {
    mount: inPlace(),
    position: viewportCentered(),
    backdrop: solidBackdrop({ inert: false }),
    trigger: programmatic(),
  };
}

@Component({ standalone: true, template: '<button>ok</button>' })
class Body {}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

function pressAndClick(el: Element): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
}

/** The wrapper element of a handle: the last wrapper appended to the container. */
function wrapperOf(handle: KjOverlayHandle): HTMLElement {
  const el = handle.controller.panelEl()?.closest<HTMLElement>('.kj-overlay-wrapper')
    ?? document.querySelector<HTMLElement>('.kj-overlay-container > .kj-overlay-wrapper:last-child');
  expect(el).not.toBeNull();
  return el!;
}

describe('KjOverlayBuilder', () => {
  const handles: KjOverlayHandle[] = [];
  const nodes: Element[] = [];
  const track = (h: KjOverlayHandle): KjOverlayHandle => { handles.push(h); return h; };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(async () => {
    for (const h of handles) h.destroy();
    handles.length = 0;
    for (const n of nodes) n.remove();
    nodes.length = 0;
    await settle();
  });

  it('create returns a controller with strategies attached', () => {
    const builder = TestBed.inject(KjOverlayBuilder);
    const ctrl = track(builder.create({ ...makeStrategies(), panelRole: 'dialog' }));
    expect(ctrl.controller.state()).toBe('closed');
  });

  it('attachComponent injects custom providers', () => {
    @Component({ standalone: true, template: '' })
    class Cmp {
      readonly value = inject('TOKEN' as never);
    }
    const builder = TestBed.inject(KjOverlayBuilder);
    const ctrl = track(builder.create({ ...makeStrategies(), panelRole: 'dialog' }));
    const ref = builder.attachComponent(ctrl, Cmp, {
      providers: [{ provide: 'TOKEN' as never, useValue: 'hello' }],
    });
    expect((ref.instance as Cmp).value).toBe('hello');
    ref.destroy();
  });

  describe('close policy (F-2)', () => {
    it('an alertdialog defaults to a non-dismissible policy; other roles default to dismissible; explicit flags win', () => {
      const builder = TestBed.inject(KjOverlayBuilder);
      const alert = track(builder.create({ ...makeStrategies(), panelRole: 'alertdialog' }));
      expect(alert.controller.closeOnEsc).toBe(false);
      expect(alert.controller.closeOnOutside).toBe(false);

      const dialog = track(builder.create({ ...makeStrategies(), panelRole: 'dialog' }));
      expect(dialog.controller.closeOnEsc).toBe(true);
      expect(dialog.controller.closeOnOutside).toBe(true);
      expect(dialog.controller.strategies?.closeOnOutside, 'left to the scrim for a dismissible role').toBeUndefined();

      const explicit = track(builder.create({ ...makeStrategies(), panelRole: 'alertdialog', closeOnEsc: true }));
      expect(explicit.controller.closeOnEsc).toBe(true);
      expect(explicit.controller.closeOnOutside).toBe(false);

      const locked = track(builder.create({ ...makeStrategies(), panelRole: 'dialog', closeOnEsc: false, closeOnOutside: false }));
      expect(locked.controller.closeOnEsc).toBe(false);
      expect(locked.controller.closeOnOutside).toBe(false);
    });

    it('a dialog whose scrim says closeOnClick: false survives a scrim press (the drawer / sheet closeOnOutside mapping)', async () => {
      const builder = TestBed.inject(KjOverlayBuilder);
      const handle = track(builder.create({
        ...modalStrategies(),
        backdrop: solidBackdrop({ inert: false, closeOnClick: false }),
        panelRole: 'dialog',
      }));
      builder.attachComponent(handle, Body);
      handle.controller.open();
      await settle();
      expect(handle.controller.closeOnOutside).toBe(false);
      const scrim = wrapperOf(handle).querySelector<HTMLElement>('kj-backdrop')!;
      pressAndClick(scrim);
      expect(handle.controller.state()).toBe('open');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(handle.controller.state(), 'Escape is still the default').toBe('closing');
    });

    it('an alertdialog survives Escape and a scrim press', async () => {
      const builder = TestBed.inject(KjOverlayBuilder);
      const handle = track(builder.create({ ...modalStrategies(), panelRole: 'alertdialog' }));
      builder.attachComponent(handle, Body);
      handle.controller.open();
      await settle();
      expect(handle.controller.state()).toBe('open');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(handle.controller.state()).toBe('open');

      const scrim = wrapperOf(handle).querySelector<HTMLElement>('kj-backdrop');
      expect(scrim).not.toBeNull();
      pressAndClick(scrim!);
      expect(handle.controller.state()).toBe('open');
      expect(handle.controller.closeReason()).toBeNull();
    });

    it('a dialog closes on Escape with "escape" and on a scrim press with "backdrop" — the scrim, not the stack, owns the press', async () => {
      const builder = TestBed.inject(KjOverlayBuilder);
      const handle = track(builder.create({ ...modalStrategies(), panelRole: 'dialog' }));
      builder.attachComponent(handle, Body);
      handle.controller.open();
      await settle();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(handle.controller.state()).toBe('closing');
      expect(handle.controller.closeReason()).toBe('escape');
      await settle();

      handle.controller.open();
      await settle();
      const scrim = wrapperOf(handle).querySelector<HTMLElement>('kj-backdrop')!;
      scrim.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(handle.controller.state(), 'the down event does not dismiss').toBe('open');
      scrim.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      expect(handle.controller.state()).toBe('closing');
      expect(handle.controller.closeReason()).toBe('backdrop');
    });

    it('the body component re-attaching the strategies through KjOverlayPanel keeps the builder policy', async () => {
      const builder = TestBed.inject(KjOverlayBuilder);
      const handle = track(builder.create({ ...modalStrategies(), panelRole: 'dialog', closeOnEsc: false }));
      builder.attachComponent(handle, Body);
      handle.controller.open();
      await settle();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(handle.controller.state()).toBe('open');
    });
  });

  describe('scope and container (mfe F-16, cust F-17)', () => {
    it('the wrapper inherits data-theme / data-density / dir from the focused element, else the app root', () => {
      const scope = document.createElement('div');
      scope.setAttribute('data-theme', 'draft');
      scope.setAttribute('data-density', 'compact');
      scope.setAttribute('dir', 'rtl');
      const opener = document.createElement('button');
      scope.appendChild(opener);
      document.body.appendChild(scope);
      nodes.push(scope);
      opener.focus();

      const builder = TestBed.inject(KjOverlayBuilder);
      const handle = track(builder.create({ ...makeStrategies(), panelRole: 'dialog' }));
      builder.attachComponent(handle, Body);
      const wrapper = wrapperOf(handle);
      expect(wrapper.getAttribute('data-theme')).toBe('draft');
      expect(wrapper.getAttribute('data-density')).toBe('compact');
      expect(wrapper.getAttribute('dir')).toBe('rtl');
    });

    it('an explicit scope element wins, and scope: null clears the attributes', () => {
      const scope = document.createElement('div');
      scope.setAttribute('data-theme', 'explicit');
      document.body.appendChild(scope);
      nodes.push(scope);

      const builder = TestBed.inject(KjOverlayBuilder);
      const explicit = track(builder.create({ ...makeStrategies(), panelRole: 'dialog', scope }));
      builder.attachComponent(explicit, Body);
      expect(wrapperOf(explicit).getAttribute('data-theme')).toBe('explicit');

      const none = track(builder.create({ ...makeStrategies(), panelRole: 'dialog', scope: null }));
      builder.attachComponent(none, Body);
      expect(wrapperOf(none).hasAttribute('data-theme')).toBe(false);
      expect(wrapperOf(none).hasAttribute('dir')).toBe(false);
    });

    it('KJ_OVERLAY_CONTAINER roots service-launched overlays in the element the app provides', () => {
      const root = document.createElement('div');
      root.id = 'custom-overlay-root';
      document.body.appendChild(root);
      nodes.push(root);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: KJ_OVERLAY_CONTAINER, useValue: () => root }],
      });
      const builder = TestBed.inject(KjOverlayBuilder);
      const handle = track(builder.create({ ...makeStrategies(), panelRole: 'dialog' }));
      builder.attachComponent(handle, Body);
      expect(root.querySelector('.kj-overlay-wrapper')).not.toBeNull();
      expect(root.contains(handle.controller.panelEl())).toBe(true);
    });
  });
});
