import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { KJ_TOOLTIP_DEFAULTS, type KjTooltipDefaults } from '@kouji-ui/core';
import {
  KjTooltipComponent,
  KjTooltipContentComponent,
  KjTooltipArrowComponent,
  KjTooltipGroupComponent,
} from './tooltip';

const TIGHT_DEFAULTS: KjTooltipDefaults = {
  openDelayMs: 100,
  closeDelayMs: 50,
  skipDelayMs: 200,
};

function findOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kj-overlay]'));
}

function findContent(): HTMLElement | undefined {
  return Array.from(
    document.querySelectorAll<HTMLElement>('.kj-tooltip-content'),
  ).find(el => !el.hasAttribute('hidden'));
}

function cleanup(): void {
  for (const o of findOverlays()) o.remove();
  for (const c of document.querySelectorAll<HTMLElement>('.kj-tooltip-content')) {
    c.remove();
  }
}

function advance(fixture: ReturnType<typeof TestBed.createComponent>, ms: number, step = 1): void {
  let remaining = ms;
  while (remaining > 0) {
    const dt = Math.min(step, remaining);
    vi.advanceTimersByTime(dt);
    fixture.detectChanges();
    remaining -= dt;
  }
}

describe('KjTooltipComponent (wrapper)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_TOOLTIP_DEFAULTS, useValue: TIGHT_DEFAULTS }],
    });
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'],
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('renders projected trigger content (display: contents on host)', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipComponent, KjTooltipContentComponent],
      template: `
        <kj-tooltip [kjTooltipTriggerFor]="tip">
          <button>Save</button>
        </kj-tooltip>
        <ng-template #tip>
          <kj-tooltip-content>Save the file</kj-tooltip-content>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn.textContent.trim()).toBe('Save');
  });

  test('forwards inputs to the underlying KjTooltipTrigger via aliasing', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipComponent, KjTooltipContentComponent],
      template: `
        <kj-tooltip
          [kjTooltipTriggerFor]="tip"
          [kjTooltipDisabled]="true"
        >
          <button>Save</button>
        </kj-tooltip>
        <ng-template #tip>
          <kj-tooltip-content>Save</kj-tooltip-content>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    // Disabled tooltips reflect data-disabled and do not wire aria-describedby.
    const host = fixture.nativeElement.querySelector('kj-tooltip')!;
    expect(host.getAttribute('data-disabled')).toBe('');
    expect(host.hasAttribute('aria-describedby')).toBe(false);
  });

  test('wires aria-describedby on the trigger host (kjTooltip wrapper)', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipComponent, KjTooltipContentComponent],
      template: `
        <kj-tooltip [kjTooltipTriggerFor]="tip">
          <button>Save</button>
        </kj-tooltip>
        <ng-template #tip>
          <kj-tooltip-content>Save</kj-tooltip-content>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('kj-tooltip')!;
    const describedBy = host.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy).toMatch(/^kj-tooltip-\d+$/);
  });

  test('default kjTooltipSide reaches kj-tooltip-content (data-side="top")', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipComponent, KjTooltipContentComponent],
      template: `
        <kj-tooltip
          [kjTooltipTriggerFor]="tip"
          [kjAvoidCollisions]="false"
          [kjOpen]="true"
        >
          <button>Save</button>
        </kj-tooltip>
        <ng-template #tip>
          <kj-tooltip-content [kjAvoidCollisions]="false">Save</kj-tooltip-content>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    advance(fixture, 5);

    const content = findContent();
    expect(content).toBeDefined();
    expect(content!.getAttribute('role')).toBe('tooltip');
    // Default side is 'top' — collision avoidance disabled so the requested side wins.
    expect(content!.getAttribute('data-side')).toBe('top');
    expect(content!.getAttribute('data-align')).toBe('center');
  });

  test('overrides kjTooltipSide to "bottom" reaches the content', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipComponent, KjTooltipContentComponent],
      template: `
        <kj-tooltip
          [kjTooltipTriggerFor]="tip"
          [kjTooltipSide]="'bottom'"
          [kjOpen]="true"
        >
          <button>Save</button>
        </kj-tooltip>
        <ng-template #tip>
          <kj-tooltip-content [kjTooltipSide]="'bottom'">Save</kj-tooltip-content>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    advance(fixture, 5);

    const content = findContent();
    expect(content).toBeDefined();
    expect(content!.getAttribute('data-side')).toBe('bottom');
  });

  test('basic open/close cycle via kjOpen model', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipComponent, KjTooltipContentComponent],
      template: `
        <kj-tooltip [kjTooltipTriggerFor]="tip" [kjOpen]="open()">
          <button>Save</button>
        </kj-tooltip>
        <ng-template #tip>
          <kj-tooltip-content>Save the file</kj-tooltip-content>
        </ng-template>
      `,
    })
    class Host {
      readonly open = signal(false);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(findContent()).toBeUndefined();

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    advance(fixture, 5);

    const content = findContent();
    expect(content).toBeDefined();
    expect(content!.textContent).toContain('Save the file');

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    advance(fixture, 5);

    expect(findContent()).toBeUndefined();
  });

  test('renders a kj-tooltip-arrow inside content with aria-hidden', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipComponent, KjTooltipContentComponent, KjTooltipArrowComponent],
      template: `
        <kj-tooltip [kjTooltipTriggerFor]="tip" [kjOpen]="true">
          <button>Save</button>
        </kj-tooltip>
        <ng-template #tip>
          <kj-tooltip-content>
            Save
            <kj-tooltip-arrow></kj-tooltip-arrow>
          </kj-tooltip-content>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    advance(fixture, 5);

    const arrow = document.querySelector<HTMLElement>('.kj-tooltip-arrow');
    expect(arrow).not.toBeNull();
    expect(arrow!.getAttribute('aria-hidden')).toBe('true');
  });

  test('kj-tooltip-group provides skip-delay coordination context', () => {
    @Component({
      standalone: true,
      imports: [KjTooltipComponent, KjTooltipContentComponent, KjTooltipGroupComponent],
      template: `
        <kj-tooltip-group>
          <kj-tooltip [kjTooltipTriggerFor]="tip">
            <button>A</button>
          </kj-tooltip>
        </kj-tooltip-group>
        <ng-template #tip>
          <kj-tooltip-content>A</kj-tooltip-content>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    // Group host renders with the kj-tooltip-group class — children project through.
    const group = fixture.nativeElement.querySelector('kj-tooltip-group');
    expect(group).not.toBeNull();
    expect(group.classList.contains('kj-tooltip-group')).toBe(true);
    // Trigger renders inside the group.
    const trigger = group.querySelector('kj-tooltip button');
    expect(trigger).not.toBeNull();
  });
});
