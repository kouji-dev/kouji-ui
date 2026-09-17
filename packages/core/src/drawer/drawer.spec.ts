import { ApplicationRef, Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KjDrawer } from './drawer';
import { KjDrawerTitle } from './drawer-title';
import { KjDrawerService, DRAWER_DATA, type KjDrawerOpenOptions } from './drawer.service';
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

/**
 * Opens a drawer and flushes change detection so the panel's host bindings
 * and template render synchronously. The service creates the component
 * outside a TestBed fixture, so an explicit `ApplicationRef.tick()` stands in
 * for the zone-driven CD that a real app performs after `open()`.
 */
function openDrawer<T, R = unknown, D = unknown>(
  component: Parameters<KjDrawerService['open']>[0],
  opts?: KjDrawerOpenOptions<D>,
): KjDrawerRef<T, R> {
  const svc = TestBed.inject(KjDrawerService);
  const ref = svc.open<T, R, D>(component as never, opts);
  TestBed.inject(ApplicationRef).tick();
  return ref;
}

function findPanel(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.kj-overlay-container kj-drawer');
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

async function flush(): Promise<void> {
  await settle();
  TestBed.inject(ApplicationRef).tick();
  await settle();
}

function cleanupOverlays(): void {
  document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

describe('KjDrawerService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(async () => {
    cleanupOverlays();
    await settle();
  });

  it('open returns a ref with a controller', () => {
    const ref = openDrawer(SimpleDrawer);
    expect(ref).toBeTruthy();
    expect(typeof ref.close).toBe('function');
    expect(ref.controller).toBeTruthy();
  });

  it('rendered panel uses role="dialog"', () => {
    openDrawer(SimpleDrawer);
    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute('role')).toBe('dialog');
  });

  it('side option is reflected on the host as data-kj-side', () => {
    openDrawer(SimpleDrawer, { side: 'left' });
    expect(findPanel()!.getAttribute('data-kj-side')).toBe('left');
  });

  it('defaults side to "right"', () => {
    openDrawer(SimpleDrawer);
    expect(findPanel()!.getAttribute('data-kj-side')).toBe('right');
  });

  it('close resolves the result promise', async () => {
    const ref = openDrawer<SimpleDrawer, string>(SimpleDrawer);
    ref.close('hello');
    await expect(ref.result).resolves.toBe('hello');
  });

  it('a dismissal (Escape / scrim) settles afterClosed$ and result like close() does', async () => {
    const ref = openDrawer<SimpleDrawer, string>(SimpleDrawer);
    await flush();
    const emitted: (string | undefined)[] = [];
    ref.afterClosed$.subscribe((r) => emitted.push(r));
    ref.controller.close('escape');
    await flush();
    expect(ref.closeReason()).toBe('escape');
    expect(emitted).toEqual([undefined]);
    await expect(ref.result).resolves.toBeUndefined();
  });

  it('passes data through DRAWER_DATA', () => {
    openDrawer(DataDrawer, { data: 'greetings' });
    expect(findPanel()!.textContent).toContain('greetings');
  });

  it('drag option is exposed to the body component', () => {
    const ref = openDrawer(SimpleDrawer, { side: 'bottom', drag: true });
    expect(ref.instance).toBeInstanceOf(SimpleDrawer);
  });

  it('Escape closes the drawer via the overlay-stack coordinator', async () => {
    const ref = openDrawer<SimpleDrawer, unknown>(SimpleDrawer);
    expect(findPanel()).toBeTruthy();
    await flush();
    expect(ref.state()).toBe('open');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flush();
    expect(ref.state()).toBe('closed');
  });

  it('afterOpened$ emits exactly once, when the open transition completes, then completes', async () => {
    const ref = openDrawer(SimpleDrawer);
    let emissions = 0;
    let completed = false;
    ref.afterOpened$.subscribe({ next: () => emissions++, complete: () => { completed = true; } });
    expect(emissions).toBe(0);
    await flush();
    expect(ref.state()).toBe('open');
    expect(emissions).toBe(1);
    expect(completed).toBe(true);
    TestBed.inject(ApplicationRef).tick();
    expect(emissions).toBe(1);
    ref.close();
    await flush();
  });

  it('returns focus to the opener on close', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const ref = openDrawer(SimpleDrawer);
    await flush();
    const panel = findPanel()!;
    expect(document.activeElement).toBe(panel);
    panel.querySelector<HTMLElement>('#ok')!.focus();
    ref.close();
    await flush();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('KjDrawer (body component)', () => {
  it('exposes the resolved side through `side`', () => {
    const ref = openDrawer(SimpleDrawer, { side: 'top' });
    expect(ref.instance as unknown as { ref: KjDrawerRef<unknown> }).toBeTruthy();
    cleanupOverlays();
  });
});

@Component({
  selector: 'kj-titled-drawer',
  standalone: true,
  imports: [KjDrawer, KjDrawerTitle],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-drawer><h2 kjDrawerTitle>Settings</h2><button id="ok" (click)="ref.close()">OK</button></kj-drawer>`,
})
class TitledDrawer {
  readonly ref = inject<KjDrawerRef<TitledDrawer, string>>(KjDrawerRef);
}

describe('KjDrawer accessible name', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    cleanupOverlays();
  });

  it('a projected [kjDrawerTitle] names the drawer via aria-labelledby', async () => {
    const ref = openDrawer<TitledDrawer>(TitledDrawer);
    await flush();
    const panel = findPanel()!;
    const title = panel.querySelector('h2')!;
    expect(title.id).toMatch(/^kj-drawer-title-\d+$/);
    expect(title.classList.contains('kj-drawer-title')).toBe(true);
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
    expect(panel.hasAttribute('aria-label')).toBe(false);
    expect(panel).toHaveAccessibleName('Settings');
    ref.close();
    await flush();
  });

  it('ariaLabel names a title-less body; ariaLabelledBy wins over a title', async () => {
    const plain = openDrawer<SimpleDrawer>(SimpleDrawer, { ariaLabel: 'Filters' });
    expect(findPanel()!.getAttribute('aria-label')).toBe('Filters');
    expect(findPanel()!.hasAttribute('aria-labelledby')).toBe(false);
    plain.close();
    await flush();

    const titled = openDrawer<TitledDrawer>(TitledDrawer, { ariaLabelledBy: 'page-heading' });
    expect(findPanel()!.getAttribute('aria-labelledby')).toBe('page-heading');
    titled.close();
    await flush();
  });
});

/**
 * arch F-13 — `KjDrawer`'s Escape handler moved from `@HostListener` into the
 * `host` block, and the drag flag moved from a plain field behind a
 * `computed()` (which can never recompute) to a real signal.
 */
describe('KjDrawer drag state', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(async () => {
    cleanupOverlays();
    await settle();
  });

  function pointerDown(target: HTMLElement, clientY: number): void {
    const event = new MouseEvent('pointerdown', { bubbles: true, clientY });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    target.dispatchEvent(event);
  }

  it('reflects data-kj-dragging while a bottom drawer is being dragged', async () => {
    openDrawer(SimpleDrawer, { side: 'bottom', drag: true });
    const panel = findPanel()!;
    expect(panel.hasAttribute('data-kj-dragging')).toBe(false);

    pointerDown(panel, 100);
    TestBed.inject(ApplicationRef).tick();

    // Before the fix this stayed absent forever: `dragging` was a computed
    // over a plain boolean field, so the binding never re-evaluated.
    expect(panel.getAttribute('data-kj-dragging')).toBe('');
    expect(panel.style.touchAction).toBe('none');

    const up = new MouseEvent('pointerup', { bubbles: true, clientY: 102 });
    Object.defineProperty(up, 'pointerId', { value: 1 });
    panel.dispatchEvent(up);
    TestBed.inject(ApplicationRef).tick();

    expect(panel.hasAttribute('data-kj-dragging')).toBe(false);
  });

  it('ignores pointerdown when drag is off', async () => {
    openDrawer(SimpleDrawer, { side: 'bottom' });
    const panel = findPanel()!;
    pointerDown(panel, 100);
    TestBed.inject(ApplicationRef).tick();
    expect(panel.hasAttribute('data-kj-dragging')).toBe(false);
  });
});
