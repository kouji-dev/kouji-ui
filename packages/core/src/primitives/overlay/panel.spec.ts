import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
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
});
