import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjPopoverTrigger } from './popover-trigger';
import { KjPopoverContent } from './popover-content';

describe('KjPopover', () => {
  it('trigger has aria-haspopup=dialog and aria-expanded=false initially', async () => {
    @Component({
      selector: 'pop-host',
      standalone: true,
      imports: [KjPopoverTrigger, KjPopoverContent],
      template: `
        <button kjPopoverTrigger #t="kjPopoverTrigger">Open</button>
        <kj-popover-content [kjFor]="t">Hi</kj-popover-content>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('panel has role=dialog and is hidden initially', async () => {
    @Component({
      selector: 'pop-host',
      standalone: true,
      imports: [KjPopoverTrigger, KjPopoverContent],
      template: `
        <button kjPopoverTrigger #t="kjPopoverTrigger">Open</button>
        <kj-popover-content [kjFor]="t">Hi</kj-popover-content>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const panel = container.querySelector('kj-popover-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('kjTrigger="hover" keeps role=dialog and aria-haspopup=dialog', async () => {
    @Component({
      selector: 'pop-host',
      standalone: true,
      imports: [KjPopoverTrigger, KjPopoverContent],
      template: `
        <button kjPopoverTrigger kjTrigger="hover" #t="kjPopoverTrigger">Open</button>
        <kj-popover-content [kjFor]="t">Hi</kj-popover-content>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const btn = container.querySelector('button')!;
    const panel = container.querySelector('kj-popover-content') as HTMLElement;
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(panel.getAttribute('role')).toBe('dialog');
  });
});
