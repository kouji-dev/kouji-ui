import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjPopoverTrigger } from './popover-trigger';
import { KjPopoverContent } from './popover-content';

describe('KjPopover', () => {
  it('trigger has aria-haspopup=dialog and aria-expanded=false initially', async () => {
    @Component({
      selector: 'kj-pop-host',
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
      selector: 'kj-pop-host',
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
      selector: 'kj-pop-host',
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

  it('kjTrigger="hover" opens on pointerenter and on focus, not on a bare click while open', async () => {
    @Component({
      selector: 'kj-pop-host',
      standalone: true,
      imports: [KjPopoverTrigger, KjPopoverContent],
      template: `
        <button
          kjPopoverTrigger
          kjTrigger="hover"
          [kjOpenDelay]="0"
          [kjCloseDelay]="0"
          #t="kjPopoverTrigger"
        >
          Open
        </button>
        <kj-popover-content [kjFor]="t">Hi</kj-popover-content>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    const btn = container.querySelector('button')!;
    btn.dispatchEvent(new Event('pointerenter'));
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    // An open-only click keeps it open (touch fallback never toggles closed).
    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('kjTrigger="click" (default) toggles on click', async () => {
    @Component({
      selector: 'kj-pop-host',
      standalone: true,
      imports: [KjPopoverTrigger, KjPopoverContent],
      template: `
        <button kjPopoverTrigger #t="kjPopoverTrigger">Open</button>
        <kj-popover-content [kjFor]="t">Hi</kj-popover-content>
      `,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    const btn = container.querySelector('button')!;
    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});
