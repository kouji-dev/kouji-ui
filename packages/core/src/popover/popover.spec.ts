import { Component, signal } from '@angular/core';
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

  it('kjTrap cycles Tab inside the panel and Escape returns focus to the trigger', async () => {
    @Component({
      selector: 'kj-pop-host',
      standalone: true,
      imports: [KjPopoverTrigger, KjPopoverContent],
      template: `
        <button kjPopoverTrigger #t="kjPopoverTrigger" id="trigger">Open</button>
        <kj-popover-content [kjFor]="t" kjTrap data-test="trapped">
          <button id="a">a</button>
          <button id="b">b</button>
        </kj-popover-content>
      `,
    })
    class Trapped {}
    const settle = () => new Promise((r) => setTimeout(r, 40));
    const pressKey = (key: string, shiftKey = false) =>
      (document.activeElement ?? document.body).dispatchEvent(
        new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
      );

    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    const { fixture } = await render(Trapped);
    const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLButtonElement;
    const panel = fixture.nativeElement.querySelector('kj-popover-content[data-test="trapped"]') as HTMLElement;
    const a = panel.querySelector<HTMLElement>('#a')!;
    const b = panel.querySelector<HTMLElement>('#b')!;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(panel.getAttribute('data-state')).toBe('open');
    expect(document.activeElement).toBe(panel);

    b.focus();
    expect(pressKey('Tab')).toBe(false);
    expect(document.activeElement).toBe(a);
    expect(pressKey('Tab', true)).toBe(false);
    expect(document.activeElement).toBe(b);

    pressKey('Escape');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });

  it('without kjTrap the panel never steals focus on open, Tab is not cycled, and Escape still returns focus to the trigger', async () => {
    @Component({
      selector: 'kj-pop-host',
      standalone: true,
      imports: [KjPopoverTrigger, KjPopoverContent],
      template: `
        <button kjPopoverTrigger #t="kjPopoverTrigger" id="trigger2">Open</button>
        <kj-popover-content [kjFor]="t"><button id="c">c</button></kj-popover-content>
      `,
    })
    class Untrapped {}
    const settle = () => new Promise((r) => setTimeout(r, 40));
    const pressKey = (key: string, shiftKey = false) =>
      (document.activeElement ?? document.body).dispatchEvent(
        new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
      );
    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    const second = await render(Untrapped);
    const trigger2 = second.fixture.nativeElement.querySelector('#trigger2') as HTMLButtonElement;
    const c = second.fixture.nativeElement.querySelector('#c') as HTMLElement;
    trigger2.focus();
    trigger2.click();
    second.fixture.detectChanges();
    await settle();
    second.fixture.detectChanges();
    expect(document.activeElement).toBe(trigger2);

    c.focus();
    expect(pressKey('Tab')).toBe(true);
    pressKey('Escape');
    second.fixture.detectChanges();
    await settle();
    second.fixture.detectChanges();
    expect(document.activeElement).toBe(trigger2);
    second.fixture.destroy();
  });

  it('kjDisabled blocks opening but still lets an open panel close', async () => {
    @Component({
      selector: 'kj-pop-host',
      standalone: true,
      imports: [KjPopoverTrigger, KjPopoverContent],
      template: `
        <button kjPopoverTrigger [kjDisabled]="disabled()" #t="kjPopoverTrigger">Open</button>
        <kj-popover-content [kjFor]="t">Hi</kj-popover-content>
      `,
    })
    class Host {
      readonly disabled = signal(true);
    }
    const { container, fixture } = await render(Host);
    const btn = container.querySelector('button')!;
    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('false');

    fixture.componentInstance.disabled.set(false);
    fixture.detectChanges();
    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
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

  // arch F-16 / arch F-2 — the trigger hand-rolled `kjDisabled` and reflected
  // nothing, so a disabled trigger was announced as operable (WCAG 4.1.2).
  // It now composes `KjDisabled`, which owns the input and the reflection.
  describe('kjDisabled composes KjDisabled (arch F-16)', () => {
    it('reflects aria-disabled / data-disabled when disabled', async () => {
      const { container } = await render(
        `<button kjPopoverTrigger kjDisabled #t="kjPopoverTrigger">Open</button>
         <kj-popover-content [kjFor]="t" kjAriaLabel="Panel">Body</kj-popover-content>`,
        { imports: [KjPopoverTrigger, KjPopoverContent] },
      );
      const btn = container.querySelector('button')!;
      expect(btn).toHaveAttribute('aria-disabled', 'true');
      expect(btn).toHaveAttribute('data-disabled', '');
    });

    it('omits both attributes when enabled', async () => {
      const { container } = await render(
        `<button kjPopoverTrigger #t="kjPopoverTrigger">Open</button>
         <kj-popover-content [kjFor]="t" kjAriaLabel="Panel">Body</kj-popover-content>`,
        { imports: [KjPopoverTrigger, KjPopoverContent] },
      );
      const btn = container.querySelector('button')!;
      expect(btn).not.toHaveAttribute('aria-disabled');
      expect(btn).not.toHaveAttribute('data-disabled');
    });

    it('a bare kjDisabled attribute still blocks opening', async () => {
      const { container, fixture } = await render(
        `<button kjPopoverTrigger kjDisabled #t="kjPopoverTrigger">Open</button>
         <kj-popover-content [kjFor]="t" kjAriaLabel="Panel">Body</kj-popover-content>`,
        { imports: [KjPopoverTrigger, KjPopoverContent] },
      );
      const btn = container.querySelector('button')!;
      btn.click();
      fixture.detectChanges();
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
