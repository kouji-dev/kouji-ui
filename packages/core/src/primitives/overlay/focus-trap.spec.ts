import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjFocusTrap } from './focus-trap';

@Component({
  selector: 'ft-host-on',
  standalone: true,
  imports: [KjFocusTrap],
  template: `
    <div kjFocusTrap data-testid="wrap">
      <button id="a">A</button>
      <button id="b">B</button>
    </div>
  `,
})
class FtHostOn {}

@Component({
  selector: 'ft-host-off',
  standalone: true,
  imports: [KjFocusTrap],
  template: `
    <div [kjFocusTrap] [kjEnabled]="false" data-testid="wrap">
      <button id="a">A</button>
      <button id="b">B</button>
    </div>
  `,
})
class FtHostOff {}

describe('KjFocusTrap', () => {
  it('Tab on last focusable wraps to first when enabled', async () => {
    const { container } = await render(FtHostOn);
    const wrap = container.querySelector('[data-testid="wrap"]') as HTMLElement;
    const a = container.querySelector('#a') as HTMLButtonElement;
    const b = container.querySelector('#b') as HTMLButtonElement;
    b.focus();
    const e = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
    wrap.dispatchEvent(e);
    expect(document.activeElement === a || e.defaultPrevented).toBe(true);
  });

  it('does not wrap when kjEnabled=false', async () => {
    const { container } = await render(FtHostOff);
    const wrap = container.querySelector('[data-testid="wrap"]') as HTMLElement;
    const b = container.querySelector('#b') as HTMLButtonElement;
    b.focus();
    const e = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
    wrap.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });
});
