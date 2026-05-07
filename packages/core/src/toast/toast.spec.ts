import { Component, TemplateRef, ViewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjToast, KjToastViewport } from './toast';
import { KjToastService, type KjToastTemplateContext } from './toast.service';

expect.extend(toHaveNoViolations);

describe('KjToast', () => {
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

describe('KjToastService', () => {
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

  it('success() sets variant=success', () => {
    svc.success('Done', { duration: 0 });
    expect(svc.toasts()[0].variant).toBe('success');
  });

  it('error() sets variant=destructive', () => {
    svc.error('Fail', { duration: 0 });
    expect(svc.toasts()[0].variant).toBe('destructive');
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
    // Pause swallows the next 5 seconds — the timer must not fire.
    vi.advanceTimersByTime(5000);
    expect(svc.toasts().find(t => t.id === id)).toBeDefined();
  });

  it('resume() re-arms with the remaining duration', () => {
    svc.show('Resume me', { duration: 1000 });
    vi.advanceTimersByTime(400);
    svc.pause('hover');
    vi.advanceTimersByTime(5000);
    svc.resume('hover');
    // Remaining was 600 ms; advancing 599 keeps it alive, 1 ms more fires.
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
    // Advance to confirm no late timer fires.
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
  class Host {
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

  it('F6 from outside pulls focus into the front toast (action button)', async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const svc = TestBed.inject(KjToastService);
    svc.show(fixture.componentInstance.tpl, { duration: 0 });
    fixture.detectChanges();
    await fixture.whenStable();

    const outsideBtn = fixture.nativeElement.querySelector('#outside-btn') as HTMLButtonElement;
    outsideBtn.focus();
    expect(document.activeElement).toBe(outsideBtn);

    const front = fixture.nativeElement.querySelector('[kjToast][data-front="true"]');
    expect(front).toBeTruthy();
    const action = front!.querySelector('.action') as HTMLButtonElement;
    expect(action).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(action);

    svc.dismissAll();
    document.body.removeChild(fixture.nativeElement);
  });

  it('F6 from inside the viewport returns focus to the previously focused element', async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const svc = TestBed.inject(KjToastService);
    svc.show(fixture.componentInstance.tpl, { duration: 0 });
    fixture.detectChanges();
    await fixture.whenStable();

    const outsideBtn = fixture.nativeElement.querySelector('#outside-btn') as HTMLButtonElement;
    outsideBtn.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }));

    const action = fixture.nativeElement.querySelector('.action') as HTMLButtonElement;
    expect(document.activeElement).toBe(action);

    // F6 from within — should restore focus.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(outsideBtn);

    svc.dismissAll();
    document.body.removeChild(fixture.nativeElement);
  });

  it('Escape inside the viewport dismisses the focused toast and restores focus', async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const svc = TestBed.inject(KjToastService);
    svc.show(fixture.componentInstance.tpl, { duration: 0 });
    fixture.detectChanges();
    await fixture.whenStable();

    const outsideBtn = fixture.nativeElement.querySelector('#outside-btn') as HTMLButtonElement;
    outsideBtn.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }));
    const action = fixture.nativeElement.querySelector('.action') as HTMLButtonElement;
    expect(document.activeElement).toBe(action);

    action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(svc.toasts().length).toBe(0);
    expect(document.activeElement).toBe(outsideBtn);

    document.body.removeChild(fixture.nativeElement);
  });

  it('F6 is a no-op when there are no toasts (does not preventDefault)', async () => {
    await render(`<div kjToastViewport></div>`, { imports: [KjToastViewport] });
    const event = new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
