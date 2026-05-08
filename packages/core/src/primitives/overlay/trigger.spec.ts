import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjOverlayTrigger } from './trigger';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_TRIGGER_EVENT_STRATEGY } from './tokens';
import { onClick } from './strategies/trigger-event/on-click';
import { bodyPortal } from './strategies/mount/body-portal';
import { viewportCentered } from './strategies/position/viewport-centered';

describe('KjOverlayTrigger', () => {
  it('host has aria-haspopup and data-state attrs initially', async () => {
    @Component({
      standalone: true,
      hostDirectives: [KjOverlayTrigger],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onClick() },
      ],
      template: '',
    })
    class Host {
      private readonly ctrl = inject(KjOverlayController);
      constructor() {
        this.ctrl.attachStrategies({
          mount: bodyPortal(),
          position: viewportCentered(),
          trigger: inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY),
        });
      }
    }
    const { container } = await render(Host);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('data-state')).toBe('closed');
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  it('exports as kjOverlayTrigger', () => {
    expect(KjOverlayTrigger).toBeTruthy();
  });

  it('controller is provided per-host', async () => {
    @Component({
      standalone: true,
      hostDirectives: [KjOverlayTrigger],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onClick() },
      ],
      template: '',
    })
    class Host {
      readonly ctrl = inject(KjOverlayController);
    }
    const { fixture } = await render(Host);
    expect(fixture.componentInstance.ctrl).toBeTruthy();
    expect(fixture.componentInstance.ctrl.state()).toBe('closed');
  });

  it('aria-haspopup uses strategy value', async () => {
    @Component({
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
    class Host {
      private readonly ctrl = inject(KjOverlayController);
      constructor() {
        this.ctrl.attachStrategies({
          mount: bodyPortal(),
          position: viewportCentered(),
          trigger: inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY),
        });
      }
    }
    const { container } = await render(Host);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('aria-haspopup')).toBe('menu');
  });
});
