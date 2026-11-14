import { Component, signal } from '@angular/core';
import { render, fireEvent } from '@testing-library/angular';
import { afterEach, describe, it, expect } from 'vitest';
import {
  KjCombobox,
  KjComboboxInput,
  KjComboboxListbox,
  KjComboboxOption,
} from './combobox';

describe('KjCombobox', () => {
  it('input has role=combobox and aria-haspopup=listbox', async () => {
    @Component({
      selector: 'kj-cb-host',
      standalone: true,
      imports: [KjCombobox, KjComboboxInput, KjComboboxListbox, KjComboboxOption],
      template: `
        <div kjCombobox>
          <input kjComboboxInput #t="kjOverlayTrigger" aria-label="Country" />
          <div kjComboboxListbox [kjFor]="t">
            <button kjComboboxOption [kjOptionValue]="'fr'">France</button>
          </div>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const input = container.querySelector('input[kjComboboxInput]')!;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-haspopup')).toBe('listbox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('panel exposes role=listbox', async () => {
    @Component({
      selector: 'kj-cb-host',
      standalone: true,
      imports: [KjCombobox, KjComboboxInput, KjComboboxListbox, KjComboboxOption],
      template: `
        <div kjCombobox>
          <input kjComboboxInput #t="kjOverlayTrigger" aria-label="Country" />
          <div kjComboboxListbox [kjFor]="t">
            <button kjComboboxOption [kjOptionValue]="'fr'">France</button>
          </div>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const panel = container.querySelector('[kjComboboxListbox]') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('listbox');
  });

  it('options carry role=option', async () => {
    @Component({
      selector: 'kj-cb-host',
      standalone: true,
      imports: [KjCombobox, KjComboboxInput, KjComboboxListbox, KjComboboxOption],
      template: `
        <div kjCombobox>
          <input kjComboboxInput #t="kjOverlayTrigger" aria-label="Country" />
          <div kjComboboxListbox [kjFor]="t">
            <button kjComboboxOption [kjOptionValue]="'fr'">France</button>
            <button kjComboboxOption [kjOptionValue]="'de'">Germany</button>
          </div>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const opts = container.querySelectorAll('[kjComboboxOption]');
    expect(opts.length).toBe(2);
    opts.forEach(o => expect(o.getAttribute('role')).toBe('option'));
  });
});

/**
 * arch F-13 — `KjComboboxInput` hands its composed `KjListNavigator` to the
 * root from its constructor (it is composed on the same element, so it exists
 * by then) instead of from `ngOnInit`. Without the handover the root's
 * `activeId()` stays null and no option is ever marked active.
 */
describe('KjCombobox navigator handover', () => {
  afterEach(() => {
    document.querySelectorAll('.kj-overlay-wrapper').forEach((el) => el.remove());
  });

  it('ArrowDown marks the first option active', async () => {
    @Component({
      selector: 'kj-cb-host',
      standalone: true,
      imports: [KjCombobox, KjComboboxInput, KjComboboxListbox, KjComboboxOption],
      template: `
        <div kjCombobox>
          <input kjComboboxInput #t="kjOverlayTrigger" aria-label="Country" />
          <div kjComboboxListbox [kjFor]="t">
            <button kjComboboxOption [kjOptionValue]="'fr'">France</button>
            <button kjComboboxOption [kjOptionValue]="'de'">Germany</button>
          </div>
        </div>
      `,
    })
    class Host {}

    const { container, fixture } = await render(Host);
    const input = container.querySelector<HTMLInputElement>('input[kjComboboxInput]')!;
    input.focus();
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    fixture.detectChanges();

    const active = document.querySelectorAll('[kjComboboxOption][data-active]');
    expect(active.length).toBe(1);
  });
});

/**
 * A combobox that already holds a value: the list it opens must show every
 * option with the picked one under the cursor, and the field must read the
 * picked row's name. Only text the user typed since the last open or pick
 * filters the list.
 */
describe('KjCombobox with a picked value', () => {
  afterEach(() => {
    document.querySelectorAll('.kj-overlay-wrapper').forEach((el) => el.remove());
  });

  async function setup(initial: unknown) {
    @Component({
      selector: 'kj-cb-host',
      standalone: true,
      imports: [KjCombobox, KjComboboxInput, KjComboboxListbox, KjComboboxOption],
      template: `
        <div kjCombobox [(kjValue)]="value">
          <input kjComboboxInput #t="kjOverlayTrigger" aria-label="Country" />
          <div kjComboboxListbox [kjFor]="t">
            <button kjComboboxOption [kjOptionValue]="'fr'">France</button>
            <button kjComboboxOption [kjOptionValue]="'de'">Germany</button>
            <button kjComboboxOption [kjOptionValue]="'it'">Italy</button>
          </div>
        </div>
      `,
    })
    class Host { value = signal<unknown>(initial); }

    const r = await render(Host);
    const input = r.container.querySelector<HTMLInputElement>('input[kjComboboxInput]')!;
    const settle = async () => {
      r.fixture.detectChanges();
      await r.fixture.whenStable();
      await new Promise((res) => setTimeout(res, 0));
      r.fixture.detectChanges();
    };
    const type = async (text: string) => {
      input.value = text;
      fireEvent.input(input);
      await settle();
    };
    await settle();
    return { input, settle, type, host: r.fixture.componentInstance };
  }

  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[kjComboboxOption]'));
  const text = (o: HTMLElement) => (o.textContent ?? '').trim();
  const listed = () => options().filter((o) => !o.hidden).map(text);
  const active = () => options().filter((o) => o.hasAttribute('data-active')).map(text);
  const ALL = ['France', 'Germany', 'Italy'];

  it('a preset value shows its row text in the field, read from the row once it renders', async () => {
    const { input } = await setup('de');
    expect(input.value).toBe('Germany');
  });

  it('opening puts the cursor on the picked row, not the first one', async () => {
    const { input, settle } = await setup('it');
    input.focus();
    await settle();
    expect(listed()).toEqual(ALL);
    expect(active()).toEqual(['Italy']);
  });

  it('pick, reopen: every option is listed again and the field still reads the pick', async () => {
    const { input, settle, host } = await setup(null);
    input.focus();
    await settle();
    options()[2].click();
    await settle();
    expect(host.value()).toBe('it');
    expect(input.value).toBe('Italy');

    fireEvent.click(input);
    await settle();
    expect(listed()).toEqual(ALL);
    expect(active()).toEqual(['Italy']);
    expect(input.value).toBe('Italy');
  });

  it('clearing the field while a value is set lists every option and keeps the field empty', async () => {
    const { input, settle, type, host } = await setup(null);
    input.focus();
    await settle();
    options()[1].click();
    await settle();
    expect(input.value).toBe('Germany');
    fireEvent.click(input);
    await settle();
    await type('');
    expect(input.value).toBe('');
    expect(listed()).toEqual(ALL);

    // close and reopen: still empty, still everything
    fireEvent.keyDown(input, { key: 'Escape' });
    await settle();
    fireEvent.click(input);
    await settle();
    expect(input.value).toBe('');
    expect(listed()).toEqual(ALL);
    expect(host.value()).toBe('de');
  });

  it('typing filters and puts the cursor on the first match; Enter picks it', async () => {
    const { input, settle, type, host } = await setup('fr');
    input.focus();
    await settle();
    await type('ital');
    expect(listed()).toEqual(['Italy']);
    expect(active()).toEqual(['Italy']);
    fireEvent.keyDown(input, { key: 'Enter' });
    await settle();
    expect(host.value()).toBe('it');
    expect(input.value).toBe('Italy');
  });

  it('a value set from outside rewrites the field', async () => {
    const { input, settle, host } = await setup('fr');
    host.value.set('it');
    await settle();
    expect(input.value).toBe('Italy');
  });
});
