import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjSelect, KjSelectTrigger, KjSelectContent, KjOption } from './select';

describe('KjSelect', () => {
  it('panel exposes role=listbox', async () => {
    @Component({
      selector: 'sel-host',
      standalone: true,
      imports: [KjSelect, KjSelectTrigger, KjSelectContent, KjOption],
      template: `
        <div kjSelect>
          <button kjSelectTrigger #t="kjSelectTrigger">Open</button>
          <kj-select-content [kjFor]="t">
            <div kjOption [kjOptionValue]="'a'">A</div>
          </kj-select-content>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const panel = container.querySelector('kj-select-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('listbox');
  });

  it('trigger advertises aria-haspopup=listbox', async () => {
    @Component({
      selector: 'sel-host',
      standalone: true,
      imports: [KjSelect, KjSelectTrigger, KjSelectContent, KjOption],
      template: `
        <div kjSelect>
          <button kjSelectTrigger #t="kjSelectTrigger">Open</button>
          <kj-select-content [kjFor]="t">
            <div kjOption [kjOptionValue]="'a'">A</div>
          </kj-select-content>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('aria-haspopup')).toBe('listbox');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('panel reflects aria-multiselectable when kjMultiple is set on trigger', async () => {
    @Component({
      selector: 'sel-host',
      standalone: true,
      imports: [KjSelect, KjSelectTrigger, KjSelectContent, KjOption],
      template: `
        <div kjSelect>
          <button kjSelectTrigger kjMultiple #t="kjSelectTrigger">Open</button>
          <kj-select-content [kjFor]="t">
            <div kjOption [kjOptionValue]="'a'">A</div>
            <div kjOption [kjOptionValue]="'b'">B</div>
          </kj-select-content>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const panel = container.querySelector('kj-select-content') as HTMLElement;
    expect(panel.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('panel omits aria-multiselectable in single mode', async () => {
    @Component({
      selector: 'sel-host',
      standalone: true,
      imports: [KjSelect, KjSelectTrigger, KjSelectContent, KjOption],
      template: `
        <div kjSelect>
          <button kjSelectTrigger #t="kjSelectTrigger">Open</button>
          <kj-select-content [kjFor]="t">
            <div kjOption [kjOptionValue]="'a'">A</div>
          </kj-select-content>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const panel = container.querySelector('kj-select-content') as HTMLElement;
    expect(panel.hasAttribute('aria-multiselectable')).toBe(false);
  });

  it('options carry role=option', async () => {
    @Component({
      selector: 'sel-host',
      standalone: true,
      imports: [KjSelect, KjSelectTrigger, KjSelectContent, KjOption],
      template: `
        <div kjSelect>
          <button kjSelectTrigger #t="kjSelectTrigger">Open</button>
          <kj-select-content [kjFor]="t">
            <div kjOption [kjOptionValue]="'a'">A</div>
            <div kjOption [kjOptionValue]="'b'">B</div>
          </kj-select-content>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const opts = container.querySelectorAll('[kjOption]');
    expect(opts.length).toBe(2);
    opts.forEach(o => expect(o.getAttribute('role')).toBe('option'));
  });
});
