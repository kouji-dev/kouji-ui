import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjFocusTrap } from './focus-trap';

describe('KjFocusTrap', () => {
  it('Tab on last focusable wraps to first when enabled', async () => {
    @Component({
      standalone: true,
      imports: [KjFocusTrap],
      template: `
        <div kjFocusTrap>
          <button id="a">A</button>
          <button id="b">B</button>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const a = container.querySelector('#a') as HTMLButtonElement;
    const b = container.querySelector('#b') as HTMLButtonElement;
    b.focus();
    const wrap = container.querySelector('[kjFocusTrap]') as HTMLElement;
    const e = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
    wrap.dispatchEvent(e);
    expect(document.activeElement === a || e.defaultPrevented).toBe(true);
  });

  it('does not wrap when kjEnabled=false', async () => {
    @Component({
      standalone: true,
      imports: [KjFocusTrap],
      template: `
        <div [kjFocusTrap] kjEnabled="false">
          <button id="a">A</button>
          <button id="b">B</button>
        </div>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const b = container.querySelector('#b') as HTMLButtonElement;
    b.focus();
    const wrap = container.querySelector('[kjFocusTrap]') as HTMLElement;
    const e = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
    wrap.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });
});
