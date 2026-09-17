import { ApplicationRef, ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  KjPopoverClose,
  KjPopover,
  KjPopoverContent,
  KjPopoverTitle,
  KjPopoverTrigger,
} from './popover';

/**
 * The wrapper composition a consumer actually types: `<kj-popover>` around a
 * `[kjPopoverTrigger]` and a `<kj-popover-content [kjFor]>` panel, with the
 * styled surface from `popover.css`. The core specs cover the overlay
 * mechanism; this file covers that the styled suite is wired to it — the panel
 * is portalled and painted, the trigger advertises the disclosure, Escape and
 * `[kjPopoverClose]` both close it, and focus comes home afterwards.
 */

const FAKE_TIMERS = [
  'setTimeout',
  'clearTimeout',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'queueMicrotask',
  'Date',
] as const;

/** The shipped stylesheet, read from disk — jsdom loads no CSS. */
function readCss(): string {
  return readFileSync(resolve(import.meta.dirname, './popover.css'), 'utf-8');
}

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
  imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-popover>
      <button kjPopoverTrigger #t="kjPopoverTrigger" data-test="trigger">Open popover</button>
      <kj-popover-content [kjFor]="t" data-test="panel">
        <h3 kjPopoverTitle>Notification settings</h3>
        <p>Control how and when you receive notifications.</p>
        <button kjPopoverClose data-test="close">Close</button>
      </kj-popover-content>
    </kj-popover>
  `,
})
class Host {}

describe('KjPopover (wrapper suite)', () => {
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
    const trigger = root.querySelector<HTMLButtonElement>('[data-test="trigger"]');
    if (!trigger) throw new Error('trigger not rendered');
    return { fixture, appRef, root, trigger };
  }

  function openPanel(): HTMLElement | null {
    return (
      container()?.querySelector<HTMLElement>('kj-popover-content[data-state="open"]') ?? null
    );
  }

  it('the wrapper is a pass-through shell that adds no box of its own', () => {
    const { root } = mount();
    const shell = root.querySelector<HTMLElement>('kj-popover');

    expect(shell).not.toBeNull();
    expect(shell!.getAttribute('style')).toContain('display: contents');
    expect(shell!.getAttribute('role')).toBeNull();
  });

  it('the trigger advertises a collapsed dialog disclosure before anything opens', () => {
    const { trigger } = mount();

    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(openPanel()).toBeNull();
  });

  it('clicking the trigger portals the styled panel into the overlay container', () => {
    const { appRef, trigger } = mount();

    trigger.click();
    settle(appRef);

    const panel = openPanel();
    expect(panel).not.toBeNull();
    expect(panel!.classList.contains('kj-popover-content')).toBe(true);
    expect(panel!.getAttribute('role')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel!.id);
  });

  it('[kjPopoverTitle] names the role="dialog" panel via aria-labelledby', () => {
    const { appRef, trigger } = mount();

    trigger.click();
    settle(appRef);

    const panel = openPanel()!;
    const title = panel.querySelector<HTMLElement>('.kj-popover-title');
    expect(title?.textContent?.trim()).toBe('Notification settings');
    expect(title!.id).toBeTruthy();

    // The popover family now registers with KJ_OVERLAY_TITLE_HOST like
    // dialog/drawer/sheet, so the panel is announced by its heading instead
    // of as an unnamed dialog (WCAG 4.1.2).
    expect(panel.getAttribute('aria-labelledby')).toBe(title!.id);
    expect(panel.getAttribute('aria-label')).toBeNull();
  });

  it('Escape closes the panel and returns focus to the trigger', () => {
    const { appRef, trigger } = mount();

    trigger.focus();
    trigger.click();
    settle(appRef);
    expect(openPanel()).not.toBeNull();

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    settle(appRef);

    expect(openPanel()).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('[kjPopoverClose] inside the panel closes it', () => {
    const { appRef, trigger } = mount();

    trigger.click();
    settle(appRef);
    const close = openPanel()!.querySelector<HTMLButtonElement>('[data-test="close"]')!;

    close.click();
    settle(appRef);

    expect(openPanel()).toBeNull();
  });

  it('clicking the trigger again closes the open panel', () => {
    const { appRef, trigger } = mount();

    trigger.click();
    settle(appRef);
    expect(openPanel()).not.toBeNull();

    trigger.click();
    settle(appRef);
    expect(openPanel()).toBeNull();
  });

  it('the panel carries data-side / data-align, so the arrow rules can match (overlay F-5)', () => {
    const { appRef, trigger } = mount();

    trigger.click();
    settle(appRef);

    const panel = openPanel()!;
    // `kjSide` defaults to `bottom`, `kjAlign` to `center`; jsdom gives every
    // element a 0x0 rect, so nothing flips and the request survives intact.
    expect(panel.getAttribute('data-side')).toBe('bottom');
    expect(panel.getAttribute('data-align')).toBe('center');
    // What the attribute is for: popover.css only positions the arrow through
    // a `[data-side="…"]` selector, so before this it never matched at all.
    expect(readCss()).toContain('.kj-popover-content[data-side="bottom"] .kj-popover-arrow');

    trigger.click();
    settle(appRef);
    const closed = container()?.querySelector<HTMLElement>('kj-popover-content')
      ?? (document.querySelector('kj-popover-content') as HTMLElement);
    expect(closed.hasAttribute('data-side'), 'cleared with the placement on close').toBe(false);
  });
});
