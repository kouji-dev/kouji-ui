import { Component, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { KjOverlayService } from './overlay';

describe('KjOverlayService', () => {
  it('can be injected', async () => {
    @Component({
      standalone: true,
      template: '',
      providers: [],
    })
    class TestComponent {
      readonly svc = inject(KjOverlayService);
    }
    const { fixture } = await render(TestComponent, {
      providers: [],
    });
    expect(fixture.componentInstance.svc).toBeTruthy();
  });

  it('createOverlay returns a KjOverlayRef with isOpen=false', async () => {
    @Component({
      standalone: true,
      template: '<div #origin></div>',
    })
    class TestComponent {
      readonly svc = inject(KjOverlayService);
      readonly ref = this.svc.createGlobalOverlay();
    }
    const { fixture } = await render(TestComponent);
    expect(fixture.componentInstance.ref.isOpen()).toBe(false);
  });

  it('open() sets isOpen to true', async () => {
    @Component({
      standalone: true,
      template: '',
    })
    class TestComponent {
      readonly svc = inject(KjOverlayService);
      readonly ref = this.svc.createGlobalOverlay();
    }
    const { fixture } = await render(TestComponent);
    const ref = fixture.componentInstance.ref;
    ref.open();
    expect(ref.isOpen()).toBe(true);
  });

  it('close() sets isOpen to false', async () => {
    @Component({
      standalone: true,
      template: '',
    })
    class TestComponent {
      readonly svc = inject(KjOverlayService);
      readonly ref = this.svc.createGlobalOverlay();
    }
    const { fixture } = await render(TestComponent);
    const ref = fixture.componentInstance.ref;
    ref.open();
    ref.close();
    expect(ref.isOpen()).toBe(false);
  });
});
