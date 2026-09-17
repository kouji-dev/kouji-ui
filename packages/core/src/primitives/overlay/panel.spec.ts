import { Component, Directive, inject, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { afterEach, describe, it, expect } from 'vitest';
import { KjOverlayPanel, type KjOverlayTriggerLike } from './panel';
import { KjOverlayController } from './controller';
import {
  KJ_OVERLAY_BACKDROP_STRATEGY,
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from './tokens';
import { bodyPortal } from './strategies/mount/body-portal';
import { inPlace } from './strategies/mount/in-place';
import { viewportCentered } from './strategies/position/viewport-centered';
import { anchoredTo } from './strategies/position/anchored-to';
import { solidBackdrop } from './strategies/backdrop/solid';
import { htmlOverflow } from './strategies/scroll-lock/html-overflow';
import { programmatic } from './strategies/trigger-event/programmatic';

@Component({
  selector: 'kj-panel-host',
  standalone: true,
  hostDirectives: [KjOverlayPanel],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => viewportCentered() },
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => programmatic() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '',
})
class PanelHost {
  readonly _ = inject(KjOverlayPanel);
}

/** A declarative modal: portalled panel with a backdrop strategy (page inerting off so the fixture stays live). */
@Component({
  selector: 'kj-modal-panel-host',
  standalone: true,
  hostDirectives: [KjOverlayPanel],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => viewportCentered() },
    { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useFactory: () => solidBackdrop({ inert: false }) },
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => programmatic() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
  template: '<button>inside</button>',
})
class ModalPanelHost {
  readonly controller = inject(KjOverlayController);
}

/** In-place variant: a scrim only covers the viewport from the overlay container, so none is created. */
@Component({
  selector: 'kj-inline-modal-panel-host',
  standalone: true,
  hostDirectives: [KjOverlayPanel],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => inPlace() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => viewportCentered() },
    { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useFactory: () => solidBackdrop({ inert: false }) },
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => programmatic() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
  template: '',
})
class InlineModalPanelHost {
  readonly controller = inject(KjOverlayController);
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

/** Stands in for a service-launched modal: its injector provides a controller and the whole modal bundle. */
@Directive({
  selector: '[kjOuterModalScope]',
  standalone: true,
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => inPlace() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => viewportCentered() },
    { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useFactory: () => solidBackdrop({ inert: false }) },
    { provide: KJ_OVERLAY_SCROLL_LOCK_STRATEGY, useFactory: () => htmlOverflow() },
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => programmatic() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'alertdialog' as const },
  ],
})
class OuterModalScope {
  readonly controller = inject(KjOverlayController);
}

/** A trigger whose controller lives on its own (sibling) element, as every `[kjFor]` composition does. */
@Directive({
  selector: '[kjSiblingTrigger]',
  standalone: true,
  exportAs: 'kjSiblingTrigger',
  providers: [KjOverlayController],
})
class SiblingTrigger implements KjOverlayTriggerLike {
  readonly controller = inject(KjOverlayController);
  attachPanel(): void {}
}

/** A popover-like panel: mount, position and role on its own element, nothing else. */
@Component({
  selector: 'kj-nested-panel',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel, inputs: ['kjFor'] }],
  providers: [
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => viewportCentered() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
  ],
  template: '',
})
class NestedPanel {
  readonly panel = inject(KjOverlayPanel);
}

@Component({
  standalone: true,
  imports: [OuterModalScope, SiblingTrigger, NestedPanel],
  template: `
    <div kjOuterModalScope>
      <button kjSiblingTrigger #t="kjSiblingTrigger">Open</button>
      <kj-nested-panel [kjFor]="t" />
    </div>
  `,
})
class NestedHost {}

/** An anchored panel — the shape every popover / tooltip / listbox uses. */
@Component({
  selector: 'kj-anchored-panel-host',
  standalone: true,
  hostDirectives: [KjOverlayPanel],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => inPlace() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo({ side: 'right', align: 'start', flip: false }) },
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => programmatic() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
  template: '',
})
class AnchoredPanelHost {
  readonly controller = inject(KjOverlayController);
}

describe('KjOverlayPanel', () => {
  it('host emits role + data-state="closed" + hidden initially', async () => {
    const { fixture } = await render(PanelHost);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('data-state')).toBe('closed');
    expect(el.hasAttribute('hidden')).toBe(true);
  });

  it('host has an id (minted via KjId)', async () => {
    const { fixture } = await render(PanelHost);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.id).toMatch(/^kj-panel-\d+$/);
  });

  it('exports as kjOverlayPanel', () => {
    expect(KjOverlayPanel).toBeTruthy();
  });

  describe('data-side / data-align (F-5)', () => {
    it('reflects the resolved placement while open and drops both attributes when closed', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const fixture = TestBed.createComponent(AnchoredPanelHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      const controller = fixture.componentInstance.controller;
      controller.bindTrigger(trigger);

      // Closed: nothing anchored, so the arrow hooks are absent rather than stale.
      expect(el.hasAttribute('data-side')).toBe(false);
      expect(el.hasAttribute('data-align')).toBe(false);

      controller.open();
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(el.getAttribute('data-side')).toBe('right');
      expect(el.getAttribute('data-align')).toBe('start');

      controller.close();
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(el.hasAttribute('data-side')).toBe(false);
      expect(el.hasAttribute('data-align')).toBe(false);

      trigger.remove();
      fixture.destroy();
    });

    it('a position strategy that publishes no placement leaves both attributes off', async () => {
      const { fixture } = await render(PanelHost);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.hasAttribute('data-side')).toBe(false);
      expect(el.hasAttribute('data-align')).toBe(false);
    });
  });

  it('a [kjFor] panel inside another overlay reads its tokens from its own element only — never the enclosing modal\'s scroll lock, scrim or role', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const panelEl = host.querySelector('kj-nested-panel') as HTMLElement;
    const outer = fixture.debugElement.query((d) => d.name === 'div').injector.get(OuterModalScope);
    const panel = fixture.debugElement.query((d) => d.name === 'kj-nested-panel').componentInstance as NestedPanel;
    const controller = panel.panel.controller!;

    expect(controller).not.toBe(outer.controller);
    expect(panelEl.getAttribute('role')).toBe('listbox');
    expect(panelEl.hasAttribute('aria-modal')).toBe(false);
    expect(controller.strategies?.scrollLock).toBeNull();
    expect(controller.strategies?.backdrop).toBeNull();
    expect(controller.strategies?.trigger).toBeNull();
    expect(host.querySelector('kj-backdrop')).toBeNull();
    fixture.destroy();
  });

  describe('declarative backdrop (F-18)', () => {
    afterEach(() => {
      document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
      // A TestBed root component is the host itself, so a scrim created in
      // its view container lands directly under <body> and outlives the
      // root's replacement; in an app the enclosing view removes it.
      document.querySelectorAll('body > kj-backdrop').forEach((el) => el.remove());
    });

    it('a portalled panel with a backdrop strategy renders a real scrim: before the panel in the wrapper while open, hidden next to it while closed', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const fixture = TestBed.createComponent(ModalPanelHost);
      fixture.detectChanges();
      const panel = fixture.nativeElement as HTMLElement;
      const controller = fixture.componentInstance.controller;
      const original = panel.parentElement!;

      const scrim = original.querySelector<HTMLElement>('kj-backdrop');
      expect(scrim, 'created next to the panel').not.toBeNull();
      expect(scrim!.hasAttribute('hidden')).toBe(true);
      expect(controller.backdropEl()).toBe(scrim);

      controller.open();
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(controller.state()).toBe('open');
      const wrapper = panel.closest<HTMLElement>('.kj-overlay-wrapper')!;
      expect(wrapper).not.toBeNull();
      expect(scrim!.parentElement).toBe(wrapper);
      expect(scrim!.nextElementSibling, 'the scrim paints right under its panel').toBe(panel);
      expect(scrim!.hasAttribute('hidden')).toBe(false);
      expect(scrim!.classList.contains('kj-backdrop')).toBe(true);

      // A press that begins and ends on the scrim dismisses, with its reason.
      scrim!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      scrim!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      expect(controller.state()).toBe('closing');
      expect(controller.closeReason()).toBe('backdrop');
      await settle();
      fixture.detectChanges();
      expect(controller.state()).toBe('closed');
      expect(panel.parentElement).toBe(original);
      expect(scrim!.parentElement).toBe(original);
      expect(scrim!.nextElementSibling).toBe(panel);
      expect(scrim!.hasAttribute('hidden')).toBe(true);
      fixture.destroy();
    });

    it('an in-place panel gets no scrim even with a backdrop strategy', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const fixture = TestBed.createComponent(InlineModalPanelHost);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.nextElementSibling?.tagName).not.toBe('KJ-BACKDROP');
      expect(host.querySelector('kj-backdrop')).toBeNull();
      expect(fixture.componentInstance.controller.backdropEl()).toBeNull();
      fixture.destroy();
    });
  });
});
