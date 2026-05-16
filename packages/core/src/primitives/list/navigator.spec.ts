// packages/core/src/primitives/list/navigator.spec.ts
import { Component, Directive, contentChildren, forwardRef, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { render, type RenderResult } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjListNavigator } from './navigator';
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
