import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KjResizeObserver } from './resize-observer';

/**
 * jsdom ships no `ResizeObserver`, so the spec installs one it can drive: each
 * instance records its targets and exposes a `fire()` that delivers entries the
 * way a browser would.
 */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly targets = new Set<Element>();
  disconnected = false;

  constructor(private readonly callback: (entries: { target: Element }[]) => void) {
    FakeResizeObserver.instances.push(this);
  }

  observe(el: Element): void {
    this.targets.add(el);
  }

  unobserve(el: Element): void {
    this.targets.delete(el);
  }

  disconnect(): void {
    this.disconnected = true;
    this.targets.clear();
  }

  fire(...targets: Element[]): void {
    this.callback(targets.map((target) => ({ target })));
  }
}

/** The service coalesces into an animation frame; jsdom needs one turn to run it. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe('KjResizeObserver', () => {
  let a: HTMLElement;
  let b: HTMLElement;

  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    a = document.createElement('div');
    b = document.createElement('div');
    document.body.append(a, b);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    a.remove();
    b.remove();
  });

  it('shares ONE ResizeObserver across every observed element', () => {
    const svc = TestBed.inject(KjResizeObserver);
    const releases = [svc.observe(a, () => {}), svc.observe(b, () => {})];

    expect(FakeResizeObserver.instances).toHaveLength(1);
    expect(FakeResizeObserver.instances[0].targets.size).toBe(2);
    for (const release of releases) release();
  });

  it('dispatches each entry to the callbacks registered for that element', async () => {
    const svc = TestBed.inject(KjResizeObserver);
    const onA = vi.fn();
    const onB = vi.fn();
    const releases = [svc.observe(a, onA), svc.observe(b, onB)];

    FakeResizeObserver.instances[0].fire(a);
    await nextFrame();

    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).not.toHaveBeenCalled();
    for (const release of releases) release();
  });

  it('coalesces a burst of entries into one callback per frame', async () => {
    const svc = TestBed.inject(KjResizeObserver);
    const onA = vi.fn();
    const release = svc.observe(a, onA);

    const observer = FakeResizeObserver.instances[0];
    observer.fire(a);
    observer.fire(a);
    observer.fire(a);
    await nextFrame();

    expect(onA).toHaveBeenCalledTimes(1);
    release();
  });

  it('two callbacks on one element both run, and the element is unobserved only when both are released', async () => {
    const svc = TestBed.inject(KjResizeObserver);
    const first = vi.fn();
    const second = vi.fn();
    const releaseFirst = svc.observe(a, first);
    const releaseSecond = svc.observe(a, second);
    const observer = FakeResizeObserver.instances[0];

    observer.fire(a);
    await nextFrame();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    releaseFirst();
    expect(observer.targets.has(a)).toBe(true);
    releaseSecond();
    expect(observer.targets.has(a)).toBe(false);
  });

  it('disconnects the shared observer once nothing is observed', () => {
    const svc = TestBed.inject(KjResizeObserver);
    const releases = [svc.observe(a, () => {}), svc.observe(b, () => {})];
    const observer = FakeResizeObserver.instances[0];

    releases[0]();
    expect(observer.disconnected).toBe(false);
    releases[1]();
    expect(observer.disconnected).toBe(true);
  });

  it('is a no-op where ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const svc = TestBed.inject(KjResizeObserver);
    const release = svc.observe(a, () => {});
    expect(FakeResizeObserver.instances).toHaveLength(0);
    expect(() => release()).not.toThrow();
  });
});
