import { Component, TemplateRef, ViewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjToast, KjToastViewport } from './toast';
import { KjToastService, type KjToastTemplateContext } from './toast.service';
import { KjToastRef } from './toast.ref';

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
  it('has aria-live=polite', async () => {
    const { container } = await render(`<div kjToastViewport></div>`, { imports: [KjToastViewport] });
    expect(container.querySelector('[kjToastViewport]')).toHaveAttribute('aria-live', 'polite');
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
  class _Host {
    @ViewChild('tpl') tpl!: TemplateRef<KjToastTemplateContext>;
  }

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
});
