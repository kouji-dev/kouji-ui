import { Component, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { KjBackdrop } from './backdrop';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_BACKDROP_STRATEGY } from './tokens';
import { inPlace } from './strategies/mount/in-place';
import { viewportCentered } from './strategies/position/viewport-centered';

function strategy(closeOnClick: boolean) {
  return {
    inertSiblings: false, closeOnClick, className: 'kj-backdrop',
    attach() {}, onOpen() {}, onClose() {}, detach() {},
  };
}

describe('KjBackdrop', () => {
  it('clicking host closes the overlay with the "backdrop" reason when closeOnClick=true', async () => {
    @Component({
      standalone: true,
      imports: [KjBackdrop],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useValue: strategy(true) },
      ],
      template: '<kj-backdrop></kj-backdrop>',
    })
    class Host {
      readonly ctrl = inject(KjOverlayController);
    }
    const { fixture, container } = await render(Host);
    const closeSpy = vi.spyOn(fixture.componentInstance.ctrl, 'close');
    const el = container.querySelector('kj-backdrop') as HTMLElement;
    el.click();
    expect(closeSpy).toHaveBeenCalledWith('backdrop');
  });

  it('does not close when closeOnClick=false', async () => {
    @Component({
      standalone: true,
      imports: [KjBackdrop],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useValue: strategy(false) },
      ],
      template: '<kj-backdrop></kj-backdrop>',
    })
    class Host {
      readonly ctrl = inject(KjOverlayController);
    }
    const { fixture, container } = await render(Host);
    const closeSpy = vi.spyOn(fixture.componentInstance.ctrl, 'close');
    const el = container.querySelector('kj-backdrop') as HTMLElement;
    el.click();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('registers with the controller as its scrim, and the controller\'s closeOnOutside policy wins over the strategy\'s closeOnClick', async () => {
    @Component({
      standalone: true,
      imports: [KjBackdrop],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useValue: strategy(true) },
      ],
      template: '<kj-backdrop></kj-backdrop>',
    })
    class Host {
      readonly ctrl = inject(KjOverlayController);
      constructor() {
        this.ctrl.attachStrategies({ mount: inPlace(), position: viewportCentered(), closeOnOutside: false });
      }
    }
    const { fixture, container } = await render(Host);
    const el = container.querySelector('kj-backdrop') as HTMLElement;
    expect(fixture.componentInstance.ctrl.backdropEl()).toBe(el);
    const closeSpy = vi.spyOn(fixture.componentInstance.ctrl, 'close');
    el.click();
    expect(closeSpy).not.toHaveBeenCalled();
    expect(el.hasAttribute('hidden'), 'hidden while the overlay is closed').toBe(true);
  });
});
