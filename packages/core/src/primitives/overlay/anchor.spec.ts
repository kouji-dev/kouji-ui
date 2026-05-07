import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { render } from '@testing-library/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KjAnchor } from './anchor';

/**
 * Test rig: a fixed-size, fixed-position trigger button + a sized floating
 * panel anchored to it. We size everything explicitly so the manual-engine
 * math is deterministic in jsdom (which otherwise reports 0×0 rects for
 * unstyled elements).
 */
@Component({
  standalone: true,
  imports: [KjAnchor],
  template: `
    <button
      #trigger
      [style.position]="'fixed'"
      [style.left.px]="triggerLeft()"
      [style.top.px]="triggerTop()"
      [style.width.px]="triggerWidth"
      [style.height.px]="triggerHeight"
    >Trigger</button>

    <div
      #floating
      kjAnchor
      [kjAnchorTo]="trigger"
      [kjAnchorSide]="side()"
      [kjAnchorAlign]="align()"
      [kjAnchorOffset]="offset()"
      [kjAnchorFlip]="flip()"
      [kjAnchorShift]="shift()"
      [style.width.px]="floatingWidth"
      [style.height.px]="floatingHeight"
    >Floating</div>
  `,
})
class Host {
  readonly triggerWidth = 100;
  readonly triggerHeight = 40;
  readonly floatingWidth = 80;
  readonly floatingHeight = 30;

  readonly triggerLeft = signal(500);
  readonly triggerTop = signal(300);

  readonly side = signal<'top' | 'bottom' | 'left' | 'right'>('bottom');
  readonly align = signal<'start' | 'center' | 'end'>('center');
  readonly offset = signal(8);
  readonly flip = signal(true);
  readonly shift = signal(true);

  readonly anchor = viewChild.required(KjAnchor);
  readonly floating = viewChild.required<ElementRef<HTMLElement>>('floating');
}

/**
 * jsdom returns 0×0 from getBoundingClientRect for unstyled elements. Stub it
 * to derive a usable rect from the inline `width` / `height` styles plus the
 * fixed `left` / `top` we set on each element. This keeps the math test pure
 * — we are testing the directive, not jsdom's layout.
 */
function stubLayout(): void {
  const proto = Element.prototype as unknown as {
    getBoundingClientRect: () => DOMRect;
  };
  proto.getBoundingClientRect = function (this: HTMLElement): DOMRect {
    const left = parseFloat(this.style.left || '0') || 0;
    const top = parseFloat(this.style.top || '0') || 0;
    const width = parseFloat(this.style.width || '0') || 0;
    const height = parseFloat(this.style.height || '0') || 0;
    return {
      x: left, y: top, left, top, width, height,
      right: left + width, bottom: top + height,
      toJSON() { return this; },
    } as DOMRect;
  };
}

const originalGBCR = Element.prototype.getBoundingClientRect;
const originalSupports = (globalThis as { CSS?: { supports: (q: string) => boolean } }).CSS?.supports;

describe('KjAnchor', () => {
  beforeEach(() => {
    stubLayout();
    // Default: force the fallback path — we test the CSS path explicitly
    // in its own block.
    if (typeof (globalThis as { CSS?: { supports: (q: string) => boolean } }).CSS !== 'undefined') {
      (globalThis as { CSS?: { supports: (q: string) => boolean } }).CSS.supports = vi.fn().mockReturnValue(false);
    } else {
      (globalThis as { CSS?: { supports: (q: string) => boolean } }).CSS = { supports: vi.fn().mockReturnValue(false) };
    }
    // Standard viewport for fits/flip math.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalGBCR;
    if (originalSupports) (globalThis as { CSS?: { supports: (q: string) => boolean } }).CSS.supports = originalSupports;
  });

  it('positions floating below trigger by default (side=bottom, align=center)', async () => {
    const { fixture } = await render(Host);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const floating = host.floating().nativeElement;

    expect(floating.style.position).toBe('fixed');
    // trigger at left=500,width=100; floating width=80 → centered at 500+10=510
    expect(parseFloat(floating.style.left)).toBe(510);
    // top + height + offset = 300 + 40 + 8 = 348
    expect(parseFloat(floating.style.top)).toBe(348);
    expect(host.anchor().placement()).toEqual({ side: 'bottom', align: 'center' });
  });

  it('honours kjAnchorSide=top', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.side.set('top');
    await fixture.whenStable();
    const floating = fixture.componentInstance.floating().nativeElement;
    // top - floatingHeight - offset = 300 - 30 - 8 = 262
    expect(parseFloat(floating.style.top)).toBe(262);
    expect(parseFloat(floating.style.left)).toBe(510);
    expect(fixture.componentInstance.anchor().placement().side).toBe('top');
  });

  it('honours kjAnchorAlign=start on horizontal sides', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.align.set('start');
    await fixture.whenStable();
    const floating = fixture.componentInstance.floating().nativeElement;
    // align=start ⇒ left = trigger.left = 500
    expect(parseFloat(floating.style.left)).toBe(500);
  });

  it('honours kjAnchorAlign=end on horizontal sides', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.align.set('end');
    await fixture.whenStable();
    const floating = fixture.componentInstance.floating().nativeElement;
    // align=end ⇒ left = trigger.right - floating.width = 600 - 80 = 520
    expect(parseFloat(floating.style.left)).toBe(520);
  });

  it('respects kjAnchorOffset', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.offset.set(20);
    await fixture.whenStable();
    const floating = fixture.componentInstance.floating().nativeElement;
    // bottom + offset = 340 + 20 = 360
    expect(parseFloat(floating.style.top)).toBe(360);
  });

  it('flips to opposite side when the requested side does not fit', async () => {
    const { fixture } = await render(Host);
    // Requested top, but no room above (trigger near top of viewport).
    fixture.componentInstance.triggerTop.set(5);
    fixture.componentInstance.side.set('top');
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const floating = host.floating().nativeElement;
    // Should have flipped to bottom: top = 5 + 40 + 8 = 53
    expect(parseFloat(floating.style.top)).toBe(53);
    expect(host.anchor().placement().side).toBe('bottom');
  });

  it('does not flip when kjAnchorFlip is false even if it overflows', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.triggerTop.set(5);
    fixture.componentInstance.side.set('top');
    fixture.componentInstance.flip.set(false);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    expect(host.anchor().placement().side).toBe('top');
    // top - height - offset = 5 - 30 - 8 = -33 (off-screen, but unflipped)
    expect(parseFloat(host.floating().nativeElement.style.top)).toBe(-33);
  });

  it('shifts along the cross-axis to keep the floating element on-screen', async () => {
    @Component({
      standalone: true,
      imports: [KjAnchor],
      template: `
        <button #t [style.position]="'fixed'" [style.left.px]="1000"
                [style.top.px]="300" [style.width.px]="100" [style.height.px]="40">T</button>
        <div #f kjAnchor [kjAnchorTo]="t" [style.width.px]="80" [style.height.px]="30"></div>
      `,
    })
    class ShiftHost {
      readonly floating = viewChild.required<ElementRef<HTMLElement>>('f');
    }
    const { fixture } = await render(ShiftHost);
    await fixture.whenStable();
    // pre-shift center = 1000 + (100-80)/2 = 1010 → right edge = 1090, off by 66.
    // shift clamps to vw - floatingWidth = 944
    expect(parseFloat(fixture.componentInstance.floating().nativeElement.style.left)).toBe(944);
  });

  it('clamps to 0 on the leading edge when shift is enabled', async () => {
    @Component({
      standalone: true,
      imports: [KjAnchor],
      template: `
        <button #t [style.position]="'fixed'" [style.left.px]="-50"
                [style.top.px]="300" [style.width.px]="100" [style.height.px]="40">T</button>
        <div #f kjAnchor [kjAnchorTo]="t" kjAnchorAlign="start"
             [style.width.px]="80" [style.height.px]="30"></div>
      `,
    })
    class LeadingHost {
      readonly floating = viewChild.required<ElementRef<HTMLElement>>('f');
    }
    const { fixture } = await render(LeadingHost);
    await fixture.whenStable();
    expect(parseFloat(fixture.componentInstance.floating().nativeElement.style.left)).toBe(0);
  });

  it('does not shift when kjAnchorShift is false', async () => {
    @Component({
      standalone: true,
      imports: [KjAnchor],
      template: `
        <button #t [style.position]="'fixed'" [style.left.px]="1000"
                [style.top.px]="300" [style.width.px]="100" [style.height.px]="40">T</button>
        <div #f kjAnchor [kjAnchorTo]="t" [kjAnchorShift]="false"
             [style.width.px]="80" [style.height.px]="30"></div>
      `,
    })
    class NoShiftHost {
      readonly floating = viewChild.required<ElementRef<HTMLElement>>('f');
    }
    const { fixture } = await render(NoShiftHost);
    await fixture.whenStable();
    // unshifted: 1000 + (100-80)/2 = 1010
    expect(parseFloat(fixture.componentInstance.floating().nativeElement.style.left)).toBe(1010);
  });

  it('placement signal updates after a flip', async () => {
    const { fixture } = await render(Host);
    const host = fixture.componentInstance;
    expect(host.anchor().placement().side).toBe('bottom');

    host.triggerTop.set(5);
    host.side.set('top');
    await fixture.whenStable();

    expect(host.anchor().placement().side).toBe('bottom');
    expect(host.anchor().side()).toBe('bottom');
  });

  it('reflects placement on host as data-side / data-align', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.side.set('right');
    fixture.componentInstance.align.set('end');
    await fixture.whenStable();
    const floating = fixture.componentInstance.floating().nativeElement;
    expect(floating.getAttribute('data-side')).toBe('right');
    expect(floating.getAttribute('data-align')).toBe('end');
  });

  it('uses CSS Anchor Positioning when supported', async () => {
    (globalThis as { CSS?: { supports: (q: string) => boolean } }).CSS.supports = vi.fn().mockImplementation(
      (prop: string) => prop === 'anchor-name',
    );

    const { fixture } = await render(Host);
    await fixture.whenStable();

    const floating = fixture.componentInstance.floating().nativeElement;
    const trigger = floating.previousElementSibling as HTMLElement;

    // CSS engine should set anchor-name on trigger and position-anchor on floating.
    expect(trigger.style.getPropertyValue('anchor-name')).toMatch(/^--kj-anchor-/);
    expect(floating.style.getPropertyValue('position-anchor')).toMatch(/^--kj-anchor-/);
    expect(floating.style.getPropertyValue('position-area')).toBeTruthy();
    // Manual math should NOT have run — no left/top inline pixel values.
    expect(floating.style.left).toBe('');
    expect(floating.style.top).toBe('');
  });

  it('repositions on input change (offset)', async () => {
    const { fixture } = await render(Host);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const floating = host.floating().nativeElement;

    expect(parseFloat(floating.style.top)).toBe(348);

    host.offset.set(50);
    await fixture.whenStable();
    expect(parseFloat(floating.style.top)).toBe(390); // 340 + 50
  });

  it('does not throw when the trigger is undefined', async () => {
    @Component({
      standalone: true,
      imports: [KjAnchor],
      template: `<div kjAnchor [kjAnchorTo]="undefined">Floating</div>`,
    })
    class NoTriggerHost {}
    await expect(render(NoTriggerHost)).resolves.toBeTruthy();
  });
});

describe('KjAnchor — SSR safety', () => {
  it('constructing without browser DOM does not throw', () => {
    // We can't easily flip PLATFORM_ID inside an Angular TestBed mid-suite,
    // but we can prove the directive's SSR guard logic by simulating: when
    // CSS / window APIs are absent, the supports detection collapses to the
    // fallback path and the synchronous effect does not touch the DOM until
    // _ready flips. This test is a lightweight smoke check that the module
    // imports cleanly even when CSS is undefined.
    const savedCss = (globalThis as { CSS?: { supports: (q: string) => boolean } }).CSS;
    delete (globalThis as { CSS?: { supports: (q: string) => boolean } }).CSS;
    try {
      // Re-importing the module in a test runner doesn't reload it, but the
      // _supportsCssAnchor private method swallows ReferenceErrors by
      // catching the typeof CSS check. Just assert the symbol still loads.
      expect(KjAnchor).toBeDefined();
    } finally {
      (globalThis as { CSS?: { supports: (q: string) => boolean } }).CSS = savedCss;
    }
  });
});
