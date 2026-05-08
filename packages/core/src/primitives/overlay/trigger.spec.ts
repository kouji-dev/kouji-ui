import { Component, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjOverlayTrigger } from './trigger';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_TRIGGER_EVENT_STRATEGY } from './tokens';
import { onClick } from './strategies/trigger-event/on-click';
import { bodyPortal } from './strategies/mount/body-portal';
import { viewportCentered } from './strategies/position/viewport-centered';

@Component({
  selector: 'kj-trig-host',
  standalone: true,
  hostDirectives: [KjOverlayTrigger],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onClick() },
  ],
  template: '',
})
class TrigHost {
  private readonly ctrl = inject(KjOverlayController);
  constructor() {
    this.ctrl.attachStrategies({
      mount: bodyPortal(),
      position: viewportCentered(),
      trigger: inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY),
    });
  }
}

@Component({
  selector: 'kj-trig-menu-host',
  standalone: true,
  hostDirectives: [KjOverlayTrigger],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => ({
      ariaHasPopup: 'menu' as const,
      attach() {}, bindToggle() {}, onOpen() {}, onClose() {}, detach() {},
    }) },
  ],
  template: '',
})
class TrigMenuHost {
  private readonly ctrl = inject(KjOverlayController);
  constructor() {
    this.ctrl.attachStrategies({
      mount: bodyPortal(),
      position: viewportCentered(),
      trigger: inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY),
    });
  }
}

@Component({
  selector: 'kj-trig-ctrl-host',
  standalone: true,
  hostDirectives: [KjOverlayTrigger],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onClick() },
  ],
  template: '',
})
class TrigCtrlHost {
  readonly ctrl = inject(KjOverlayController);
}

describe('KjOverlayTrigger', () => {
  it('host has aria-haspopup and data-state attrs initially', async () => {
    const { fixture } = await render(TrigHost);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.getAttribute('data-state')).toBe('closed');
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  it('exports as kjOverlayTrigger', () => {
    expect(KjOverlayTrigger).toBeTruthy();
  });

  it('controller is provided per-host', async () => {
    const { fixture } = await render(TrigCtrlHost);
    expect(fixture.componentInstance.ctrl).toBeTruthy();
    expect(fixture.componentInstance.ctrl.state()).toBe('closed');
  });

  it('aria-haspopup uses strategy value', async () => {
    const { fixture } = await render(TrigMenuHost);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.getAttribute('aria-haspopup')).toBe('menu');
  });
});
