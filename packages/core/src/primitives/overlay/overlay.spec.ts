import { Component, TemplateRef, ViewChild, ViewContainerRef, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
    class TestComponent implements OnInit {
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
    class TestComponent implements OnInit {
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
    class TestComponent implements OnInit {
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
    class TestComponent implements OnInit {
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

  describe('overlay stack', () => {
    function makeService(): KjOverlayService {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      return TestBed.inject(KjOverlayService);
    }

    it('register() pushes onto the stack and isTopmost reflects order', () => {
      const svc = makeService();
      const a = svc.register('a', { onClose: () => {} });
      expect(a.isTopmost()).toBe(true);
      const b = svc.register('b', { onClose: () => {} });
      expect(a.isTopmost()).toBe(false);
      expect(b.isTopmost()).toBe(true);
      b.unregister();
      expect(a.isTopmost()).toBe(true);
      a.unregister();
    });

    it('unregister() removes the entry; topmost falls back to predecessor', () => {
      const svc = makeService();
      const a = svc.register('a', { onClose: () => {} });
      const b = svc.register('b', { onClose: () => {} });
      const c = svc.register('c', { onClose: () => {} });
      expect(svc.stackSize).toBe(3);
      b.unregister();
      expect(svc.stackSize).toBe(2);
      expect(c.isTopmost()).toBe(true);
      expect(a.isTopmost()).toBe(false);
      c.unregister();
      expect(a.isTopmost()).toBe(true);
      a.unregister();
      expect(svc.stackSize).toBe(0);
    });

    it('Escape only fires onClose on the topmost overlay (closeOnEsc)', () => {
      const svc = makeService();
      const aClose = vi.fn();
      const bClose = vi.fn();
      const a = svc.register('a', { onClose: aClose });
      const b = svc.register('b', { onClose: bClose });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(bClose).toHaveBeenCalledTimes(1);
      expect(aClose).not.toHaveBeenCalled();

      b.unregister();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(aClose).toHaveBeenCalledTimes(1);
      expect(bClose).toHaveBeenCalledTimes(1);
      a.unregister();
    });

    it('respects closeOnEsc=false on the topmost overlay', () => {
      const svc = makeService();
      const onClose = vi.fn();
      const h = svc.register('a', { onClose, closeOnEsc: false });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(onClose).not.toHaveBeenCalled();
      h.unregister();
    });

    it('outside pointerdown only closes the topmost overlay', () => {
      const svc = makeService();
      const aEl = document.createElement('div');
      const bEl = document.createElement('div');
      document.body.appendChild(aEl);
      document.body.appendChild(bEl);

      const aClose = vi.fn();
      const bClose = vi.fn();
      const a = svc.register('a', { onClose: aClose });
      svc.markContentEl('a', aEl);
      const b = svc.register('b', { onClose: bClose });
      svc.markContentEl('b', bEl);

      // pointerdown outside both: only topmost (b) closes.
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      expect(bClose).toHaveBeenCalledTimes(1);
      expect(aClose).not.toHaveBeenCalled();

      b.unregister();
      a.unregister();
      aEl.remove();
      bEl.remove();
      outside.remove();
    });

    it('pointerdown inside topmost content does NOT close it', () => {
      const svc = makeService();
      const el = document.createElement('div');
      const inner = document.createElement('span');
      el.appendChild(inner);
      document.body.appendChild(el);

      const onClose = vi.fn();
      const h = svc.register('a', { onClose });
      svc.markContentEl('a', el);

      inner.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(onClose).not.toHaveBeenCalled();

      h.unregister();
      el.remove();
    });

    it('respects closeOnOutside=false', () => {
      const svc = makeService();
      const el = document.createElement('div');
      document.body.appendChild(el);

      const onClose = vi.fn();
      const h = svc.register('a', { onClose, closeOnOutside: false });
      svc.markContentEl('a', el);

      const outside = document.createElement('div');
      document.body.appendChild(outside);
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(onClose).not.toHaveBeenCalled();

      h.unregister();
      el.remove();
      outside.remove();
    });

    it('document listeners are removed when the stack drains', () => {
      const svc = makeService();
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const h = svc.register('a', { onClose: () => {} });
      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      expect(addSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);

      h.unregister();
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('scroll-lock counter', () => {
    function makeService(): KjOverlayService {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      return TestBed.inject(KjOverlayService);
    }

    afterEach(() => {
      // Belt-and-braces — reset html styles in case a test leaked.
      document.documentElement.style.overflow = '';
      document.documentElement.style.paddingRight = '';
    });

    it('first lock applies overflow:hidden; releasing it restores', () => {
      const svc = makeService();
      const html = document.documentElement;
      expect(html.style.overflow).toBe('');
      const unlock = svc.lockBodyScroll();
      expect(html.style.overflow).toBe('hidden');
      expect(svc.lockCount).toBe(1);
      unlock();
      expect(svc.lockCount).toBe(0);
      expect(html.style.overflow).toBe('');
    });

    it('two locks need two unlocks (reference counting)', () => {
      const svc = makeService();
      const html = document.documentElement;
      const a = svc.lockBodyScroll();
      const b = svc.lockBodyScroll();
      expect(svc.lockCount).toBe(2);
      expect(html.style.overflow).toBe('hidden');

      a();
      expect(svc.lockCount).toBe(1);
      expect(html.style.overflow).toBe('hidden');

      b();
      expect(svc.lockCount).toBe(0);
      expect(html.style.overflow).toBe('');
    });

    it('unlock is idempotent — calling twice releases only once', () => {
      const svc = makeService();
      const a = svc.lockBodyScroll();
      const b = svc.lockBodyScroll();
      a();
      a(); // second call is a no-op
      expect(svc.lockCount).toBe(1);
      b();
      expect(svc.lockCount).toBe(0);
    });

    it('compensates scrollbar width with padding-right', () => {
      const svc = makeService();
      const html = document.documentElement;
      // Force a non-zero scrollbar by mocking the values.
      const innerW = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
      const clientW = vi.spyOn(html, 'clientWidth', 'get').mockReturnValue(1009);

      const unlock = svc.lockBodyScroll();
      expect(html.style.paddingRight).toBe('15px');
      unlock();
      expect(html.style.paddingRight).toBe('');

      innerW.mockRestore();
      clientW.mockRestore();
    });

    it('nested overlays do not double-lock or double-unlock', () => {
      const svc = makeService();
      const html = document.documentElement;

      // Outer dialog opens and locks
      const outerUnlock = svc.lockBodyScroll();
      // Outer opens an inner dialog which also locks
      const innerUnlock = svc.lockBodyScroll();
      expect(svc.lockCount).toBe(2);
      expect(html.style.overflow).toBe('hidden');

      // Inner closes — body still locked because outer is open
      innerUnlock();
      expect(svc.lockCount).toBe(1);
      expect(html.style.overflow).toBe('hidden');

      // Outer closes — body unlocked
      outerUnlock();
      expect(svc.lockCount).toBe(0);
      expect(html.style.overflow).toBe('');
    });
  });

  describe('SSR (server platform)', () => {
    function makeServerService(): KjOverlayService {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      return TestBed.inject(KjOverlayService);
    }

    it('register() returns a stable handle that is a no-op', () => {
      const svc = makeServerService();
      const onClose = vi.fn();
      const h = svc.register('a', { onClose });
      expect(h.isTopmost()).toBe(false);
      expect(svc.stackSize).toBe(0);
      // Unregister must not throw
      h.unregister();
      // Even if we dispatch escape, no DOM listener was installed and onClose
      // must not be called.
      expect(onClose).not.toHaveBeenCalled();
    });

    it('lockBodyScroll() is a no-op returning a no-op unlocker', () => {
      const svc = makeServerService();
      const unlock = svc.lockBodyScroll();
      expect(svc.lockCount).toBe(0);
      // Calling unlock must not throw.
      expect(() => unlock()).not.toThrow();
    });

    it('markContentEl() is a no-op', () => {
      const svc = makeServerService();
      expect(() => svc.markContentEl('a', null)).not.toThrow();
    });
  });
});
