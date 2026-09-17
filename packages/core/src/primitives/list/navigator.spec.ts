// packages/core/src/primitives/list/navigator.spec.ts
import { Component, Directive, PLATFORM_ID, computed, contentChildren, forwardRef, inject, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { render, type RenderResult } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import {
  KJ_LIST_FOCUS_MODE_DEFAULT,
  KJ_LIST_NAVIGATOR_ITEMS,
  KjListNavigator,
} from './navigator';
import { KjListItem } from './item';
import { KjTypeAhead } from './type-ahead';
import { KJ_LIST_NAVIGATOR_CONFIG } from './tokens';

/**
 * Minimal test root that registers child KjListItems into
 * KJ_LIST_NAVIGATOR_CONFIG via contentChildren — same pattern as
 * KjSelect / KjCombobox. Used by the focus-mode tests below.
 */
@Directive({
  selector: '[kjTestListRoot]',
  standalone: true,
  providers: [
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => TestListRoot) },
  ],
})
class TestListRoot {
  readonly items = contentChildren(KjListItem, { descendants: true });
}

/** Shape that mirrors the parts of KjListItem the navigator reads. */
function fakeItem(id: string, label: string, disabled = false) {
  let activated = 0;
  return {
    id,
    label: () => label,
    disabled: () => disabled,
    _activate: () => { activated++; },
    get activated() { return activated; },
  } as unknown as KjListItem<unknown> & { activated: number; _activate: () => void };
}

function setup(items: ReturnType<typeof fakeItem>[], opts: { wrap?: boolean; orientation?: 'vertical' | 'horizontal' | 'both' } = {}) {
  const orientationAttr = opts.orientation ? ` [kjOrientation]="'${opts.orientation}'"` : '';
  const wrapAttr = opts.wrap === false ? ` [kjWrap]="false"` : '';
  return render(
    `<div kjListNavigator${orientationAttr}${wrapAttr}></div>`,
    {
      imports: [KjListNavigator],
      providers: [
        KjTypeAhead,
        {
          provide: KJ_LIST_NAVIGATOR_CONFIG,
          useValue: { items: signal(items) },
        },
      ],
    },
  );
}

/** Dispatch a keydown and flush change detection so host bindings reach the DOM. */
function press(host: HTMLElement, fixture: RenderResult<unknown>['fixture'], key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  host.dispatchEvent(e);
  fixture.detectChanges();
  return e;
}

describe('KjListNavigator', () => {
  it('starts with no active item', async () => {
    const { container } = await setup([fakeItem('1', 'A'), fakeItem('2', 'B')]);
    const host = container.querySelector('[kjListNavigator]')!;
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('ArrowDown moves to next item, wraps past last when kjWrap=true', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'ArrowDown');
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
    press(host, fixture, 'ArrowDown');
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
    press(host, fixture, 'ArrowDown');
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
  });

  it('ArrowUp wraps to last item from first', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'ArrowUp');
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
  });

  it('skips disabled items during navigation', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B', true), fakeItem('3', 'C')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'ArrowDown');
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
    press(host, fixture, 'ArrowDown');
    expect(host.getAttribute('aria-activedescendant')).toBe('3');
  });

  it('Home moves to first, End moves to last', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B'), fakeItem('3', 'C')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'End');
    expect(host.getAttribute('aria-activedescendant')).toBe('3');
    press(host, fixture, 'Home');
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
  });

  it('Enter calls _activate on the current item and preventDefaults', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'ArrowDown');
    const e = press(host, fixture, 'Enter');
    expect((items[0] as { activated: number }).activated).toBe(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('Enter does NOT preventDefault when there is no active item', async () => {
    const items = [fakeItem('1', 'A')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    const e = press(host, fixture, 'Enter');
    expect(e.defaultPrevented).toBe(false);
    expect((items[0] as { activated: number }).activated).toBe(0);
  });

  it('Space activates current item', async () => {
    const items = [fakeItem('1', 'A')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'ArrowDown');
    press(host, fixture, ' ');
    expect((items[0] as { activated: number }).activated).toBe(1);
  });

  it('Space in a text input types a character instead of activating', async () => {
    // A combobox highlights a row for every query, so activating on Space made
    // multi-word queries impossible — the space ran the highlighted item.
    const items = [fakeItem('1', 'A')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'ArrowDown');

    const input = document.createElement('input');
    host.appendChild(input);
    const e = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    input.dispatchEvent(e);
    fixture.detectChanges();

    expect((items[0] as { activated: number }).activated).toBe(0);
    expect(e.defaultPrevented).toBe(false);
  });

  it('Space still activates from a non-text control (a checkbox row)', async () => {
    const items = [fakeItem('1', 'A')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'ArrowDown');

    const box = document.createElement('input');
    box.type = 'checkbox';
    host.appendChild(box);
    box.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect((items[0] as { activated: number }).activated).toBe(1);
  });

  describe('keys the text field owns', () => {
    /** Mounts a navigator with a real text field inside it, focused. */
    async function withField(value: string) {
      const items = [fakeItem('1', 'Alpha'), fakeItem('2', 'Bravo'), fakeItem('3', 'Charlie')];
      const { container, fixture } = await setup(items);
      const host = container.querySelector('[kjListNavigator]') as HTMLElement;
      const field = document.createElement('input');
      field.type = 'text';
      field.value = value;
      host.appendChild(field);
      field.focus();
      return { host, fixture, field, items };
    }

    function pressFrom(field: HTMLElement, fixture: RenderResult<unknown>['fixture'], key: string) {
      const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      (document.activeElement ?? field).dispatchEvent(e);
      fixture.detectChanges();
      return e;
    }

    for (const key of ['Home', 'End', 'PageUp', 'PageDown']) {
      it(`${key} moves the caret, not the list, when the field holds text`, async () => {
        const { host, fixture, field } = await withField('que');
        const e = pressFrom(field, fixture, key);
        expect(e.defaultPrevented, `${key} was swallowed by the list`).toBe(false);
        expect(host.hasAttribute('aria-activedescendant')).toBe(false);
      });

      it(`${key} still drives the list from an EMPTY field`, async () => {
        const { host, fixture, field } = await withField('');
        const e = pressFrom(field, fixture, key);
        expect(e.defaultPrevented).toBe(true);
        expect(host.getAttribute('aria-activedescendant')).not.toBeNull();
      });
    }

    it('Home from a non-text control still jumps to the first item', async () => {
      const items = [fakeItem('1', 'Alpha'), fakeItem('2', 'Bravo')];
      const { container, fixture } = await setup(items);
      const host = container.querySelector('[kjListNavigator]') as HTMLElement;
      press(host, fixture, 'End');
      press(host, fixture, 'Home');
      expect(host.getAttribute('aria-activedescendant')).toBe('1');
    });
  });

  it('PageDown moves by kjPageSize (default 10)', async () => {
    const items = Array.from({ length: 15 }, (_, i) => fakeItem(String(i + 1), 'Item ' + (i + 1)));
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'ArrowDown');
    press(host, fixture, 'PageDown');
    expect(host.getAttribute('aria-activedescendant')).toBe('11');
  });

  it('delegates single-char keys to KjTypeAhead and activates the match', async () => {
    const items = [fakeItem('1', 'Apple'), fakeItem('2', 'Banana')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'b');
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
  });

  it('kjOrientation="horizontal" responds to ArrowLeft/Right not Up/Down', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container, fixture } = await setup(items, { orientation: 'horizontal' });
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'ArrowDown');
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);
    press(host, fixture, 'ArrowRight');
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
  });

  it('kjWrap=false clamps at last item instead of wrapping', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container, fixture } = await setup(items, { wrap: false });
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    press(host, fixture, 'End');
    press(host, fixture, 'ArrowDown');
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
  });
});

describe('KjListNavigator focus modes', () => {
  it('default activedescendant: all KjListItem tabindex=-1', async () => {
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <div kjTestListRoot kjListNavigator>
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const els = container.querySelectorAll('[kjListItem]');
    els.forEach(el => expect(el.getAttribute('tabindex')).toBe('-1'));
  });

  it('roving mode: first item is tabindex=0 on first render, others -1', async () => {
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <div kjTestListRoot kjListNavigator [kjFocusMode]="'roving'">
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
          <div role="option" aria-selected="false" kjListItem id="c" [kjItemValue]="'c'">C</div>
        </div>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    fixture.detectChanges();
    const a = container.querySelector('#a')!;
    const b = container.querySelector('#b')!;
    const c = container.querySelector('#c')!;
    expect(a.getAttribute('tabindex')).toBe('0');
    expect(b.getAttribute('tabindex')).toBe('-1');
    expect(c.getAttribute('tabindex')).toBe('-1');
  });

  it('roving mode: moveBy(1) flips the tabbable item to the next', async () => {
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <div kjTestListRoot kjListNavigator [kjFocusMode]="'roving'" #nav="kjListNavigator">
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
        </div>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    fixture.detectChanges();
    const nav = fixture.debugElement.query(By.directive(KjListNavigator)).injector.get(KjListNavigator);
    nav.moveBy(1);
    fixture.detectChanges();
    const a = container.querySelector('#a')!;
    const b = container.querySelector('#b')!;
    expect(a.getAttribute('tabindex')).toBe('-1');
    expect(b.getAttribute('tabindex')).toBe('0');
  });

  it('roving mode publishes NO aria-activedescendant, before or after navigation', async () => {
    // SC 4.1.2: aria-activedescendant is the substitute for DOM focus. A menu /
    // menubar / tree that really moves focus onto the item must not also
    // publish it, or the widget reports two different active elements.
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <div kjTestListRoot kjListNavigator [kjFocusMode]="'roving'">
          <div role="menuitem" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="menuitem" kjListItem id="b" [kjItemValue]="'b'">B</div>
        </div>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    fixture.detectChanges();
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);

    (container.querySelector('#a') as HTMLElement).focus();
    press(host, fixture, 'ArrowDown');

    expect(container.querySelector('#b')!.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement?.id, 'focus is the active signal here').toBe('b');
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('roving mode: disabled items get -1 even when first; first navigable seeded', async () => {
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <div kjTestListRoot kjListNavigator [kjFocusMode]="'roving'">
          <div role="option" aria-selected="false" kjListItem id="a" [kjDisabled]="true" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
          <div role="option" aria-selected="false" kjListItem id="c" [kjItemValue]="'c'">C</div>
        </div>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    fixture.detectChanges();
    const a = container.querySelector('#a')!;
    const b = container.querySelector('#b')!;
    const c = container.querySelector('#c')!;
    // Disabled first item: tabindex=-1, first navigable (b) gets 0.
    expect(a.getAttribute('tabindex')).toBe('-1');
    expect(b.getAttribute('tabindex')).toBe('0');
    expect(c.getAttribute('tabindex')).toBe('-1');
  });

  it('roving mode: setActive(id) moves focus to that item\'s host element', async () => {
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <div kjTestListRoot kjListNavigator [kjFocusMode]="'roving'">
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
        </div>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    fixture.detectChanges();
    const nav = fixture.debugElement.query(By.directive(KjListNavigator)).injector.get(KjListNavigator);
    const b = container.querySelector('#b') as HTMLElement;
    nav.setActive('b');
    fixture.detectChanges();
    expect(document.activeElement).toBe(b);
    expect(b.getAttribute('tabindex')).toBe('0');
  });
});

describe('KjListNavigator roving focus semantics', () => {
  it('the first-render seed makes an item tabbable without moving focus', async () => {
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <input id="before" />
        <div kjTestListRoot kjListNavigator [kjFocusMode]="'roving'">
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
        </div>
      `,
    })
    class Host {}
    (document.activeElement as HTMLElement | null)?.blur?.();
    const { container, fixture } = await render(Host);
    fixture.detectChanges();
    expect(container.querySelector('#a')!.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(document.body);
  });

  it('keyboard navigation moves focus; focusActive() re-focuses the active item without a change', async () => {
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <div kjTestListRoot kjListNavigator [kjFocusMode]="'roving'">
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
        </div>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    fixture.detectChanges();
    const nav = fixture.debugElement.query(By.directive(KjListNavigator)).injector.get(KjListNavigator);
    const a = container.querySelector('#a') as HTMLElement;
    const b = container.querySelector('#b') as HTMLElement;
    a.focus();
    press(a, fixture, 'ArrowDown');
    expect(document.activeElement).toBe(b);
    // Focus wanders off (a dialog, a click elsewhere) while `b` stays active…
    b.blur();
    expect(document.activeElement).toBe(document.body);
    // …and `focusActive()` brings it back even though the active id did not change.
    nav.focusActive();
    expect(document.activeElement).toBe(b);
  });

  it('focusing an item by pointer / Tab re-syncs the active id so the next arrow key moves from there', async () => {
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <div kjTestListRoot kjListNavigator [kjFocusMode]="'roving'">
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B<span id="inner" tabindex="-1">!</span></div>
          <div role="option" aria-selected="false" kjListItem id="c" [kjItemValue]="'c'">C</div>
        </div>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    fixture.detectChanges();
    const nav = fixture.debugElement.query(By.directive(KjListNavigator)).injector.get(KjListNavigator);
    // A control inside a row focuses the row it belongs to.
    (container.querySelector('#inner') as HTMLElement).focus();
    fixture.detectChanges();
    expect(nav.activeId()).toBe('b');
    const c = container.querySelector('#c') as HTMLElement;
    c.focus();
    press(c, fixture, 'ArrowUp');
    expect(document.activeElement).toBe(container.querySelector('#b'));
  });

  it('KJ_LIST_FOCUS_MODE_DEFAULT on the host pins the composed navigator to roving', async () => {
    @Directive({
      selector: '[kjTestRovingHost]',
      standalone: true,
      hostDirectives: [KjListNavigator],
      providers: [{ provide: KJ_LIST_FOCUS_MODE_DEFAULT, useValue: 'roving' }],
    })
    class RovingHost {}
    @Component({
      standalone: true,
      imports: [KjListItem, TestListRoot, RovingHost],
      template: `
        <div kjTestListRoot kjTestRovingHost>
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
        </div>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    fixture.detectChanges();
    const host = container.querySelector('[kjTestRovingHost]') as HTMLElement;
    expect(container.querySelector('#a')!.getAttribute('tabindex')).toBe('0');
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('KJ_LIST_NAVIGATOR_ITEMS on the host scopes the navigable set to that navigator', async () => {
    @Directive({
      selector: '[kjTestScopedHost]',
      standalone: true,
      hostDirectives: [KjListNavigator],
      providers: [
        {
          provide: KJ_LIST_NAVIGATOR_ITEMS,
          useFactory: () => {
            const all = inject(KJ_LIST_NAVIGATOR_CONFIG).items;
            return computed(() => all().filter(i => i.id !== 'b'));
          },
        },
      ],
    })
    class ScopedHost {}
    @Component({
      standalone: true,
      imports: [KjListItem, TestListRoot, ScopedHost],
      template: `
        <div kjTestListRoot kjTestScopedHost>
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
          <div role="option" aria-selected="false" kjListItem id="c" [kjItemValue]="'c'">C</div>
        </div>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    const host = container.querySelector('[kjTestScopedHost]') as HTMLElement;
    press(host, fixture, 'ArrowDown');
    press(host, fixture, 'ArrowDown');
    expect(host.getAttribute('aria-activedescendant')).toBe('c');
  });

  it('never touches DOM focus when rendered on the server platform', async () => {
    @Component({
      standalone: true,
      imports: [KjListNavigator, KjListItem, TestListRoot],
      template: `
        <div kjTestListRoot kjListNavigator [kjFocusMode]="'roving'">
          <div role="option" aria-selected="false" kjListItem id="a" [kjItemValue]="'a'">A</div>
          <div role="option" aria-selected="false" kjListItem id="b" [kjItemValue]="'b'">B</div>
        </div>
      `,
    })
    class Host {}
    (document.activeElement as HTMLElement | null)?.blur?.();
    const { fixture } = await render(Host, { providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    fixture.detectChanges();
    const nav = fixture.debugElement.query(By.directive(KjListNavigator)).injector.get(KjListNavigator);
    nav.setActive('b');
    fixture.detectChanges();
    nav.focusActive();
    // The active id still moves (it drives `tabindex` in the server markup) …
    expect(nav.activeId()).toBe('b');
    // … but nothing is focused: there is no live document to focus into.
    expect(document.activeElement).toBe(document.body);
  });

  it('ignores a key a nested navigator already consumed', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container, fixture } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    const e = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    e.preventDefault();
    host.dispatchEvent(e);
    fixture.detectChanges();
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);
  });
});

describe('KjListNavigator — windowed cursor (perf F-4)', () => {
  /**
   * A dataset of 5 000 rows of which only a window is ever "rendered". The
   * source records where the navigator moved the cursor, which is the whole
   * contract: the navigator must address dataset indices, not the rows in
   * the DOM.
   */
  function virtualSetup(opts: { wrap?: boolean; disabled?: ReadonlySet<number> } = {}) {
    const count = signal(5000);
    const cursor = signal(-1);
    const disabled = opts.disabled ?? new Set<number>();
    const activated: number[] = [];
    const scrolledTo: number[] = [];
    const virtual = signal({
      count,
      activeIndex: cursor.asReadonly(),
      isNavigable: (i: number) => i >= 0 && i < count() && !disabled.has(i),
      setActiveIndex: (i: number) => {
        cursor.set(i);
        scrolledTo.push(i);
      },
      activateIndex: (i: number) => { activated.push(i); },
    });
    const wrapAttr = opts.wrap === false ? ` [kjWrap]="false"` : '';
    return render(`<div kjListNavigator${wrapAttr}></div>`, {
      imports: [KjListNavigator],
      providers: [
        KjTypeAhead,
        {
          provide: KJ_LIST_NAVIGATOR_CONFIG,
          // `items` is the rendered window: empty here, which is exactly the
          // case the rendered-item walk could never handle.
          useValue: { items: signal([]), virtual },
        },
      ],
    }).then(result => ({ result, cursor, activated, scrolledTo, count }));
  }

  const nav = (result: RenderResult<unknown>): KjListNavigator =>
    result.fixture.debugElement.query(By.directive(KjListNavigator)).injector.get(KjListNavigator);
  const key = (result: RenderResult<unknown>, k: string): void => {
    const host = result.fixture.debugElement.query(By.directive(KjListNavigator)).nativeElement as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  };

  it('ArrowDown from nothing lands on the first row of the dataset', async () => {
    const { result, cursor } = await virtualSetup();
    key(result, 'ArrowDown');
    expect(cursor()).toBe(0);
  });

  it('End reaches the last row although none of them is rendered', async () => {
    const { result, cursor, scrolledTo } = await virtualSetup();
    key(result, 'End');
    expect(cursor()).toBe(4999);
    expect(scrolledTo).toEqual([4999]);
  });

  it('Home comes back to the first row', async () => {
    const { result, cursor } = await virtualSetup();
    key(result, 'End');
    key(result, 'Home');
    expect(cursor()).toBe(0);
  });

  it('PageDown moves by the page size in dataset indices', async () => {
    const { result, cursor } = await virtualSetup();
    key(result, 'ArrowDown');
    key(result, 'PageDown');
    expect(cursor()).toBe(10);
  });

  it('wraps at both ends when kjWrap is on', async () => {
    const { result, cursor } = await virtualSetup();
    key(result, 'ArrowUp');
    expect(cursor()).toBe(4999);
    key(result, 'ArrowDown');
    expect(cursor()).toBe(0);
  });

  it('clamps instead of wrapping when kjWrap is off', async () => {
    const { result, cursor } = await virtualSetup({ wrap: false });
    // Same rule the rendered-item path applies: moving backward from "nothing
    // active" starts one past the end, so ArrowUp lands on the last row.
    key(result, 'ArrowUp');
    expect(cursor()).toBe(4999);
    key(result, 'ArrowDown');
    expect(cursor(), 'clamped at the end, not wrapped to the top').toBe(4999);
    key(result, 'Home');
    key(result, 'ArrowUp');
    expect(cursor(), 'clamped at the start, not wrapped to the end').toBe(0);
  });

  it('skips rows the source reports as not navigable', async () => {
    const { result, cursor } = await virtualSetup({ disabled: new Set([1, 2, 3]) });
    key(result, 'ArrowDown');
    expect(cursor()).toBe(0);
    key(result, 'ArrowDown');
    expect(cursor()).toBe(4);
  });

  it('Enter activates the row the cursor is on, not a rendered item', async () => {
    const { result, activated } = await virtualSetup();
    key(result, 'End');
    key(result, 'Enter');
    expect(activated).toEqual([4999]);
  });

  it('Enter does nothing while the cursor is unset, so a free-text consumer can take it', async () => {
    const { result, activated } = await virtualSetup();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    (result.fixture.debugElement.query(By.directive(KjListNavigator)).nativeElement as HTMLElement)
      .dispatchEvent(event);
    expect(activated).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('terminates instead of spinning when every row is disabled', async () => {
    const all = new Set(Array.from({ length: 5000 }, (_, i) => i));
    const { result, cursor } = await virtualSetup({ disabled: all });
    key(result, 'ArrowDown');
    expect(cursor()).toBe(-1);
    expect(nav(result).activeId()).toBeNull();
  });

  // arch F-2 — `kjWrap` and `kjActivateOnHover` were `input<boolean>(…)`, so
  // `kjWrap="false"` bound the truthy string 'false' and kept wrapping on.
  describe('bare boolean attributes (arch F-2)', () => {
    it('kjWrap="false" clamps at the ends instead of wrapping', async () => {
      const items = [fakeItem('a', 'Alpha'), fakeItem('b', 'Bravo')];
      const { container, fixture } = await render(
        `<div kjListNavigator kjWrap="false"></div>`,
        {
          imports: [KjListNavigator],
          providers: [
            KjTypeAhead,
            { provide: KJ_LIST_NAVIGATOR_CONFIG, useValue: { items: signal(items) } },
          ],
        },
      );
      const host = container.querySelector('[kjListNavigator]') as HTMLElement;
      const nav = fixture.debugElement
        .query(By.directive(KjListNavigator))
        .injector.get(KjListNavigator);
      press(host, fixture, 'ArrowDown');
      press(host, fixture, 'ArrowDown');
      press(host, fixture, 'ArrowDown');
      expect(nav.activeId()).toBe('b');
    });

    it('a bare kjWrap attribute keeps wrapping on', async () => {
      const items = [fakeItem('a', 'Alpha'), fakeItem('b', 'Bravo')];
      const { container, fixture } = await render(
        `<div kjListNavigator kjWrap></div>`,
        {
          imports: [KjListNavigator],
          providers: [
            KjTypeAhead,
            { provide: KJ_LIST_NAVIGATOR_CONFIG, useValue: { items: signal(items) } },
          ],
        },
      );
      const host = container.querySelector('[kjListNavigator]') as HTMLElement;
      const nav = fixture.debugElement
        .query(By.directive(KjListNavigator))
        .injector.get(KjListNavigator);
      press(host, fixture, 'ArrowDown');
      press(host, fixture, 'ArrowDown');
      press(host, fixture, 'ArrowDown');
      expect(nav.activeId()).toBe('a');
    });
  });
});
