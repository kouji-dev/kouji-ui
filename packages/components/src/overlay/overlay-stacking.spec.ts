import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApplicationRef, Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import postcss from 'postcss';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KjDialogRef,
  KjDialogService,
  KjOverlayStack,
  KjPopoverContent,
  KjPopoverTrigger,
} from '@kouji-ui/core';
import { KjCommandPaletteComponent } from '../command-palette/command-palette';
import { KjOptionComponent, KjSelectComponent } from '../select/select';

/**
 * Nested overlays must always paint above their opener. Every overlay in
 * the kit registers on `KjOverlayStack` when it opens and gets a z-index one
 * above the highest open overlay; the level lands on the panel and on its
 * `.kj-overlay-wrapper` as `--kj-overlay-z` + inline `z-index`. These specs
 * cover the shapes that used to break — a select inside a command palette,
 * a popover inside a dialog, a dialog opened from a palette — plus the
 * single-overlay defaults that must not change.
 */

const FAKE_TIMERS = ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'Date'] as const;

function container(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.kj-overlay-container');
}

function wrapperOf(el: Element | null | undefined): HTMLElement | null {
  return (el?.closest<HTMLElement>('.kj-overlay-wrapper')) ?? null;
}

function levelOf(el: Element | null | undefined): number {
  const wrapper = wrapperOf(el);
  expect(wrapper, 'overlay must sit inside a .kj-overlay-wrapper').not.toBeNull();
  const z = Number(wrapper!.style.zIndex);
  expect(Number.isFinite(z), 'wrapper must carry an inline z-index').toBe(true);
  return z;
}

function settle(appRef: ApplicationRef): void {
  appRef.tick();
  for (let i = 0; i < 40; i++) {
    vi.advanceTimersByTime(1);
    appRef.tick();
  }
  appRef.tick();
}

function cleanupOverlays(): void {
  container()?.remove();
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

@Component({
  standalone: true,
  imports: [KjCommandPaletteComponent, KjSelectComponent, KjOptionComponent],
  template: `
    <kj-command-palette [(kjOpen)]="open" data-test="palette">
      <kj-select [value]="'main'" data-test="select">
        <kj-option value="main" kjLabel="main">main</kj-option>
        <kj-option value="dev" kjLabel="dev">dev</kj-option>
      </kj-select>
    </kj-command-palette>
  `,
})
class PaletteWithSelect {
  // A signal so the zoneless fixture re-checks the host view on change.
  readonly open = signal(false);
}

@Component({
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent],
  template: `
    <button kjPopoverTrigger #t="kjPopoverTrigger" data-test="popover-trigger">More</button>
    <kj-popover-content [kjFor]="t" data-test="popover">Details</kj-popover-content>
  `,
})
class DialogWithPopover {
  readonly ref = inject<KjDialogRef<DialogWithPopover>>(KjDialogRef);
}

@Component({
  standalone: true,
  template: `<p data-test="dialog-body">Hello</p>`,
})
class PlainDialog {
  readonly ref = inject<KjDialogRef<PlainDialog>>(KjDialogRef);
}

@Component({
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent],
  template: `
    <button kjPopoverTrigger #t="kjPopoverTrigger" data-test="lone-trigger">More</button>
    <kj-popover-content [kjFor]="t" data-test="lone-popover">Details</kj-popover-content>
  `,
})
class LonePopover {}

describe('overlay stacking — nested overlays paint above their opener', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    vi.useFakeTimers({ toFake: [...FAKE_TIMERS] });
  });

  afterEach(() => {
    cleanupOverlays();
    vi.useRealTimers();
  });

  function openPalette() {
    const fixture = TestBed.createComponent(PaletteWithSelect);
    const appRef = TestBed.inject(ApplicationRef);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    settle(appRef);
    const shell = container()?.querySelector<HTMLElement>('.kj-command-palette__shell') ?? null;
    expect(shell, 'open palette shell is portalled into the overlay container').not.toBeNull();
    return { fixture, appRef, shell: shell! };
  }

  it('the open palette lives in the overlay container at the base level, and returns home on close', () => {
    const { fixture, appRef, shell } = openPalette();
    const stack = TestBed.inject(KjOverlayStack);
    expect(levelOf(shell)).toBe(stack.baseZIndex);
    expect(shell.style.getPropertyValue('--kj-overlay-z')).toBe(String(stack.baseZIndex));
    expect(stack.stackSize).toBe(1);

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    settle(appRef);
    const home = fixture.nativeElement.querySelector('.kj-command-palette__shell') as HTMLElement | null;
    expect(home).not.toBeNull();
    expect(home!.style.getPropertyValue('--kj-overlay-z')).toBe('');
    expect(container()?.querySelector('.kj-command-palette__shell') ?? null).toBeNull();
    expect(stack.stackSize).toBe(0);
  });

  it('a select opened inside a command palette stacks its listbox above the palette', () => {
    const { appRef, shell } = openPalette();
    shell.querySelector<HTMLElement>('.kj-select-trigger')!.click();
    settle(appRef);

    const listbox = container()!.querySelector<HTMLElement>('kj-select-content[data-state="open"]');
    expect(listbox).not.toBeNull();
    expect(levelOf(listbox)).toBeGreaterThan(levelOf(shell));
    expect(levelOf(listbox)).toBe(levelOf(shell) + 1);
    expect(Number(listbox!.style.getPropertyValue('--kj-overlay-z'))).toBeGreaterThan(
      Number(shell.style.getPropertyValue('--kj-overlay-z')),
    );
  });

  it('closing the inner select restores: the palette keeps its level and the next overlay reopens one above it', () => {
    const { appRef, shell } = openPalette();
    const stack = TestBed.inject(KjOverlayStack);
    const trigger = shell.querySelector<HTMLElement>('.kj-select-trigger')!;
    const paletteLevel = levelOf(shell);

    trigger.click();
    settle(appRef);
    expect(stack.stackSize).toBe(2);

    // Escape goes to the topmost overlay only: the listbox closes, the palette stays.
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    settle(appRef);
    expect(container()!.querySelector('kj-select-content[data-state="open"]')).toBeNull();
    expect(container()!.querySelector('.kj-command-palette__shell.is-open')).not.toBeNull();
    expect(stack.stackSize).toBe(1);
    expect(levelOf(shell)).toBe(paletteLevel);
    expect(stack.nextZIndex).toBe(paletteLevel + 1);

    trigger.click();
    settle(appRef);
    const again = container()!.querySelector<HTMLElement>('kj-select-content[data-state="open"]');
    expect(levelOf(again)).toBe(paletteLevel + 1);
  });

  it('Escape with only the palette open closes the palette', () => {
    const { fixture, appRef, shell } = openPalette();
    shell.querySelector<HTMLElement>('.kj-command-palette__dialog')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    settle(appRef);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(container()?.querySelector('.kj-command-palette__shell') ?? null).toBeNull();
  });

  it('a popover opened inside a service dialog stacks above the dialog', () => {
    const appRef = TestBed.inject(ApplicationRef);
    const ref = TestBed.inject(KjDialogService).open(DialogWithPopover);
    settle(appRef);
    const trigger = container()!.querySelector<HTMLElement>('[data-test="popover-trigger"]');
    expect(trigger, 'dialog body is mounted in the overlay container').not.toBeNull();
    const dialogLevel = levelOf(trigger);

    trigger!.click();
    settle(appRef);
    const popover = container()!.querySelector<HTMLElement>('[data-test="popover"][data-state="open"]');
    expect(popover).not.toBeNull();
    expect(levelOf(popover)).toBe(dialogLevel + 1);
    ref.close();
    settle(appRef);
  });

  it('a dialog opened from a palette stacks above the palette, and a popover in that dialog above both', () => {
    const { appRef, shell } = openPalette();
    const ref = TestBed.inject(KjDialogService).open(DialogWithPopover);
    settle(appRef);
    const trigger = container()!.querySelector<HTMLElement>('[data-test="popover-trigger"]');
    expect(trigger).not.toBeNull();
    const paletteLevel = levelOf(shell);
    const dialogLevel = levelOf(trigger);
    expect(dialogLevel).toBe(paletteLevel + 1);

    trigger!.click();
    settle(appRef);
    const popover = container()!.querySelector<HTMLElement>('[data-test="popover"][data-state="open"]');
    const popoverLevel = levelOf(popover);
    // Three nested levels, strictly increasing.
    expect(popoverLevel).toBeGreaterThan(dialogLevel);
    expect(dialogLevel).toBeGreaterThan(paletteLevel);
    expect([paletteLevel, dialogLevel, popoverLevel]).toEqual([paletteLevel, paletteLevel + 1, paletteLevel + 2]);
    ref.close();
    settle(appRef);
  });

  it('a single overlay keeps the historical default level (1000)', () => {
    const appRef = TestBed.inject(ApplicationRef);
    const fixture = TestBed.createComponent(LonePopover);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-test="lone-trigger"]').click();
    settle(appRef);
    const popover = container()!.querySelector<HTMLElement>('[data-test="lone-popover"][data-state="open"]');
    expect(levelOf(popover)).toBe(1000);
    expect(popover!.style.getPropertyValue('--kj-overlay-z')).toBe('1000');

    const ref = TestBed.inject(KjDialogService).open(PlainDialog);
    settle(appRef);
    const body = container()!.querySelector<HTMLElement>('[data-test="dialog-body"]');
    expect(levelOf(body)).toBe(1001);
    ref.close();
    settle(appRef);
  });
});

describe('overlay stacking — stylesheets read the stack level with the historical defaults', () => {
  function decl(file: string, selector: string, prop: string): string | undefined {
    const css = readFileSync(resolve(import.meta.dirname, file), 'utf-8');
    let out: string | undefined;
    postcss.parse(css).walkRules(rule => {
      if (rule.selector.trim() !== selector) return;
      rule.walkDecls(prop, d => (out = d.value));
    });
    return out;
  }

  it('the command palette keeps backdrop 1000 / dialog 1001 as fallbacks', () => {
    expect(decl('../command-palette/command-palette.css', '.kj-command-palette__backdrop', 'z-index')).toBe('var(--kj-overlay-z, 1000)');
    expect(decl('../command-palette/command-palette.css', '.kj-command-palette__dialog', 'z-index')).toBe('calc(var(--kj-overlay-z, 1000) + 1)');
  });

  it('panel stylesheets read --kj-overlay-z with their previous literal as the fallback', () => {
    expect(decl('../select/select.css', '.kj-select-content', 'z-index')).toBe('var(--kj-overlay-z, 100)');
    expect(decl('../popover/popover.css', '.kj-popover-content', 'z-index')).toBe('var(--kj-overlay-z, 1000)');
    expect(decl('../dialog/dialog.css', '.kj-dialog-overlay', 'z-index')).toBe('var(--kj-overlay-z, 1000)');
    expect(decl('../dropdown-menu/dropdown-menu.css', '.kj-dropdown-menu', 'z-index')).toBe('var(--kj-overlay-z, 1000)');
    expect(decl('../tooltip/tooltip.css', '.kj-tooltip-content', 'z-index')).toBe('var(--kj-overlay-z, 1000)');
    expect(decl('../confirm-popup/confirm-popup.css', '.kj-confirm-popup-content', 'z-index')).toBe('var(--kj-overlay-z, 1000)');
    expect(decl('../drawer/drawer.css', '.kj-drawer', 'z-index')).toBe('var(--kj-overlay-z, 1000)');
    expect(decl('../sheet/sheet.css', '.kj-sheet', 'z-index')).toBe('var(--kj-overlay-z, 1000)');
    expect(decl('../combobox/combobox.css', '.kj-combobox-listbox', 'z-index')).toBe('var(--kj-overlay-z, 100)');
  });

  it('the overlay container sits at --kj-overlay-z-base (1000) and toasts default above the stack (2000)', () => {
    expect(decl('../../../core/src/primitives/overlay/overlay.css', '.kj-overlay-container', 'z-index'))
      .toBe('var(--kj-overlay-z-index, var(--kj-overlay-z-base, 1000))');
    expect(decl('../toast/toast.css', '.kj-toast-viewport', 'z-index')).toBe('var(--kj-toast-z-index, 2000)');
  });

  it('no overlay stylesheet hardcodes the 1000/1001 levels any more', () => {
    const files = [
      '../popover/popover.css', '../tooltip/tooltip.css', '../dropdown-menu/dropdown-menu.css',
      '../dialog/dialog.css', '../drawer/drawer.css', '../confirm-popup/confirm-popup.css',
      '../sheet/sheet.css', '../select/select.css', '../combobox/combobox.css',
      '../tree-select/tree-select.css', '../cascade-select/cascade-select.css',
      '../color-picker/color-picker.css', '../date-picker/date-picker.css',
      '../datetime-picker/datetime-picker.css', '../command-palette/command-palette.css',
    ];
    for (const f of files) {
      const css = readFileSync(resolve(import.meta.dirname, f), 'utf-8');
      postcss.parse(css).walkDecls('z-index', d => {
        // Only the cascade sub-panel is a child of its own root panel (a
        // stacking context of its own) and keeps a literal level.
        if (d.parent && 'selector' in d.parent && (d.parent as { selector: string }).selector === '.kj-cascade-sub-panel') return;
        expect(d.value, `${f}: ${d.value}`).toMatch(/var\(--kj-overlay-z, \d+\)/);
      });
    }
  });
});
