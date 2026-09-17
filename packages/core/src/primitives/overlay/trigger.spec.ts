import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjOverlayTrigger } from './trigger';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_PANEL_ROLE, KJ_OVERLAY_TRIGGER_EVENT_STRATEGY } from './tokens';
import { onClick } from './strategies/trigger-event/on-click';
import { onHotkey } from './strategies/trigger-event/on-hotkey';
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
  changeDetection: ChangeDetectionStrategy.Eager,
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
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => ({
        ariaHasPopup: 'menu' as const,
        attach() {},
        bindToggle() {},
        onOpen() {},
        onClose() {},
        detach() {},
      }),
    },
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
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
  changeDetection: ChangeDetectionStrategy.Eager,
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

  describe('aria-describedby', () => {
    @Component({
      selector: 'kj-trig-tooltip-host',
      standalone: true,
      hostDirectives: [KjOverlayTrigger],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onClick() },
        { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tooltip' as const },
      ],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: '',
    })
    class TrigTooltipHost {
      readonly trigger = inject(KjOverlayTrigger, { self: true });
      private readonly ctrl = inject(KjOverlayController);
      constructor() {
        this.ctrl.attachStrategies({
          mount: bodyPortal(),
          position: viewportCentered(),
          trigger: inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY),
        });
      }
    }

    it('references the panel id for a tooltip-role panel, merged with a static value', async () => {
      const { fixture } = await render(`<kj-trig-tooltip-host aria-describedby="hint" />`, {
        imports: [TrigTooltipHost],
      });
      const el = fixture.nativeElement.querySelector('kj-trig-tooltip-host') as HTMLElement;
      const host = fixture.debugElement.query((d) => d.name === 'kj-trig-tooltip-host').componentInstance as TrigTooltipHost;
      expect(el.getAttribute('aria-describedby')).toBe('hint');
      const panelEl = document.createElement('div');
      panelEl.id = 'tip-1';
      host.trigger.attachPanel({ panelId: 'tip-1', host: { nativeElement: panelEl } } as never);
      fixture.detectChanges();
      expect(el.getAttribute('aria-describedby')).toBe('hint tip-1');
    });

    it('is left alone for non-tooltip roles', async () => {
      const { fixture } = await render(TrigHost);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('teardown (F-3)', () => {
    @Component({
      selector: 'kj-trig-hotkey-host',
      standalone: true,
      hostDirectives: [KjOverlayTrigger],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onHotkey('mod+k') },
      ],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: '',
    })
    class TrigHotkeyHost {
      readonly ctrl = inject(KjOverlayController);
      constructor() {
        this.ctrl.attachStrategies({ mount: bodyPortal(), position: viewportCentered() });
      }
    }

    it('destroying the trigger host detaches its trigger-event strategy: a hotkey listener on document does not outlive it', async () => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const chord = () => new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac, cancelable: true });
      const { fixture } = await render(TrigHotkeyHost);
      const ctrl = fixture.componentInstance.ctrl;
      document.dispatchEvent(chord());
      expect(ctrl.isOpen()).toBe(true);

      fixture.destroy();
      const after = chord();
      document.dispatchEvent(after);
      expect(after.defaultPrevented, 'nothing claims the chord any more').toBe(false);
      expect(ctrl.state()).toBe('closed');
    });
  });
});
