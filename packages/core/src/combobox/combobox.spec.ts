import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import {
  KjCombobox,
  KjComboboxInput,
  KjComboboxListbox,
  KjComboboxOption,
} from './combobox';

describe('KjCombobox', () => {
  it('input has role=combobox and aria-haspopup=listbox', async () => {
    @Component({
      selector: 'cb-host',
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
      selector: 'cb-host',
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
      selector: 'cb-host',
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
