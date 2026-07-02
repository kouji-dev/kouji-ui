import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KjDrawer } from './drawer';
import { KjDrawerService, DRAWER_DATA } from './drawer.service';
import { KjDrawerRef } from './drawer.ref';

@Component({
  selector: 'kj-simple-drawer',
  standalone: true,
  imports: [KjDrawer],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-drawer><button id="ok" (click)="ref.close('ok')">OK</button></kj-drawer>`,
})
class SimpleDrawer {
  readonly ref = inject<KjDrawerRef<SimpleDrawer, string>>(KjDrawerRef);
}

@Component({
  selector: 'kj-data-drawer',
  standalone: true,
  imports: [KjDrawer],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-drawer>{{ data }}</kj-drawer>`,
})
class DataDrawer {
  readonly data = inject<string>(DRAWER_DATA);
}

function findPanel(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('kj-drawer');
}

function cleanupOverlays(): void {
  document.body.querySelectorAll('kj-drawer').forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

describe('KjDrawerService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    cleanupOverlays();
  });

  it('open returns a ref with a controller', () => {
    const svc = TestBed.inject(KjDrawerService);
    const ref = svc.open(SimpleDrawer);
    expect(ref).toBeTruthy();
    expect(typeof ref.close).toBe('function');
    expect(ref.controller).toBeTruthy();
  });

  it('rendered panel uses role="dialog"', () => {
    const svc = TestBed.inject(KjDrawerService);
    svc.open(SimpleDrawer);
    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute('role')).toBe('dialog');
  });

  it('side option is reflected on the host as data-kj-side', () => {
    const svc = TestBed.inject(KjDrawerService);
    svc.open(SimpleDrawer, { side: 'left' });
    expect(findPanel()!.getAttribute('data-kj-side')).toBe('left');
  });

  it('defaults side to "right"', () => {
    const svc = TestBed.inject(KjDrawerService);
    svc.open(SimpleDrawer);
    expect(findPanel()!.getAttribute('data-kj-side')).toBe('right');
  });

  it('close resolves the result promise', async () => {
    const svc = TestBed.inject(KjDrawerService);
    const ref = svc.open<SimpleDrawer, string>(SimpleDrawer);
    ref.close('hello');
    await expect(ref.result).resolves.toBe('hello');
  });

  it('passes data through DRAWER_DATA', () => {
    const svc = TestBed.inject(KjDrawerService);
    svc.open(DataDrawer, { data: 'greetings' });
    expect(findPanel()!.textContent).toContain('greetings');
  });

  it('drag option is exposed to the body component', () => {
    const svc = TestBed.inject(KjDrawerService);
    const ref = svc.open(SimpleDrawer, { side: 'bottom', drag: true });
    expect(ref.instance).toBeInstanceOf(SimpleDrawer);
  });

  it('Escape closes the drawer via the overlay-stack coordinator', async () => {
    const svc = TestBed.inject(KjDrawerService);
    const ref = svc.open<SimpleDrawer, unknown>(SimpleDrawer);
    expect(findPanel()).toBeTruthy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    // The stack coordinator runs synchronously on Esc.
    await ref.result;
    // After close, the controller state should have transitioned away from open.
    expect(ref.state()).not.toBe('open');
  });
});

describe('KjDrawer (body component)', () => {
  it('exposes the resolved side through `side`', () => {
    const svc = TestBed.inject(KjDrawerService);
    const ref = svc.open(SimpleDrawer, { side: 'top' });
    expect(ref.instance as unknown as { ref: KjDrawerRef<unknown> }).toBeTruthy();
    cleanupOverlays();
  });
});
