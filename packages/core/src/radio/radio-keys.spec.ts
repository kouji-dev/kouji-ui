import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjButton } from '../button/button';
import { KjRadioKeys } from './radio-keys';

expect.extend(toHaveNoViolations);

/** Dispatches `key` from the element that really has focus, as a user would. */
function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
}

/** Lets the group's MutationObserver re-seat the tab stop. */
const settle = () => new Promise((r) => setTimeout(r));

@Component({
  imports: [KjRadioKeys, KjButton],
  template: `
    <div role="radiogroup" aria-label="Size" kjRadioKeys [attr.dir]="dir()">
      @for (v of opts; track v) {
        <button kjButton type="button" role="radio"
          [attr.aria-checked]="v === pick()"
          [kjDisabled]="v === 'off'"
          (click)="pick.set(v)">{{ v }}</button>
      }
      <button type="button" role="radio" aria-checked="false" disabled>native</button>
    </div>
  `,
})
class ButtonGroupHost {
  readonly opts = ['a', 'b', 'off', 'c'];
  readonly pick = signal<string | undefined>('a');
  readonly dir = signal<string | null>(null);
}

async function setup(pick: string | undefined = 'a') {
  const r = await render(ButtonGroupHost);
  r.fixture.componentInstance.pick.set(pick);
  r.detectChanges();
  await settle();
  const radios = r.getAllByRole('radio');
  const byName = (n: string) => radios.find((b) => b.textContent!.trim() === n)!;
  return { ...r, host: r.fixture.componentInstance, byName };
}

describe('KjRadioKeys — beside kjButton', () => {
  it('renders kjButton items without a duplicate-directive error (NG0309)', async () => {
    const { byName } = await setup();
    // kjButton's own focus ring is the only one on the element.
    expect(byName('a')).toHaveAttribute('role', 'radio');
    expect(byName('a')).not.toHaveAttribute('data-checked');
  });

  it('ArrowRight / ArrowDown pick the next option and move the focus to it', async () => {
    const { host, byName, detectChanges } = await setup();
    byName('a').focus();
    const e = press('ArrowRight');
    detectChanges();
    expect(host.pick()).toBe('b');
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byName('b'));
    expect(byName('b')).toHaveAttribute('aria-checked', 'true');
    expect(byName('a')).toHaveAttribute('aria-checked', 'false');
    press('ArrowDown');
    detectChanges();
    expect(host.pick()).toBe('c');
  });

  it('ArrowLeft / ArrowUp pick the previous option, wrapping at both ends', async () => {
    const { host, byName, detectChanges } = await setup();
    byName('a').focus();
    press('ArrowLeft');
    detectChanges();
    expect(host.pick()).toBe('c');
    press('ArrowRight');
    detectChanges();
    expect(host.pick()).toBe('a');
    press('ArrowUp');
    detectChanges();
    expect(host.pick()).toBe('c');
  });

  it('skips aria-disabled (kjDisabled) and natively disabled options', async () => {
    const { host, byName, detectChanges } = await setup('b');
    byName('b').focus();
    press('ArrowRight');
    detectChanges();
    expect(host.pick()).toBe('c');
    press('ArrowRight');
    detectChanges();
    expect(host.pick()).toBe('a');
  });

  it('Home / End pick the first / last enabled option', async () => {
    const { host, byName, detectChanges } = await setup('b');
    byName('b').focus();
    press('End');
    detectChanges();
    expect(host.pick()).toBe('c');
    expect(document.activeElement).toBe(byName('c'));
    press('Home');
    detectChanges();
    expect(host.pick()).toBe('a');
  });

  it('leaves other keys and modified arrows alone', async () => {
    const { host, byName } = await setup();
    byName('a').focus();
    expect(press('x').defaultPrevented).toBe(false);
    expect(press('ArrowRight', { shiftKey: true }).defaultPrevented).toBe(false);
    expect(press('ArrowRight', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(host.pick()).toBe('a');
  });

  it('swaps ArrowLeft / ArrowRight under dir="rtl"', async () => {
    const { host, byName, detectChanges } = await setup();
    host.dir.set('rtl');
    detectChanges();
    byName('a').focus();
    press('ArrowLeft');
    detectChanges();
    expect(host.pick()).toBe('b');
  });

  it('is one Tab stop: the checked option has tabindex 0, the rest -1', async () => {
    const { byName } = await setup('b');
    expect(byName('b')).toHaveAttribute('tabindex', '0');
    for (const n of ['a', 'off', 'c', 'native']) expect(byName(n)).toHaveAttribute('tabindex', '-1');
  });

  it('moves the tab stop with the selection, however it changed', async () => {
    const { host, byName, detectChanges } = await setup();
    byName('c').click();
    detectChanges();
    await settle();
    expect(host.pick()).toBe('c');
    expect(byName('c')).toHaveAttribute('tabindex', '0');
    expect(byName('a')).toHaveAttribute('tabindex', '-1');
  });

  it('with nothing checked, the first enabled option is the tab stop', async () => {
    const { byName } = await setup(undefined);
    expect(byName('a')).toHaveAttribute('tabindex', '0');
    expect(byName('b')).toHaveAttribute('tabindex', '-1');
  });

  it('passes axe audit', async () => {
    const { container } = await setup();
    expect(await axe(container)).toHaveNoViolations();
  });
});

@Component({
  imports: [KjRadioKeys, KjButton],
  template: `
    <div role="radiogroup" aria-label="Answer" kjRadioKeys="button.opt">
      @for (v of opts; track v) {
        <button kjButton type="button" class="opt" (click)="pick.set(v)">
          <span role="radio" [attr.aria-checked]="v === pick()" aria-hidden="true"></span>{{ v }}
        </button>
      }
    </div>
  `,
})
class WrappedRowsHost {
  readonly opts = ['x', 'y', 'z'];
  readonly pick = signal('y');
}

describe('KjRadioKeys — options named by a selector', () => {
  it('drives the rows that wrap a radio mark, and seats the tab stop on the checked row', async () => {
    const r = await render(WrappedRowsHost);
    await r.fixture.whenStable();
    await settle();
    const rows = Array.from(r.container.querySelectorAll<HTMLElement>('button.opt'));
    expect(rows.map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    rows[1].focus();
    press('ArrowDown');
    r.detectChanges();
    expect(r.fixture.componentInstance.pick()).toBe('z');
    expect(document.activeElement).toBe(rows[2]);
  });
});
