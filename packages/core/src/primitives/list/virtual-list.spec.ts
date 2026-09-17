// packages/core/src/primitives/list/virtual-list.spec.ts
import { ApplicationRef, Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { KjListVirtual } from './virtual-list';

@Component({
  standalone: true,
  imports: [KjListVirtual],
  template: `
    <div
      kjListVirtual
      [kjVirtualCount]="count()"
      [kjVirtualItemSize]="32"
      [kjVirtualOverscan]="2"
      [kjVirtualInitialRows]="10"
      [kjVirtualEnabled]="enabled()"
    ></div>
  `,
})
class Host {
  readonly count = signal(5000);
  readonly enabled = signal(true);
  readonly v = viewChild.required(KjListVirtual);
}

describe('KjListVirtual (perf F-4)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const settle = (): void => {
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
  };
  const win = () => fixture.componentInstance.v().window();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    settle();
  });

  it('sizes the scroll content for the whole dataset, not the window', () => {
    expect(win().totalSize).toBe(5000 * 32);
  });

  it('renders a bounded window rather than every row', () => {
    const w = win();
    expect(w.windowed).toBe(true);
    expect(w.start).toBe(0);
    expect(w.end).toBeLessThan(100);
    expect(w.paddingTop).toBe(0);
    expect(w.paddingBottom).toBe(5000 * 32 - w.end * 32);
  });

  it('scrollToIndex moves the window onto the requested row and reads back in the same turn', () => {
    fixture.componentInstance.v().scrollToIndex(3000);
    const w = win();
    expect(w.start).toBeLessThanOrEqual(3000);
    expect(w.end).toBeGreaterThan(3000);
    // The spacers still add up to the whole dataset.
    expect(w.paddingTop + (w.end - w.start) * 32 + w.paddingBottom).toBe(5000 * 32);
  });

  it('scrollToIndex is a no-op for a row already inside the window', () => {
    const before = win();
    fixture.componentInstance.v().scrollToIndex(1);
    expect(win()).toEqual(before);
  });

  it('scrollToStart brings the window back to the top', () => {
    fixture.componentInstance.v().scrollToIndex(4999);
    expect(win().start).toBeGreaterThan(0);
    fixture.componentInstance.v().scrollToStart();
    expect(win().start).toBe(0);
  });

  it('clamps to the dataset at both ends', () => {
    fixture.componentInstance.v().scrollToIndex(-50);
    expect(win().start).toBe(0);
    fixture.componentInstance.v().scrollToIndex(99999);
    expect(win().end).toBe(5000);
  });

  it('spans the whole list when windowing is disabled', () => {
    fixture.componentInstance.enabled.set(false);
    settle();
    const w = win();
    expect(w.windowed).toBe(false);
    expect(w.start).toBe(0);
    expect(w.end).toBe(5000);
    expect(w.paddingTop).toBe(0);
    expect(w.paddingBottom).toBe(0);
  });

  it('reports an empty, unwindowed range for an empty dataset', () => {
    fixture.componentInstance.count.set(0);
    settle();
    expect(win()).toEqual({
      start: 0,
      end: 0,
      paddingTop: 0,
      paddingBottom: 0,
      totalSize: 0,
      windowed: false,
    });
  });

  it('prerenders a seeded window on the server, sized for the whole dataset', () => {
    // `ngServerMode` is the flag Angular 22's `afterNextRender` checks, so
    // setting it reproduces the server pass: nothing mounts, nothing is
    // measured, and the window has to come from the estimate alone.
    const g = globalThis as { ngServerMode?: boolean };
    const previous = g.ngServerMode;
    g.ngServerMode = true;
    try {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const server = TestBed.createComponent(Host);
      server.detectChanges();
      const v = server.componentInstance.v();
      expect(v.mounted()).toBe(false);
      expect(v.window()).toEqual({
        start: 0,
        end: 10,
        paddingTop: 0,
        paddingBottom: (5000 - 10) * 32,
        totalSize: 5000 * 32,
        windowed: true,
      });
      server.destroy();
    } finally {
      if (previous === undefined) delete g.ngServerMode;
      else g.ngServerMode = previous;
    }
  });
});
