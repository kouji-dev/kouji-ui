import { ApplicationRef, Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { KjTooltipTrigger } from './tooltip-trigger';
import { KjTooltipContent } from './tooltip-content';

@Component({
  selector: 'kj-tt-host',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button id="before">Before</button>
    <button kjTooltipTrigger #t="kjTooltipTrigger" [kjDisabled]="disabled()">Hover</button>
    <kj-tooltip-content [kjFor]="t">Hi</kj-tooltip-content>
    <button id="after">After</button>
  `,
})
class Host {
  readonly disabled = signal(false);
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

/** Lets the open / close transition finish and flushes root effects. */
async function flush(): Promise<void> {
  await settle();
  TestBed.inject(ApplicationRef).tick();
  await settle();
}

/**
 * Reaches `el` the way a keyboard user does: Tab is pressed, then focus lands
 * on `el`. jsdom's `:focus-visible` heuristic keys on that last keyboard event,
 * exactly like a browser's. The keydown is dispatched from `<html>` rather than
 * from the currently focused element because jsdom treats a keydown whose
 * target is also the focus event's `relatedTarget` as uninformative and falls
 * back to its own "last focus-visible element" memo — which this pool shares
 * across spec files (`isolate: false`), so an earlier file decides the outcome.
 * From `<html>` the target is neither the old nor the new focus owner, so the
 * Tab branch is taken unambiguously.
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
  const btn = fixture.nativeElement.querySelector('button[kjTooltipTrigger]') as HTMLButtonElement;
  // Held by reference, taken from THIS fixture while the panel is still
  // inline (it portals to the overlay container only once it opens). It used
  // to be resolved with a document-wide `getElementById` on the trigger's
  // `aria-describedby`, which is not unique across spec files: this pool runs
  // `isolate: false`, `KjId`'s per-prefix counters restart with every
  // `TestBed.resetTestingModule()`, and a panel another file left in the
  // document therefore answers to the same id — so the assertions ran against
  // a stranger's `role="dialog"` panel whenever the worker happened to load
  // that file first.
  const panel = fixture.nativeElement.querySelector('kj-tooltip-content') as HTMLElement;
  // Same root cause, second half: `toHaveAccessibleDescription` resolves
  // `aria-describedby` through the WHOLE document, and the first element in
  // document order wins. Clearing the overlay container is not enough — a
  // spec file that leaks a fixture root into `<body>` leaks the elements
  // inside it too, and `KjId`'s counters restart per TestBed, so one of them
  // can carry this panel's id. Any earlier holder of the id would supply the
  // description instead of ours, so they are removed here.
  for (const other of Array.from(document.querySelectorAll(`[id="${panel.id}"]`))) {
    if (other !== panel) other.remove();
  }
  return { fixture, btn, panel, host: fixture.componentInstance as Host };
}

describe('KjTooltip', () => {
  // Before as well as after: this pool runs `isolate: false`, so a panel an
  // earlier spec file left portalled in the shared container is still in the
  // document — and `KjId`'s counters restart with every TestBed, so it can
  // answer to the same id as this file's panel. `toHaveAccessibleDescription`
  // resolves `aria-describedby` through the whole document, so a stale panel
  // would supply the description instead of ours.
  const clearLeakedOverlays = (): void => {
    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
  };

  beforeEach(clearLeakedOverlays);

  afterEach(() => {
    clearLeakedOverlays();
    (document.activeElement as HTMLElement | null)?.blur?.();
  });

  it('trigger carries neither aria-expanded nor aria-controls (APG tooltip pattern)', async () => {
    const { btn } = await setup();
    expect(btn.hasAttribute('aria-expanded')).toBe(false);
    expect(btn.hasAttribute('aria-controls')).toBe(false);
    expect(btn.getAttribute('data-state')).toBe('closed');
  });

  it('panel is hidden + has role=tooltip', async () => {
    const { panel } = await setup();
    expect(panel.getAttribute('role')).toBe('tooltip');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('describes the trigger with the tooltip while closed, so focus announces it', async () => {
    const { btn, panel } = await setup();
    expect(btn.getAttribute('aria-describedby')).toBe(panel.id);
    expect(panel.id).toBeTruthy();
    expect(btn).toHaveAccessibleDescription('Hi');
  });

  it('keyboard focus opens the tooltip without delay; Escape closes it and keeps focus on the trigger', async () => {
    const { btn, panel } = await setup();
    tabTo(btn);
    expect(document.activeElement).toBe(btn);
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(false);
    expect(btn.getAttribute('data-state')).toBe('open');
    expect(btn.hasAttribute('aria-expanded')).toBe(false);
    expect(btn).toHaveAccessibleDescription('Hi');

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(true);
    expect(btn.getAttribute('data-state')).toBe('closed');
    expect(document.activeElement).toBe(btn);
  });

  it('moving focus away closes the tooltip', async () => {
    const { fixture, btn, panel } = await setup();
    tabTo(btn);
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(false);
    tabTo(fixture.nativeElement.querySelector('#after') as HTMLElement);
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('hover still opens after the intent delay', async () => {
    const { btn, panel } = await setup();
    btn.dispatchEvent(new Event('pointerenter'));
    await new Promise((r) => setTimeout(r, 250));
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(false);
    btn.dispatchEvent(new Event('pointerleave'));
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('kjDisabled keeps the tooltip closed and closes an open one', async () => {
    const { fixture, btn, panel, host } = await setup();
    host.disabled.set(true);
    fixture.detectChanges();
    tabTo(btn);
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(true);
    btn.dispatchEvent(new Event('pointerenter'));
    await new Promise((r) => setTimeout(r, 250));
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(true);

    host.disabled.set(false);
    fixture.detectChanges();
    btn.blur();
    tabTo(btn);
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(false);

    host.disabled.set(true);
    fixture.detectChanges();
    await flush();
    expect(panel.hasAttribute('hidden')).toBe(true);
  });
});
