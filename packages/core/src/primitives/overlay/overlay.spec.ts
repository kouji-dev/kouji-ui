import { Component, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { KjOverlayService, KjOverlayRef } from './overlay';

describe('KjOverlayService', () => {
  it('can be injected', async () => {
    @Component({ standalone: true, template: '' })
    class TestComponent {
      readonly svc = inject(KjOverlayService);
    }
    const { fixture } = await render(TestComponent);
    expect(fixture.componentInstance.svc).toBeTruthy();
  });

  it('createFromTemplate returns a KjOverlayRef with isOpen=false', async () => {
    @Component({
      standalone: true,
      template: '<ng-template #tpl><div>overlay content</div></ng-template>',
    })
    class TestComponent {
      @ViewChild('tpl', { static: true }) tpl!: TemplateRef<unknown>;
      readonly svc = inject(KjOverlayService);
      readonly vcr = inject(ViewContainerRef);
      ref!: KjOverlayRef;
      ngOnInit() { this.ref = this.svc.createFromTemplate(this.tpl, this.vcr); }
    }
    const { fixture } = await render(TestComponent);
    expect(fixture.componentInstance.ref.isOpen()).toBe(false);
    fixture.componentInstance.ref.dispose();
  });

  it('open() sets isOpen to true', async () => {
    @Component({
      standalone: true,
      template: '<ng-template #tpl><div>overlay</div></ng-template>',
    })
    class TestComponent {
      @ViewChild('tpl', { static: true }) tpl!: TemplateRef<unknown>;
      readonly svc = inject(KjOverlayService);
      readonly vcr = inject(ViewContainerRef);
      ref!: KjOverlayRef;
      ngOnInit() { this.ref = this.svc.createFromTemplate(this.tpl, this.vcr); }
    }
    const { fixture } = await render(TestComponent);
    const ref = fixture.componentInstance.ref;
    ref.open();
    expect(ref.isOpen()).toBe(true);
    ref.dispose();
  });

  it('close() sets isOpen to false', async () => {
    @Component({
      standalone: true,
      template: '<ng-template #tpl><div>overlay</div></ng-template>',
    })
    class TestComponent {
      @ViewChild('tpl', { static: true }) tpl!: TemplateRef<unknown>;
      readonly svc = inject(KjOverlayService);
      readonly vcr = inject(ViewContainerRef);
      ref!: KjOverlayRef;
      ngOnInit() { this.ref = this.svc.createFromTemplate(this.tpl, this.vcr); }
    }
    const { fixture } = await render(TestComponent);
    const ref = fixture.componentInstance.ref;
    ref.open();
    ref.close();
    expect(ref.isOpen()).toBe(false);
    ref.dispose();
  });

  it('dispose() removes the overlay container from document.body', async () => {
    @Component({
      standalone: true,
      template: '<ng-template #tpl><div>overlay</div></ng-template>',
    })
    class TestComponent {
      @ViewChild('tpl', { static: true }) tpl!: TemplateRef<unknown>;
      readonly svc = inject(KjOverlayService);
      readonly vcr = inject(ViewContainerRef);
      ref!: KjOverlayRef;
      ngOnInit() { this.ref = this.svc.createFromTemplate(this.tpl, this.vcr); }
    }
    const { fixture } = await render(TestComponent);
    const ref = fixture.componentInstance.ref;
    ref.open();
    expect(document.body.querySelector('[data-kj-overlay]')).toBeTruthy();
    ref.dispose();
    expect(document.body.querySelector('[data-kj-overlay]')).toBeNull();
  });
});
