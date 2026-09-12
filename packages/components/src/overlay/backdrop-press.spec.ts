import { ApplicationRef, Component, computed, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KjCommandPaletteComponent, KjCommandItemComponent } from '../command-palette/command-palette';
import { KjOptionComponent, KjSelectComponent } from '../select/select';

/**
 * A backdrop dismisses a press it owns from the start — nothing else.
 *
 * The palette's scrim spans the viewport underneath every overlay opened
 * from inside it. Commit a NEW value in a nested `<kj-select>` and its
 * option list re-renders: the clicked option leaves the document before
 * the pointer comes up, and the engine retargets the `click` to whatever
 * is under the pointer by then — the scrim. The palette dismissed on a
 * click the user aimed at an option. Committing the SAME value re-renders
 * nothing, the option stays attached, the click lands on it, and the
 * palette survived, which is what made the bug read as value-dependent.
 *
 * jsdom never performs that retargeting itself, so these specs stage it:
 * press the option, let the commit re-render it away, then deliver the
 * `click` where a real browser delivers it — on the scrim, with
 * `detail: 1` like any pointer-driven click.
 */

const FAKE_TIMERS = ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'Date'] as const;

function container(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.kj-overlay-container');
}

function settle(appRef: ApplicationRef): void {
  appRef.tick();
  for (let i = 0; i < 40; i++) { vi.advanceTimersByTime(1); appRef.tick(); }
  appRef.tick();
}

/** A pointer-driven click, as an engine dispatches it (`detail >= 1`). */
function pointerClick(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, detail: 1 }));
}

function press(el: Element): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
}

/** Scope shared by the bar and the palette, like a consumer's lookup store. */
class Scope {
  readonly branch = signal('main');
  /** New array identity per branch, so the option rows are re-created. */
  readonly branches = computed(() =>
    this.branch() === 'main' ? ['main', 'dev'] : ['dev', 'main', 'release'],
  );
}

@Component({
  selector: 'kj-test-scope-bar',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  template: `
    <kj-select
      data-test="select"
      [value]="scope().branch()"
      (valueChange)="scope().branch.set($any($event))"
    >
      <!-- Keyed on the committed branch as well as the row, so a commit
           re-creates every option node — the consumer shape that detaches
           the pressed element mid-gesture. -->
      @for (b of scope().branches(); track b + '@' + scope().branch()) {
        <kj-option [value]="b" [kjLabel]="b">{{ b }}</kj-option>
      }
    </kj-select>
  `,
})
class ScopeBar {
  readonly scope = input.required<Scope>();
}

@Component({
  standalone: true,
  imports: [KjCommandPaletteComponent, KjCommandItemComponent, ScopeBar],
  template: `
    <kj-command-palette
      [(kjOpen)]="open"
      [kjShouldFilter]="false"
      [kjAutoCloseOnActivate]="false"
    >
      <div role="presentation"><kj-test-scope-bar [scope]="scope" /></div>
      <kj-command-item kjValue="open-file">Open file</kj-command-item>
    </kj-command-palette>
  `,
})
class PaletteWithSelect {
  readonly open = signal(false);
  readonly scope = new Scope();
}

describe('the palette backdrop dismisses only a press it owns', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    vi.useFakeTimers({ toFake: [...FAKE_TIMERS] });
  });

  afterEach(() => {
    container()?.remove();
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
    vi.useRealTimers();
  });

  function open() {
    const fixture = TestBed.createComponent(PaletteWithSelect);
    const appRef = TestBed.inject(ApplicationRef);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    settle(appRef);
    const shell = container()!.querySelector<HTMLElement>('.kj-command-palette__shell')!;
    const backdrop = shell.querySelector<HTMLElement>('.kj-command-palette__backdrop')!;
    return { fixture, appRef, shell, backdrop };
  }

  function openSelect(appRef: ApplicationRef, shell: HTMLElement) {
    const trigger = shell.querySelector<HTMLElement>('.kj-select-trigger')!;
    press(trigger);
    trigger.click();
    settle(appRef);
    const listbox = container()!.querySelector<HTMLElement>('kj-select-content[data-state="open"]');
    expect(listbox, 'the nested listbox is open').not.toBeNull();
    return listbox!;
  }

  /** Labels of every option currently rendered, in DOM order. */
  function labels(): string[] {
    return [...document.querySelectorAll<HTMLElement>('kj-select-content [role="option"]')]
      .map(o => o.textContent?.trim() ?? '');
  }

  function optionNamed(listbox: HTMLElement, label: string): HTMLElement {
    const el = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')]
      .find(o => o.textContent?.trim() === label);
    expect(el, `option "${label}" is rendered`).toBeTruthy();
    return el!;
  }

  it('committing a DIFFERENT value re-renders the list, and the retargeted click does not dismiss', () => {
    const { fixture, appRef, shell, backdrop } = open();
    const listbox = openSelect(appRef, shell);
    const dev = optionNamed(listbox, 'dev');
    const before = labels();

    // The press begins on the option — the scrim never sees it.
    press(dev);
    settle(appRef);

    pointerClick(dev);
    fixture.detectChanges();
    settle(appRef);

    expect(fixture.componentInstance.scope.branch(), 'the value committed').toBe('dev');
    expect(labels(), 'the commit re-rendered the option list').not.toEqual(before);

    // Stage what the engine does when the pressed node goes away mid-gesture
    // and jsdom does not: drop it, then deliver the click to what is under
    // the pointer by then — the palette's scrim.
    dev.remove();
    pointerClick(backdrop);
    fixture.detectChanges();
    settle(appRef);

    expect(fixture.componentInstance.open(), 'the palette stays open').toBe(true);
  });

  it('committing the SAME value also leaves the palette open', () => {
    const { fixture, appRef, shell } = open();
    const listbox = openSelect(appRef, shell);
    const main = optionNamed(listbox, 'main');

    press(main);
    pointerClick(main);
    fixture.detectChanges();
    settle(appRef);

    expect(fixture.componentInstance.scope.branch()).toBe('main');
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('a click on the scrim with no press of its own never dismisses', () => {
    const { fixture, appRef, backdrop } = open();
    pointerClick(backdrop);
    fixture.detectChanges();
    settle(appRef);
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('a real press on the scrim still dismisses the palette', () => {
    const { fixture, appRef, backdrop } = open();
    press(backdrop);
    pointerClick(backdrop);
    fixture.detectChanges();
    settle(appRef);
    expect(fixture.componentInstance.open(), 'click-away still works').toBe(false);
  });

  it('a programmatic click on the scrim still dismisses (no pointerdown to match)', () => {
    const { fixture, appRef, backdrop } = open();
    backdrop.click();
    fixture.detectChanges();
    settle(appRef);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('pressing the scrim while the nested select is open dismisses only the select', () => {
    const { fixture, appRef, shell, backdrop } = open();
    openSelect(appRef, shell);

    press(backdrop);
    settle(appRef);
    pointerClick(backdrop);
    fixture.detectChanges();
    settle(appRef);

    expect(container()!.querySelector('kj-select-content[data-state="open"]'), 'the select closed').toBeNull();
    expect(fixture.componentInstance.open(), 'the palette underneath survives').toBe(true);
  });

  it('an arming press is consumed, so a later stray click cannot ride on it', () => {
    const { fixture, appRef, backdrop } = open();
    press(backdrop);
    pointerClick(backdrop);
    fixture.detectChanges();
    settle(appRef);
    expect(fixture.componentInstance.open()).toBe(false);

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    settle(appRef);
    const again = container()!.querySelector<HTMLElement>('.kj-command-palette__backdrop')!;
    pointerClick(again);
    fixture.detectChanges();
    settle(appRef);
    expect(fixture.componentInstance.open(), 'the consumed press does not carry over').toBe(true);
  });
});
