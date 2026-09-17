import { ApplicationRef, Component, signal, viewChildren } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KjOverlayStack } from '@kouji-ui/core';
import { KjCommandItemComponent, KjCommandPaletteComponent } from './command-palette';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

function modK(): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac, bubbles: true, cancelable: true });
}

function container(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.kj-overlay-container');
}

/**
 * Lets the overlay's open transition settle. The controller places initial
 * focus in `runTransition`'s completion callback, so a bare microtask is too
 * early: without a stylesheet the transition resolves on the next frame.
 */
async function settleOpen(): Promise<void> {
  for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => setTimeout(r, 30));
}

@Component({
  standalone: true,
  imports: [KjCommandPaletteComponent, KjCommandItemComponent],
  template: `
    <div data-theme="draft" dir="rtl">
      <kj-command-palette [(kjOpen)]="first" kjHotkey="mod+k">
        <kj-command-item kjValue="a">A</kj-command-item>
      </kj-command-palette>
    </div>
    <kj-command-palette [(kjOpen)]="second" kjHotkey="mod+k">
      <kj-command-item kjValue="b">B</kj-command-item>
    </kj-command-palette>
  `,
})
class TwoPalettes {
  readonly first = signal(false);
  readonly second = signal(false);
  readonly palettes = viewChildren(KjCommandPaletteComponent);
}

describe('<kj-command-palette> — instance scoping (mfe F-8, F-9)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    container()?.remove();
  });

  it('one mod+k opens exactly one of two palettes sharing the chord (first listener wins)', async () => {
    const fixture = TestBed.createComponent(TwoPalettes);
    const appRef = TestBed.inject(ApplicationRef);
    fixture.detectChanges();
    appRef.tick();

    document.dispatchEvent(modK());
    fixture.detectChanges();
    appRef.tick();

    const open = [fixture.componentInstance.first(), fixture.componentInstance.second()];
    expect(open.filter(Boolean)).toHaveLength(1);
    expect(open[0], 'the palette that registered first').toBe(true);
    fixture.destroy();
  });

  it('opening the second palette focuses its own search input, not the first one in the document', async () => {
    const fixture = TestBed.createComponent(TwoPalettes);
    const appRef = TestBed.inject(ApplicationRef);
    fixture.detectChanges();
    appRef.tick();

    fixture.componentInstance.second.set(true);
    fixture.detectChanges();
    appRef.tick();
    await settleOpen();
    appRef.tick();

    const inputs = [...container()!.querySelectorAll<HTMLInputElement>('.kj-command-palette__input')];
    expect(inputs, 'only the open palette is portalled').toHaveLength(1);
    // `tabCycle({ initialFocus: 'first' })` picks the first tabbable element
    // inside THIS panel, so a second palette in the document is irrelevant.
    expect(document.activeElement).toBe(inputs[0]);
    expect(inputs[0].closest('.kj-command-palette__dialog')!.querySelector('kj-command-item')!.textContent).toContain('B');
    fixture.destroy();
  });

  it('the portalled shell inherits the host\'s theme and direction scope', () => {
    const fixture = TestBed.createComponent(TwoPalettes);
    const appRef = TestBed.inject(ApplicationRef);
    fixture.detectChanges();
    appRef.tick();

    fixture.componentInstance.first.set(true);
    fixture.detectChanges();
    appRef.tick();

    const wrapper = container()!.querySelector<HTMLElement>('.kj-overlay-wrapper')!;
    expect(wrapper.getAttribute('data-theme')).toBe('draft');
    expect(wrapper.getAttribute('dir')).toBe('rtl');
    fixture.destroy();
  });
});

@Component({
  standalone: true,
  imports: [KjCommandPaletteComponent, KjCommandItemComponent],
  template: `
    <button id="opener">Open the palette</button>
    <kj-command-palette [(kjOpen)]="open">
      <kj-command-item kjValue="a">Alpha</kj-command-item>
      <kj-command-item kjValue="b">Beta</kj-command-item>
    </kj-command-palette>
  `,
})
class OnePalette {
  readonly open = signal(false);
}

describe('<kj-command-palette> — an accessible modal on the overlay primitive (overlay F-6)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OnePalette>>;
  let appRef: ApplicationRef;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(OnePalette);
    appRef = TestBed.inject(ApplicationRef);
    fixture.detectChanges();
    appRef.tick();
  });

  afterEach(() => {
    fixture.destroy();
    container()?.remove();
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
  });

  async function open(): Promise<HTMLElement> {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    appRef.tick();
    await settleOpen();
    appRef.tick();
    const panel = container()!.querySelector<HTMLElement>('.kj-command-palette__dialog');
    expect(panel, 'the palette is portalled into the overlay container').not.toBeNull();
    return panel!;
  }

  async function close(): Promise<void> {
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    appRef.tick();
    await settleOpen();
    appRef.tick();
  }

  it('the panel is a modal dialog named by kjAriaLabel, with a real scrim, and registers on the stack', async () => {
    const stack = TestBed.inject(KjOverlayStack);
    const before = stack.stackSize;
    const panel = await open();

    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-label')).toBe('Command palette');
    expect(panel.hasAttribute('hidden')).toBe(false);
    expect(stack.stackSize).toBe(before + 1);

    const scrim = container()!.querySelector<HTMLElement>('kj-backdrop');
    expect(scrim, 'the backdrop strategy renders a scrim').not.toBeNull();
    expect(scrim!.classList.contains('kj-backdrop')).toBe(true);

    await close();
    expect(stack.stackSize).toBe(before);
  });

  it('aria-modal is backed by real inerting, and the page scroll is locked', async () => {
    const outside = document.createElement('div');
    outside.textContent = 'page content';
    document.body.appendChild(outside);
    try {
      await open();
      expect(outside.hasAttribute('inert'), 'the page behind the modal is inert').toBe(true);
      expect(document.documentElement.style.overflow).toBe('hidden');

      await close();
      expect(outside.hasAttribute('inert')).toBe(false);
      expect(document.documentElement.style.overflow).toBe('');
    } finally {
      outside.remove();
    }
  });

  it('traps Tab inside the panel and returns focus to the opener on close', async () => {
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    document.body.appendChild(fixture.nativeElement);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const panel = await open();
    const input = panel.querySelector<HTMLInputElement>('.kj-command-palette__input')!;
    expect(document.activeElement, 'initial focus lands on the search box').toBe(input);

    // Tab from the last tabbable element wraps back inside the panel rather
    // than escaping to the page behind the modal.
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(panel.contains(document.activeElement), 'Tab stayed inside the dialog').toBe(true);

    await close();
    expect(document.activeElement, 'focus goes back where it came from').toBe(opener);
  });

  it('Escape clears a non-empty query first and only closes on the second press', async () => {
    const panel = await open();
    const input = panel.querySelector<HTMLInputElement>('.kj-command-palette__input')!;
    input.focus();
    input.value = 'alp';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    appRef.tick();

    const escape = () => document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );

    escape();
    fixture.detectChanges();
    appRef.tick();
    expect(input.value, 'the first Escape belongs to the search box').toBe('');
    expect(fixture.componentInstance.open(), 'the palette is still open').toBe(true);

    escape();
    fixture.detectChanges();
    appRef.tick();
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
