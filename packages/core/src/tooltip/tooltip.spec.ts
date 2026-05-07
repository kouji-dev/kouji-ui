import {
  Component,
  TemplateRef,
  ViewChild,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KjTooltip } from './tooltip';
import { KjTooltipTrigger } from './tooltip-trigger';
import { KjTooltipContent } from './tooltip-content';
import { KjTooltipGroup } from './tooltip-group';
import { KjTooltipArrow } from './tooltip-arrow';
import {
  KJ_TOOLTIP_DEFAULTS,
  type KjTooltipDefaults,
} from './tooltip.context';

/** Tooltip panel created by the [kjTooltip] shorthand directive. */
function findShorthandPanels(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kj-tooltip]'));
}

/** Compound-shape overlay container created by KjOverlayService.createFromTemplate. */
function findOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kj-overlay]'));
}

function visibleShorthand(): HTMLElement | undefined {
  return findShorthandPanels().find(p => !p.hasAttribute('hidden'));
}

function cleanupPanels(): void {
  for (const p of findShorthandPanels()) p.remove();
  for (const o of findOverlays()) o.remove();
}

/**
 * Step real `vi` fake timers forward in `step` ms increments and run
 * Angular change-detection between each step so signal-driven host bindings
 * (e.g. the controller's `open` signal flowing into `[attr.hidden]`) flush.
 */
function advance(fixture: ReturnType<typeof TestBed.createComponent>, ms: number, step = 1): void {
  let remaining = ms;
  while (remaining > 0) {
    const dt = Math.min(step, remaining);
    vi.advanceTimersByTime(dt);
    fixture.detectChanges();
    remaining -= dt;
  }
}

const TIGHT_DEFAULTS: KjTooltipDefaults = {
  openDelayMs: 100,
  closeDelayMs: 50,
  skipDelayMs: 200,
};

describe('KjTooltip (shorthand)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_TOOLTIP_DEFAULTS, useValue: TIGHT_DEFAULTS }],
    });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'] });
  });

  afterEach(() => {
    cleanupPanels();
    vi.useRealTimers();
  });

  it('renders the trigger with aria-describedby pointing at the auto-generated tooltip id', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button [kjTooltip]="'Save the file'">Save</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button')!;
    const describedBy = btn.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy).toMatch(/^kj-tooltip-\d+$/);
  });

  it('opens after kjOpenDelayMs on hover and the panel has role="tooltip"', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button [kjTooltip]="'Save'">Save</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;

    btn.dispatchEvent(new Event('mouseenter'));
    expect(visibleShorthand()).toBeUndefined();

    advance(fixture, 99);
    expect(visibleShorthand()).toBeUndefined();
    advance(fixture, 5);

    const panel = visibleShorthand();
    expect(panel).toBeDefined();
    expect(panel!.getAttribute('role')).toBe('tooltip');
    expect(panel!.textContent).toBe('Save');
    expect(panel!.id).toMatch(/^kj-tooltip-\d+$/);

    btn.dispatchEvent(new Event('mouseleave'));
    advance(fixture, 100);
  });

  it('closes after kjCloseDelayMs on mouseleave', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button [kjTooltip]="'Save'">Save</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;

    btn.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 110);
    expect(visibleShorthand()).toBeDefined();

    btn.dispatchEvent(new Event('mouseleave'));
    advance(fixture, 49);
    expect(visibleShorthand()).toBeDefined();
    advance(fixture, 5);
    expect(visibleShorthand()).toBeUndefined();
  });

  it('persists when the pointer enters the tooltip content (WCAG 1.4.13 hoverable)', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button [kjTooltip]="'Save'">Save</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;

    btn.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 110);
    const panel = visibleShorthand()!;
    expect(panel).toBeDefined();

    btn.dispatchEvent(new Event('mouseleave'));
    advance(fixture, 20);
    panel.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 100);
    expect(visibleShorthand()).toBeDefined();

    panel.dispatchEvent(new Event('mouseleave'));
    advance(fixture, 60);
    expect(visibleShorthand()).toBeUndefined();
  });

  it('opens on focus and closes on blur', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button [kjTooltip]="'Save'">Save</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;

    btn.dispatchEvent(new Event('focus'));
    advance(fixture, 110);
    expect(visibleShorthand()).toBeDefined();

    btn.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(visibleShorthand()).toBeUndefined();
  });

  it('closes on Escape via the overlay-stack coordinator', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button [kjTooltip]="'Save'">Save</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;

    btn.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 110);
    expect(visibleShorthand()).toBeDefined();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(visibleShorthand()).toBeUndefined();
  });

  it('strips a native title attribute on the trigger to avoid double tooltips', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button title="native" [kjTooltip]="'kj'">Save</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button')!;
    expect(btn.hasAttribute('title')).toBe(false);
  });

  it('long-press opens on touch (gestures forced "on")', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button [kjTooltip]="'Save'" kjTouchGestures="on" [kjTouchHoldMs]="150">Save</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;

    btn.dispatchEvent(new Event('touchstart'));
    advance(fixture, 149);
    expect(visibleShorthand()).toBeUndefined();
    advance(fixture, 5);
    expect(visibleShorthand()).toBeDefined();
  });

  it('skip-delay coordinates two tooltips in the same group', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip, KjTooltipGroup],
      template: `
        <div kjTooltipGroup>
          <button #a [kjTooltip]="'A'">A</button>
          <button #b [kjTooltip]="'B'">B</button>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const a = buttons[0] as HTMLElement;
    const b = buttons[1] as HTMLElement;

    a.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 110);
    expect(visibleShorthand()).toBeDefined();
    expect(visibleShorthand()!.textContent).toBe('A');

    a.dispatchEvent(new Event('mouseleave'));
    advance(fixture, 60);
    expect(visibleShorthand()).toBeUndefined();

    // Within skipDelayMs (200ms) — second tooltip opens with no open-delay.
    b.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 5);
    const visible = visibleShorthand();
    expect(visible).toBeDefined();
    expect(visible!.textContent).toBe('B');
  });

  it('respects kjTooltipDisabled — no panel mounts and no aria-describedby is added', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button [kjTooltip]="'Save'" [kjTooltipDisabled]="true">Save</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;

    expect(btn.hasAttribute('aria-describedby')).toBe(false);

    btn.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 200);
    expect(visibleShorthand()).toBeUndefined();
  });

  it('sets data-side reflecting kjTooltipSide (default "top")', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      // Disable collision-flip so the requested side is honoured even when
      // jsdom reports 0×0 trigger rects (which would otherwise force a flip).
      template: `<button [kjTooltip]="'Hi'" [kjAvoidCollisions]="false">Hi</button>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;

    btn.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 110);
    // Allow the rAF reposition to schedule + run.
    advance(fixture, 32);

    const panel = visibleShorthand()!;
    expect(panel).toBeDefined();
    expect(panel.getAttribute('data-side')).toBe('top');
    expect(panel.getAttribute('data-align')).toBe('center');
  });

  it('kjOpen model opens the tooltip programmatically (skipping delays)', () => {
    @Component({
      standalone: true,
      imports: [KjTooltip],
      template: `<button [kjTooltip]="'Save'" [(kjOpen)]="open">Save</button>`,
    })
    class Host {
      open = signal(false);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(visibleShorthand()).toBeUndefined();

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    advance(fixture, 5);
    expect(visibleShorthand()).toBeDefined();

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    advance(fixture, 5);
    expect(visibleShorthand()).toBeUndefined();
  });
});

describe('KjTooltipTrigger / KjTooltipContent (compound)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_TOOLTIP_DEFAULTS, useValue: TIGHT_DEFAULTS }],
    });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'] });
  });

  afterEach(() => {
    cleanupPanels();
    vi.useRealTimers();
  });

  it('mounts the compound content via overlay portal and wires aria-describedby', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipTrigger, KjTooltipContent, KjTooltipArrow],
      template: `
        <button [kjTooltipTriggerFor]="tip">Save</button>
        <ng-template #tip>
          <div kjTooltipContent>
            Save the document
            <span kjTooltipArrow></span>
          </div>
        </ng-template>
      `,
    })
    class Host {
      @ViewChild('tip', { static: true }) tip!: TemplateRef<unknown>;
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;

    expect(btn.getAttribute('aria-describedby')).toMatch(/^kj-tooltip-\d+/);

    btn.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 110);

    const overlays = findOverlays();
    expect(overlays.length).toBe(1);
    const content = overlays[0].querySelector('[kjTooltipContent]') as HTMLElement;
    expect(content).not.toBeNull();
    expect(content.getAttribute('role')).toBe('tooltip');
    expect(content.getAttribute('id')).toBe(btn.getAttribute('aria-describedby'));
    const arrow = content.querySelector('[kjTooltipArrow]') as HTMLElement;
    expect(arrow).not.toBeNull();
    expect(arrow.getAttribute('aria-hidden')).toBe('true');

    btn.dispatchEvent(new Event('mouseleave'));
    advance(fixture, 60);
    expect(findOverlays().length).toBe(0);
  });

  it('default kjTooltipSide on the content directive is "top" (overrides KjAnchor default of "bottom")', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipTrigger, KjTooltipContent],
      // kjAvoidCollisions=false → the requested side is honoured even when
      // jsdom reports 0×0 trigger rects (which would otherwise force a flip).
      template: `
        <button [kjTooltipTriggerFor]="tip">Save</button>
        <ng-template #tip>
          <div kjTooltipContent [kjAvoidCollisions]="false">Save</div>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;
    btn.dispatchEvent(new Event('mouseenter'));
    advance(fixture, 110);
    advance(fixture, 32);

    const content = document.querySelector('[kjTooltipContent]') as HTMLElement;
    expect(content).not.toBeNull();
    expect(content.getAttribute('data-side')).toBe('top');
  });
});
