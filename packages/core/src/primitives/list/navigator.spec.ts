// packages/core/src/primitives/list/navigator.spec.ts
import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjListNavigator } from './navigator';
import { KjTypeAhead } from './type-ahead';
import { KJ_LIST_NAVIGATOR_CONFIG } from './tokens';
import type { KjListItem } from './item';

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

describe('KjListNavigator', () => {
  it('starts with no active item', async () => {
    const { container } = await setup([fakeItem('1', 'A'), fakeItem('2', 'B')]);
    const host = container.querySelector('[kjListNavigator]')!;
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('ArrowDown moves to next item, wraps past last when kjWrap=true', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
  });

  it('ArrowUp wraps to last item from first', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
  });

  it('skips disabled items during navigation', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B', true), fakeItem('3', 'C')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('3');
  });

  it('Home moves to first, End moves to last', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B'), fakeItem('3', 'C')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('3');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
  });

  it('Enter calls _activate on the current item and preventDefaults', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    host.dispatchEvent(e);
    expect((items[0] as any).activated).toBe(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('Enter does NOT preventDefault when there is no active item', async () => {
    const items = [fakeItem('1', 'A')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    host.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect((items[0] as any).activated).toBe(0);
  });

  it('Space activates current item', async () => {
    const items = [fakeItem('1', 'A')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect((items[0] as any).activated).toBe(1);
  });

  it('PageDown moves by kjPageSize (default 10)', async () => {
    const items = Array.from({ length: 15 }, (_, i) => fakeItem(String(i + 1), 'Item ' + (i + 1)));
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('11');
  });

  it('delegates single-char keys to KjTypeAhead and activates the match', async () => {
    const items = [fakeItem('1', 'Apple'), fakeItem('2', 'Banana')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
  });

  it('kjOrientation="horizontal" responds to ArrowLeft/Right not Up/Down', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container } = await setup(items, { orientation: 'horizontal' });
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
  });

  it('kjWrap=false clamps at last item instead of wrapping', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container } = await setup(items, { wrap: false });
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
  });
});
