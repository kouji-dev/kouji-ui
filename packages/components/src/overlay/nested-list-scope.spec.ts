import { ApplicationRef, Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KjDialogRef,
  KjDialogService,
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuTrigger,
} from '@kouji-ui/core';
import { KjCommandPaletteComponent, KjCommandItemComponent } from '../command-palette/command-palette';
import { KjOptionComponent, KjSelectComponent } from '../select/select';

/**
 * A list-like composite nested inside another one must keep its items to
 * itself. `KjListItem` finds its container through the element injector, so
 * an option rendered inside a `<kj-select>` that itself sits inside a
 * `<kj-command-palette>` used to hand its activation to whichever
 * `KJ_LIST_NAVIGATOR_CONFIG` it reached first — the palette's, whenever the
 * select's own scope was not on the path. The palette then treated the
 * option's commit as one of its own rows firing and closed.
 *
 * These specs pin the contract: committing a value in an inner composite
 * never activates the outer one, and a real outer row still activates.
 */

const FAKE_TIMERS = ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'Date'] as const;

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

function cleanupOverlays(): void {
  container()?.remove();
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

/**
 * The Orrery shape: a scope bar carrying a `<kj-select>` rides inside the
 * palette alongside real command rows, and the consumer has opted out of
 * close-on-activate. The select lives in a child component's *view* so the
 * element-injector path from the option to the select root crosses a
 * component boundary — the arrangement that broke.
 */
@Component({
  selector: 'kj-test-scope-bar',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  template: `
    <kj-select [value]="value()" (valueChange)="value.set($any($event))" data-test="select">
      <kj-option value="main" kjLabel="main">main</kj-option>
      <kj-option value="dev" kjLabel="dev">dev</kj-option>
    </kj-select>
  `,
})
class ScopeBar {
  readonly value = signal('main');
}

@Component({
  standalone: true,
  imports: [KjCommandPaletteComponent, KjCommandItemComponent, ScopeBar],
  template: `
    <kj-command-palette
      [(kjOpen)]="open"
      [kjAutoCloseOnActivate]="false"
      (kjActivate)="activated.set($any($event).value)"
      data-test="palette"
    >
      <div role="presentation"><kj-test-scope-bar /></div>
      <kj-command-item kjValue="open-file" kjLabel="Open file">Open file</kj-command-item>
    </kj-command-palette>
  `,
})
class PaletteWithScopeBar {
  readonly open = signal(false);
  readonly activated = signal<unknown>(null);
}

@Component({
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  template: `
    <kj-select [value]="value()" (valueChange)="value.set($any($event))" data-test="dialog-select">
      <kj-option value="main" kjLabel="main">main</kj-option>
      <kj-option value="dev" kjLabel="dev">dev</kj-option>
    </kj-select>
  `,
})
class DialogWithSelect {
  readonly ref = inject<KjDialogRef<DialogWithSelect>>(KjDialogRef);
  readonly value = signal('main');
}

@Component({
  selector: 'kj-test-menu-bar',
  standalone: true,
  imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem],
  template: `
    <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger" class="menu-trigger">Actions</button>
    <kj-dropdown-menu-content [kjFor]="t" data-test="menu">
      <button kjDropdownMenuItem (kjSelect)="picked.set('rename')">Rename</button>
    </kj-dropdown-menu-content>
  `,
})
class MenuBar {
  readonly picked = signal<string | null>(null);
}

describe('a nested list composite does not activate its ancestor list', () => {
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
    const fixture = TestBed.createComponent(PaletteWithScopeBar);
    const appRef = TestBed.inject(ApplicationRef);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    settle(appRef);
    const shell = container()?.querySelector<HTMLElement>('.kj-command-palette__shell') ?? null;
    expect(shell, 'the open palette is portalled into the overlay container').not.toBeNull();
    return { fixture, appRef, shell: shell! };
  }

  function openInnerSelect(appRef: ApplicationRef, shell: HTMLElement) {
    shell.querySelector<HTMLElement>('.kj-select-trigger')!.click();
    settle(appRef);
    const listbox = container()!.querySelector<HTMLElement>('kj-select-content[data-state="open"]');
    expect(listbox, 'the nested listbox is open').not.toBeNull();
    return listbox!;
  }

  it('picking a DIFFERENT option in a select inside a command palette keeps the palette open', () => {
    const { fixture, appRef, shell } = openPalette();
    const listbox = openInnerSelect(appRef, shell);

    const dev = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')]
      .find(o => o.textContent?.trim() === 'dev')!;
    expect(dev, 'the unselected option is rendered').toBeTruthy();
    dev.click();
    fixture.detectChanges();
    settle(appRef);

    expect(fixture.componentInstance.open(), 'the palette stays open').toBe(true);
    expect(fixture.componentInstance.activated(), 'the palette never saw an activation').toBeNull();
    expect(container()!.querySelector('kj-select-content[data-state="open"]'), 'only the select closed').toBeNull();
  });

  it('picking the SAME option in the nested select also keeps the palette open', () => {
    const { fixture, appRef, shell } = openPalette();
    const listbox = openInnerSelect(appRef, shell);

    const main = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')]
      .find(o => o.textContent?.trim() === 'main')!;
    main.click();
    fixture.detectChanges();
    settle(appRef);

    expect(fixture.componentInstance.open()).toBe(true);
    expect(fixture.componentInstance.activated()).toBeNull();
  });

  it('a real palette row still activates, and honours kjAutoCloseOnActivate="false"', () => {
    const { fixture, appRef, shell } = openPalette();
    shell.querySelector<HTMLElement>('.kj-command-item')!.click();
    fixture.detectChanges();
    settle(appRef);

    expect(fixture.componentInstance.activated(), 'the palette row activated').toBe('open-file');
    expect(fixture.componentInstance.open(), 'the opt-out posture is honoured').toBe(true);
  });

  it('a real palette row closes the palette when kjAutoCloseOnActivate is left on', () => {
    @Component({
      standalone: true,
      imports: [KjCommandPaletteComponent, KjCommandItemComponent],
      template: `
        <kj-command-palette [(kjOpen)]="open">
          <kj-command-item kjValue="run" kjLabel="Run">Run</kj-command-item>
        </kj-command-palette>
      `,
    })
    class AutoClosePalette {
      readonly open = signal(false);
    }

    const fixture = TestBed.createComponent(AutoClosePalette);
    const appRef = TestBed.inject(ApplicationRef);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    settle(appRef);
    container()!.querySelector<HTMLElement>('.kj-command-item')!.click();
    fixture.detectChanges();
    settle(appRef);

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('picking an option in a select inside a dialog keeps the dialog open', () => {
    const appRef = TestBed.inject(ApplicationRef);
    const ref = TestBed.inject(KjDialogService).open(DialogWithSelect);
    settle(appRef);

    container()!.querySelector<HTMLElement>('.kj-select-trigger')!.click();
    settle(appRef);
    const listbox = container()!.querySelector<HTMLElement>('kj-select-content[data-state="open"]')!;
    const dev = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')]
      .find(o => o.textContent?.trim() === 'dev')!;
    dev.click();
    settle(appRef);

    expect(container()!.querySelector('kj-select-content[data-state="open"]'), 'the select closed').toBeNull();
    expect(container()!.querySelector('[data-test="dialog-select"]'), 'the dialog stayed open').not.toBeNull();
    ref.close();
    settle(appRef);
  });

  it('activating a menu item in a dropdown menu inside a command palette keeps the palette open', () => {
    @Component({
      standalone: true,
      imports: [KjCommandPaletteComponent, KjCommandItemComponent, MenuBar],
      template: `
        <kj-command-palette
          [(kjOpen)]="open"
          [kjAutoCloseOnActivate]="false"
          (kjActivate)="activated.set($any($event).value)"
        >
          <div role="presentation"><kj-test-menu-bar /></div>
          <kj-command-item kjValue="open-file" kjLabel="Open file">Open file</kj-command-item>
        </kj-command-palette>
      `,
    })
    class PaletteWithMenu {
      readonly open = signal(false);
      readonly activated = signal<unknown>(null);
    }

    const fixture = TestBed.createComponent(PaletteWithMenu);
    const appRef = TestBed.inject(ApplicationRef);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    settle(appRef);

    const shell = container()!.querySelector<HTMLElement>('.kj-command-palette__shell')!;
    shell.querySelector<HTMLElement>('.menu-trigger')!.click();
    settle(appRef);
    const item = container()!.querySelector<HTMLElement>('.kj-dropdown-menu-item');
    expect(item, 'the nested menu is open').not.toBeNull();
    item!.click();
    fixture.detectChanges();
    settle(appRef);

    expect(fixture.componentInstance.open(), 'the palette stays open').toBe(true);
    expect(fixture.componentInstance.activated(), 'the palette never saw an activation').toBeNull();
  });
});
