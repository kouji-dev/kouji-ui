import { ApplicationRef, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuContent,
  KjDropdownMenuGroup,
  KjDropdownMenuItem,
  KjDropdownMenuLabel,
  KjDropdownMenuSeparator,
  KjDropdownMenuTrigger,
} from './dropdown-menu';

/**
 * The wrapper composition a consumer types: `<kj-dropdown-menu>` around a
 * `[kjDropdownMenuTrigger]` and a `<kj-dropdown-menu-content [kjFor]>` panel,
 * painted by `dropdown-menu.css`. The core specs own the list/overlay
 * mechanism; this file proves the styled suite is wired to it — the menu is
 * portalled with `role="menu"`, keyboard focus lands on an item, arrows move
 * between items, selecting one closes the menu and returns focus, and Escape
 * does the same.
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
  imports: [
    KjDropdownMenuComponent,
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
    KjDropdownMenuLabel,
    KjDropdownMenuGroup,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-dropdown-menu>
      <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger" data-test="trigger">Actions</button>
      <kj-dropdown-menu-content [kjFor]="t" data-test="menu">
        <!-- A label must sit inside a group: it registers its id with the
             group's aria-labelledby, and injecting the group is mandatory. -->
        <div kjDropdownMenuGroup>
          <div kjDropdownMenuLabel>Document</div>
          <button kjDropdownMenuItem id="rename" (kjSelect)="picked.set('rename')">
            Rename
          </button>
          <button kjDropdownMenuItem id="duplicate" (kjSelect)="picked.set('duplicate')">
            Duplicate
          </button>
        </div>
        <hr kjDropdownMenuSeparator />
        <button kjDropdownMenuItem id="delete" (kjSelect)="picked.set('delete')">Delete</button>
      </kj-dropdown-menu-content>
    </kj-dropdown-menu>
  `,
})
class Host {
  readonly picked = signal<string | null>(null);
}

describe('KjDropdownMenuComponent (wrapper suite)', () => {
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
    const trigger = root.querySelector<HTMLButtonElement>('[data-test="trigger"]')!;
    return { fixture, appRef, root, trigger };
  }

  function openMenu(): HTMLElement | null {
    return (
      container()?.querySelector<HTMLElement>('kj-dropdown-menu-content[data-state="open"]') ?? null
    );
  }

  function open() {
    const ctx = mount();
    ctx.trigger.focus();
    ctx.trigger.click();
    settle(ctx.appRef);
    const menu = openMenu();
    expect(menu, 'the menu panel is portalled open').not.toBeNull();
    return { ...ctx, menu: menu! };
  }

  it('the wrapper is a pass-through shell that adds no box of its own', () => {
    const { root } = mount();
    const shell = root.querySelector<HTMLElement>('kj-dropdown-menu');

    expect(shell).not.toBeNull();
    expect(shell!.getAttribute('style')).toContain('display: contents');
    expect(shell!.getAttribute('role')).toBeNull();
  });

  it('the trigger advertises a collapsed menu disclosure before anything opens', () => {
    const { trigger } = mount();

    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(openMenu()).toBeNull();
  });

  it('clicking the trigger portals the styled menu with the full ARIA shape', () => {
    const { trigger, menu } = open();

    expect(menu.classList.contains('kj-dropdown-menu')).toBe(true);
    expect(menu.getAttribute('role')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);

    const items = menu.querySelectorAll('[kjDropdownMenuItem]');
    expect(items).toHaveLength(3);
    expect(Array.from(items).every((i) => i.getAttribute('role') === 'menuitem')).toBe(true);
    expect(menu.querySelector('[kjDropdownMenuSeparator]')?.getAttribute('role')).toBe('separator');

    const group = menu.querySelector('[kjDropdownMenuGroup]')!;
    const label = menu.querySelector<HTMLElement>('[kjDropdownMenuLabel]')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    expect(label.getAttribute('role')).toBe('presentation');
  });

  it('opening moves focus onto the first item so the keyboard user starts inside the menu', () => {
    const { menu } = open();

    expect(menu.contains(document.activeElement)).toBe(true);
    expect((document.activeElement as HTMLElement).id).toBe('rename');
  });

  it('ArrowDown walks to the next item from wherever focus is', () => {
    const { appRef } = open();

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    settle(appRef);
    expect((document.activeElement as HTMLElement).id).toBe('duplicate');
  });

  it('activating an item emits it, closes the menu and returns focus to the trigger', () => {
    const { fixture, appRef, trigger, menu } = open();

    menu.querySelector<HTMLButtonElement>('#duplicate')!.click();
    settle(appRef);

    expect(fixture.componentInstance.picked()).toBe('duplicate');
    expect(openMenu()).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape closes the menu and returns focus to the trigger', () => {
    const { appRef, trigger } = open();

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    settle(appRef);

    expect(openMenu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
