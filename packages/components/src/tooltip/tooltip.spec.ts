import { ApplicationRef, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { afterEach, describe, expect, it } from 'vitest';
import { KjTooltip, KjTooltipContent, KjTooltipTrigger } from './tooltip';

/**
 * The wrapper composition a consumer types: `<kj-tooltip>` around a
 * `[kjTooltipTrigger]` and a `<kj-tooltip-content [kjFor]>` panel, painted by
 * `tooltip.css`. The core specs own the overlay mechanism; this file proves the
 * styled suite is wired to it and keeps the APG tooltip contract — the trigger
 * is *described* by the panel, never a disclosure; keyboard focus and hover
 * both open it; Escape closes it without moving focus.
 */

@Component({
  standalone: true,
  imports: [KjTooltip, KjTooltipTrigger, KjTooltipContent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button id="before">Before</button>
    <kj-tooltip>
      <button kjTooltipTrigger #t="kjTooltipTrigger" [kjDisabled]="disabled()">Save</button>
      <kj-tooltip-content [kjFor]="t">Save the document</kj-tooltip-content>
    </kj-tooltip>
  `,
})
class Host {
  readonly disabled = signal(false);
}

const wait = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

/** Lets the open / close transition finish and flushes root effects. */
async function flush(): Promise<void> {
  await wait();
  TestBed.inject(ApplicationRef).tick();
  await wait();
}

/**
 * Reaches `el` the way a keyboard user does. jsdom decides `:focus-visible`
 * from the last keyboard event on the document, so a bare `.focus()` reads as
 * pointer focus. Dispatching from `<html>` keeps the target distinct from both
 * the old and the new focus owner, which is what makes the Tab branch
 * unambiguous in this shared (`isolate: false`) pool.
 */
function tabTo(el: HTMLElement): void {
  document.documentElement.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
  );
  el.focus();
}

async function setup() {
  const { fixture } = await render(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const trigger = root.querySelector<HTMLButtonElement>('button[kjTooltipTrigger]')!;
  // Portalled out of the fixture — reached through the describedby IDREF, which
  // also scopes the query to this fixture's own panel.
  const panel = document.getElementById(trigger.getAttribute('aria-describedby')!)!;
  return { fixture, root, trigger, panel, host: fixture.componentInstance };
}

describe('KjTooltip (wrapper suite)', () => {
  afterEach(() => {
    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    (document.activeElement as HTMLElement | null)?.blur?.();
  });

  it('the wrapper is a pass-through shell that adds no box of its own', async () => {
    const { root } = await setup();
    const shell = root.querySelector<HTMLElement>('kj-tooltip');

    expect(shell).not.toBeNull();
    expect(shell!.getAttribute('style')).toContain('display: contents');
    expect(shell!.getAttribute('role')).toBeNull();
  });

  it('renders the styled panel as a hidden role="tooltip" surface', async () => {
    const { panel } = await setup();

    expect(panel.classList.contains('kj-tooltip-content')).toBe(true);
    expect(panel.getAttribute('role')).toBe('tooltip');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('describes — never discloses — the trigger (APG tooltip pattern)', async () => {
    const { trigger, panel } = await setup();

    expect(trigger.getAttribute('aria-describedby')).toBe(panel.id);
    expect(trigger.hasAttribute('aria-expanded')).toBe(false);
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger).toHaveAccessibleDescription('Save the document');
  });

  it('keyboard focus opens the tooltip and Escape closes it with focus left on the trigger', async () => {
    const { trigger, panel } = await setup();

    tabTo(trigger);
    expect(document.activeElement).toBe(trigger);
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(false);
    expect(trigger.getAttribute('data-state')).toBe('open');

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await flush();

    expect(panel.hasAttribute('hidden')).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('hover opens after the intent delay and pointer-out closes it', async () => {
    const { trigger, panel } = await setup();

    trigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }));
    await new Promise((r) => setTimeout(r, 260));
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(false);

    trigger.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }));
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('kjDisabled blocks opening entirely', async () => {
    const { fixture, trigger, panel, host } = await setup();
    host.disabled.set(true);
    fixture.detectChanges();

    tabTo(trigger);
    await flush();

    expect(panel.hasAttribute('hidden')).toBe(true);
  });
});
