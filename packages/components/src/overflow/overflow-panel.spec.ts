import { ApplicationRef, ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KjPopoverTrigger } from '@kouji-ui/core';
import { KjOverflowPanel } from './overflow-panel';

/**
 * The panel a collapsing group opens from its "+N" chip. It owns the keyboard
 * story the hover trigger cannot: `focusFirst()` pulls focus in, Escape inside
 * the panel hands focus back to the chip, and focus leaving the panel closes
 * it. These specs drive it through a real `[kjPopoverTrigger]`, which is the
 * only shape `kjFor` accepts.
 */

const FAKE_TIMERS = [
  'setTimeout',
  'clearTimeout',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'queueMicrotask',
  'Date',
] as const;

function container(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.kj-overlay-container');
}

function settle(appRef: ApplicationRef): void {
  appRef.tick();
  for (let i = 0; i < 40; i++) {
    vi.advanceTimersByTime(1);
    appRef.tick();
  }
  appRef.tick();
}

@Component({
  standalone: true,
  imports: [KjPopoverTrigger, KjOverflowPanel],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button kjPopoverTrigger #t="kjPopoverTrigger" data-test="chip">+2</button>
    <kj-overflow-panel
      [kjFor]="t"
      [kjCount]="2"
      [kjStart]="3"
      [kjEnd]="5"
      [kjLabels]="['Dana Scully', 'Fox Mulder']"
    />
  `,
})
class Host {
  readonly panel = viewChild.required(KjOverflowPanel);
}

describe('KjOverflowPanel', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    vi.useFakeTimers({ toFake: [...FAKE_TIMERS] });
  });

  afterEach(() => {
    container()?.remove();
    vi.useRealTimers();
  });

  function mount() {
    const fixture = TestBed.createComponent(Host);
    const appRef = TestBed.inject(ApplicationRef);
    fixture.detectChanges();
    settle(appRef);
    const root = fixture.nativeElement as HTMLElement;
    const chip = root.querySelector<HTMLButtonElement>('[data-test="chip"]')!;
    return { fixture, appRef, root, chip };
  }

  function openPanel(): HTMLElement | null {
    return container()?.querySelector<HTMLElement>('kj-popover-content[data-state="open"]') ?? null;
  }

  function open() {
    const ctx = mount();
    ctx.chip.focus();
    ctx.chip.click();
    settle(ctx.appRef);
    const panel = openPanel();
    expect(panel, 'the overflow panel is portalled open').not.toBeNull();
    return { ...ctx, panel: panel! };
  }

  it('renders nothing until the chip is pressed', () => {
    const { root } = mount();

    expect(root.querySelector('kj-overflow-panel')?.getAttribute('style')).toContain(
      'display: contents',
    );
    expect(openPanel()).toBeNull();
  });

  it('lists every collapsed label when no consumer template is projected', () => {
    const { panel } = open();

    expect(panel.classList.contains('kj-overflow-panel')).toBe(true);
    const list = panel.querySelector<HTMLElement>('.kj-overflow-list');
    expect(list?.getAttribute('role')).toBe('list');
    const items = Array.from(panel.querySelectorAll('.kj-overflow-item')).map((li) =>
      li.textContent?.trim(),
    );
    expect(items).toEqual(['Dana Scully', 'Fox Mulder']);
  });

  it('focusFirst() moves focus into the panel even when it holds no control of its own', () => {
    const { fixture, panel } = open();

    fixture.componentInstance.panel().focusFirst();

    expect(panel.contains(document.activeElement)).toBe(true);
    // A label-only panel has nothing tabbable, so the panel itself takes focus
    // with a programmatic-only tab stop.
    expect(document.activeElement).toBe(panel);
    expect(panel.getAttribute('tabindex')).toBe('-1');
  });

  it('Escape inside the panel hands focus back to the chip', () => {
    const { fixture, appRef, chip, panel } = open();
    fixture.componentInstance.panel().focusFirst();

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    settle(appRef);

    expect(document.activeElement).toBe(chip);
  });

  it('focus leaving the panel for an unrelated element closes it', () => {
    const { appRef, root, panel } = open();
    const outside = document.createElement('button');
    root.appendChild(outside);

    panel.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    settle(appRef);

    expect(openPanel()).toBeNull();
  });

  it('focus moving back to the chip does not close the panel a second time', () => {
    const { appRef, chip, panel } = open();

    panel.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: chip }));
    settle(appRef);

    expect(openPanel()).not.toBeNull();
  });
});
