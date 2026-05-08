import { Component, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjOverlayPanel } from './panel';
import { KjOverlayController } from './controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from './tokens';
import { bodyPortal } from './strategies/mount/body-portal';
import { viewportCentered } from './strategies/position/viewport-centered';
import { programmatic } from './strategies/trigger-event/programmatic';

describe('KjOverlayPanel', () => {
  it('host emits role + data-state="closed" + hidden initially', async () => {
    @Component({
      standalone: true,
      hostDirectives: [KjOverlayPanel],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_MOUNT_STRATEGY,    useFactory: () => bodyPortal() },
        { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => viewportCentered() },
        { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => programmatic() },
        { provide: KJ_OVERLAY_PANEL_ROLE,        useValue: 'dialog' as const },
      ],
      template: '',
    })
    class Host {
      readonly _ = inject(KjOverlayPanel);
    }
    const { container } = await render(Host);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('data-state')).toBe('closed');
    expect(el.hasAttribute('hidden')).toBe(true);
  });

  it('host has an id (minted via KjId)', async () => {
    @Component({
      standalone: true,
      hostDirectives: [KjOverlayPanel],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_MOUNT_STRATEGY,    useFactory: () => bodyPortal() },
        { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => viewportCentered() },
        { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => programmatic() },
        { provide: KJ_OVERLAY_PANEL_ROLE,        useValue: 'dialog' as const },
      ],
      template: '',
    })
    class Host {}
    const { container } = await render(Host);
    const el = container.firstElementChild as HTMLElement;
    expect(el.id).toMatch(/^kj-panel-\d+$/);
  });

  it('exports as kjOverlayPanel', () => {
    expect(KjOverlayPanel).toBeTruthy();
  });
});
