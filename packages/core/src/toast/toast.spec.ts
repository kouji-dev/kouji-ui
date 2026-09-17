import { Component } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjToast, KjToastViewport } from './toast';
import { KjToastService } from './toast.service';
import { KjToastRef } from './toast.ref';
import { KjDialogService } from '../dialog/dialog.service';
import { vi } from 'vitest';

expect.extend(toHaveNoViolations);

describe('KjToast directive', () => {
  it('sets role=status by default', async () => {
    const { container } = await render(`<div kjToast>Saved</div>`, { imports: [KjToast] });
    expect(container.querySelector('[kjToast]')).toHaveAttribute('role', 'status');
  });

  it('sets role=alert for destructive', async () => {
    const { container } = await render(
      `<div kjToast [kjToastVariant]="'destructive'">Error</div>`,
      { imports: [KjToast] },
    );
    expect(container.querySelector('[kjToast]')).toHaveAttribute('role', 'alert');
  });

  it('sets data-variant attribute', async () => {
    const { container } = await render(
      `<div kjToast [kjToastVariant]="'success'">OK</div>`,
      { imports: [KjToast] },
    );
    expect(container.querySelector('[kjToast]')).toHaveAttribute('data-variant', 'success');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<div kjToast>Saved</div>`, { imports: [KjToast] });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('KjToastViewport', () => {
  it('is a landmark, not a live region — each toast announces itself exactly once', async () => {
    const { container } = await render(`<div kjToastViewport></div>`, { imports: [KjToastViewport] });
    const vp = container.querySelector('[kjToastViewport]')!;
    expect(vp.hasAttribute('aria-live')).toBe(false);
    expect(vp.hasAttribute('aria-atomic')).toBe(false);
    expect(vp.hasAttribute('aria-relevant')).toBe(false);
  });

  it('has role=region', async () => {
    const { container } = await render(`<div kjToastViewport></div>`, { imports: [KjToastViewport] });
    expect(container.querySelector('[kjToastViewport]')).toHaveAttribute('role', 'region');
  });
});

describe('KjToastService overlay API', () => {
  let svc: KjToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(KjToastService);
  });

  afterEach(() => {
    svc.dismissAll();
  });

  it('success() returns a KjToastRef', () => {
    const ref = svc.success({ message: 'Saved' });
    expect(ref).toBeInstanceOf(KjToastRef);
    expect(typeof ref.close).toBe('function');
    expect(typeof ref.id).toBe('string');
  });

  it('info() / warn() / error() each return a KjToastRef', () => {
    expect(svc.info({ message: 'i' })).toBeInstanceOf(KjToastRef);
    expect(svc.warn({ message: 'w' })).toBeInstanceOf(KjToastRef);
    expect(svc.error({ message: 'e' })).toBeInstanceOf(KjToastRef);
  });

  it('error() builds an overlay whose controller exists', () => {
    const ref = svc.error({ message: 'Boom' });
    expect(ref.controller).toBeTruthy();
  });

  it('ref.close() removes the toast from the queue', () => {
    const ref = svc.success({ message: 'Saved', duration: 0 });
    expect(svc.toasts().some((t) => t.id === ref.id)).toBe(true);
    ref.close();
    expect(svc.toasts().some((t) => t.id === ref.id)).toBe(false);
  });
});

describe('KjToastService overlay API — stack posture (overlay F-4)', () => {
  @Component({ standalone: true, template: '<button>ok</button>' })
  class DialogBody {}

  const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));
  let svc: KjToastService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(KjToastService);
  });

  afterEach(async () => {
    svc.dismissAll();
    await settle();
    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
  });

  it('an overlay toast is a passive entry: never topmost, never closed by Escape or an outside press', () => {
    const ref = svc.success({ message: 'Saved', duration: 0 });
    expect(ref.controller.isOpen()).toBe(true);
    expect(ref.controller.isTopmost()).toBe(false);
    expect(ref.controller.closeOnEsc).toBe(false);
    expect(ref.controller.closeOnOutside).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(ref.controller.isOpen()).toBe(true);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(ref.controller.isOpen()).toBe(true);
    expect(ref.controller.closeReason()).toBeNull();
  });

  it('a toast shown over a dialog leaves the dialog the owner of Escape', async () => {
    const dialog = TestBed.inject(KjDialogService).open(DialogBody);
    await settle();
    expect(dialog.state()).toBe('open');

    const toast = svc.success({ message: 'Saved', duration: 0 });
    expect(toast.controller.isOpen()).toBe(true);
    // A passive toast never takes the top.
    expect(dialog.controller.isTopmost()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dialog.state()).toBe('closing');
    expect(dialog.closeReason()).toBe('escape');
    expect(toast.controller.isOpen()).toBe(true);
    await settle();
  });
});

describe('KjToastService queue API', () => {
  let svc: KjToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(KjToastService);
  });

  it('show(message) adds a toast', () => {
    expect(svc.toasts().length).toBe(0);
    svc.show('Hello', { duration: 0 });
    expect(svc.toasts().length).toBe(1);
    expect(svc.toasts()[0].message).toBe('Hello');
  });

  it('dismiss() removes a toast', () => {
    const id = svc.show('Test', { duration: 0 });
    svc.dismiss(id);
    expect(svc.toasts().length).toBe(0);
  });

  it('dismissAll() clears all toasts', () => {
    svc.show('A', { duration: 0 });
    svc.show('B', { duration: 0 });
    svc.dismissAll();
    expect(svc.toasts().length).toBe(0);
  });

  it('contextFor() exposes a bound dismiss callback', () => {
    const id = svc.show('Hello', { duration: 0 });
    const ctx = svc.contextFor(svc.toasts()[0]);
    expect(ctx.id).toBe(id);
    expect(ctx.message).toBe('Hello');
    ctx.dismiss();
    expect(svc.toasts().length).toBe(0);
  });
});

describe('KjToastService pause / resume', () => {
  let svc: KjToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(KjToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pauses the auto-dismiss timer while a reason is held', () => {
    const id = svc.show('Pause me', { duration: 1000 });
    vi.advanceTimersByTime(400);
    svc.pause('hover');
    vi.advanceTimersByTime(5000);
    expect(svc.toasts().find((t) => t.id === id)).toBeDefined();
  });

  it('resume() re-arms with the remaining duration', () => {
    svc.show('Resume me', { duration: 1000 });
    vi.advanceTimersByTime(400);
    svc.pause('hover');
    vi.advanceTimersByTime(5000);
    svc.resume('hover');
    vi.advanceTimersByTime(599);
    expect(svc.toasts().length).toBe(1);
    vi.advanceTimersByTime(2);
    expect(svc.toasts().length).toBe(0);
  });

  it('ref-counts pause/resume per reason', () => {
    svc.show('Ref count', { duration: 1000 });
    svc.pause('hover');
    svc.pause('focus');
    expect(svc.isPaused()).toBe(true);
    svc.resume('hover');
    expect(svc.isPaused()).toBe(true);
    svc.resume('focus');
    expect(svc.isPaused()).toBe(false);
  });

  it('an extra resume() never goes negative', () => {
    svc.show('Extra resume', { duration: 1000 });
    svc.resume('hover');
    svc.resume('hover');
    expect(svc.isPaused()).toBe(false);
    svc.pause('hover');
    expect(svc.isPaused()).toBe(true);
    svc.resume('hover');
    expect(svc.isPaused()).toBe(false);
  });

  it('dismiss() clears the active timer regardless of pause state', () => {
    const id = svc.show('Dismiss while paused', { duration: 1000 });
    svc.pause('hover');
    svc.dismiss(id);
    svc.resume('hover');
    expect(svc.toasts().length).toBe(0);
    vi.advanceTimersByTime(2000);
    expect(svc.toasts().length).toBe(0);
  });
});

describe('KjToastViewport interactions', () => {
  @Component({
    standalone: true,
    imports: [KjToastViewport, KjToast, NgTemplateOutlet],
    template: `
      <button id="outside-btn">Outside</button>
      <ol kjToastViewport [kjToastDefaultTemplate]="tpl" aria-label="Notifications" #vp="kjToastViewport">
        @for (r of vp.renderable(); track r.id) {
          <li>
            <ng-container [ngTemplateOutlet]="r.template" [ngTemplateOutletContext]="r.context"></ng-container>
          </li>
        }
      </ol>
      <ng-template #tpl let-ctx>
        <div kjToast [kjToastId]="ctx.id">
          <span>{{ ctx.message }}</span>
          <button class="action" (click)="ctx.dismiss()">Undo</button>
        </div>
      </ng-template>
    `,
  })
  // arch F-13: the `@ViewChild('tpl')` field this class used to carry was
  // dead — `[kjToastDefaultTemplate]="tpl"` resolves the `#tpl` template
  // reference variable in the same template, never the class member.
  class _Host {}

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('host exposes tabindex="-1" so F6 can target it as a fallback', async () => {
    const { container } = await render(`<div kjToastViewport></div>`, { imports: [KjToastViewport] });
    expect(container.querySelector('[kjToastViewport]')).toHaveAttribute('tabindex', '-1');
  });

  it('pauses + resumes the service on pointer enter / leave', () => {
    const svc = TestBed.inject(KjToastService);
    svc.show('Hi', { duration: 0 });
    @Component({
      standalone: true,
      imports: [KjToastViewport],
      template: `<ol kjToastViewport></ol>`,
    })
    class Bare {}
    const fixture = TestBed.createComponent(Bare);
    fixture.detectChanges();
    const vp = fixture.nativeElement.querySelector('[kjToastViewport]') as HTMLElement;
    vp.dispatchEvent(new MouseEvent('mouseenter'));
    expect(svc.isPaused()).toBe(true);
    vp.dispatchEvent(new MouseEvent('mouseleave'));
    expect(svc.isPaused()).toBe(false);
    svc.dismissAll();
  });

  it('pauses + resumes the service while focus is inside it (WCAG 2.2.1)', () => {
    const svc = TestBed.inject(KjToastService);
    svc.show('Hi', { duration: 0 });
    @Component({
      standalone: true,
      imports: [KjToastViewport],
      template: `<ol kjToastViewport><li><button id="undo">Undo</button></li></ol>`,
    })
    class WithAction {}
    const fixture = TestBed.createComponent(WithAction);
    fixture.detectChanges();
    const vp = fixture.nativeElement.querySelector('[kjToastViewport]') as HTMLElement;
    const undo = fixture.nativeElement.querySelector('#undo') as HTMLButtonElement;
    document.body.appendChild(fixture.nativeElement);

    undo.focus();
    vp.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    // A toast must not vanish while you are tabbing to its action.
    expect(svc.isPaused()).toBe(true);

    undo.blur();
    vp.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(svc.isPaused()).toBe(false);
    svc.dismissAll();
  });

  it('every toast rides ONE shared ResizeObserver', async () => {
    let observers = 0;
    let observed = () => 0;
    class FakeRO {
      private targets: Element[] = [];
      constructor(_cb: ResizeObserverCallback) {
        observers++;
        observed = () => this.targets.length;
      }
      observe(el: Element) { this.targets.push(el); }
      unobserve(el: Element) { this.targets = this.targets.filter((t) => t !== el); }
      disconnect() { this.targets = []; }
    }
    vi.stubGlobal('ResizeObserver', FakeRO);
    try {
      await render(
        `<div kjToast kjToastId="a">A</div>
         <div kjToast kjToastId="b">B</div>
         <div kjToast kjToastId="c">C</div>`,
        { imports: [KjToast] },
      );
      // A queue of toasts used to mean one ResizeObserver each.
      expect(observers).toBe(1);
      expect(observed()).toBe(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('KjToastService ids', () => {
  it('mints ids through KjId (SSR-safe, deterministic) without touching crypto', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const svc = TestBed.inject(KjToastService);
    const uuid = vi.spyOn(globalThis.crypto, 'randomUUID');
    const a = svc.show('one');
    const b = svc.show('two');
    expect(a).toMatch(/^kj-toast-\d+$/);
    expect(b).toMatch(/^kj-toast-\d+$/);
    expect(a).not.toBe(b);
    expect(uuid).not.toHaveBeenCalled();
    uuid.mockRestore();
    svc.dismissAll();
  });
});


describe('KjToastViewport — bare boolean attributes (arch F-2)', () => {
  it('kjToastExpand written bare forces the expanded state', async () => {
    // Tri-state input: `undefined` follows the strategy. Without the guarded
    // transform the bare attribute bound '' and read as "collapsed".
    const { container } = await render(`<ol kjToastViewport kjToastExpand></ol>`, {
      imports: [KjToastViewport],
    });
    expect(container.querySelector('[kjToastViewport]')).toHaveAttribute(
      'data-expanded',
      'true',
    );
  });

  it('leaves the strategy in charge when the attribute is absent', async () => {
    const { container } = await render(`<ol kjToastViewport></ol>`, {
      imports: [KjToastViewport],
    });
    expect(container.querySelector('[kjToastViewport]')).toHaveAttribute(
      'data-expanded',
      'false',
    );
  });
});
