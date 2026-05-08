import { Component, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { KjBackdrop } from './backdrop';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_BACKDROP_STRATEGY } from './tokens';

describe('KjBackdrop', () => {
  it('clicking host invokes controller.close when closeOnClick=true', async () => {
    @Component({
      standalone: true,
      imports: [KjBackdrop],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useValue: {
          inertSiblings: true, closeOnClick: true, className: 'kj-backdrop',
          attach() {}, onOpen() {}, onClose() {}, detach() {},
        }},
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
    expect(closeSpy).toHaveBeenCalledWith('outside');
  });

  it('does not close when closeOnClick=false', async () => {
    @Component({
      standalone: true,
      imports: [KjBackdrop],
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useValue: {
          inertSiblings: false, closeOnClick: false, className: 'kj-backdrop',
          attach() {}, onOpen() {}, onClose() {}, detach() {},
        }},
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
});
