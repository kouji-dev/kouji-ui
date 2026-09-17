import { Component } from '@angular/core';
import { render, type RenderResult } from '@testing-library/angular';
import { afterEach, describe, it, expect } from 'vitest';
import { KjSelect, KjSelectTrigger, KjSelectContent, KjOption } from './select';

// Sweep portalled overlay wrappers between tests: a panel left open at the
// end of a test survives in `document.body` and pollutes the next test's
// `document.querySelector` calls.
afterEach(() => {
  document
    .querySelectorAll('.kj-overlay-wrapper, .kj-overlay-container')
    .forEach(w => w.remove());
});

/**
 * Dispatch `key` from the element that actually holds focus. Throws when
 * `el` is not `document.activeElement`, so a spec can never "press" a key
 * on an element the user could not have reached — the gap that let the
 * listbox ship without keyboard navigation.
 */
function pressKey(el: Element | null, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  if (!el || document.activeElement !== el) {
    throw new Error(`pressKey(${key}): target does not hold focus (active: ${document.activeElement?.tagName})`);
  }
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
}

/** Flush change detection plus the `afterNextRender` queue the panels focus from. */
async function settle(fixture: RenderResult<unknown>['fixture']): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('KjSelect', () => {
  it('panel exposes role=listbox', async () => {
    @Component({
      selector: 'kj-sel-host',
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
      selector: 'kj-sel-host',
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
      selector: 'kj-sel-host',
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
      selector: 'kj-sel-host',
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
      selector: 'kj-sel-host',
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

describe('KjSelect – keyboard', () => {
  @Component({
    standalone: true,
    imports: [KjSelect, KjSelectTrigger, KjSelectContent, KjOption],
    template: `
      <div kjSelect [(kjSelectValue)]="value">
        <button kjSelectTrigger #t="kjSelectTrigger">Open</button>
        <kj-select-content [kjFor]="t">
          <div kjOption [kjOptionValue]="'a'">Apple</div>
          <div kjOption [kjOptionValue]="'b'">Banana</div>
          <div kjOption [kjOptionValue]="'c'">Cherry</div>
        </kj-select-content>
      </div>
    `,
  })
  class Host {
    value: unknown = undefined;
  }

  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[kjOption]'));
  const panel = () => document.querySelector('kj-select-content') as HTMLElement;

  /** Tab onto the trigger, press ArrowDown, wait for focus to land inside the panel. */
  async function openWithKeyboard(fixture: RenderResult<unknown>['fixture'], trigger: HTMLElement) {
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    pressKey(trigger, 'ArrowDown');
    await settle(fixture);
  }

  it('ArrowDown from the focused trigger opens the listbox and moves focus onto the first option', async () => {
    const { container, fixture } = await render(Host);
    const trigger = container.querySelector('button') as HTMLElement;
    await openWithKeyboard(fixture, trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel().hasAttribute('hidden')).toBe(false);
    expect(document.activeElement).toBe(options()[0]);
    expect(options()[0].getAttribute('tabindex')).toBe('0');
  });

  it('ArrowDown / ArrowUp / Home / End move focus between options while open', async () => {
    const { container, fixture } = await render(Host);
    await openWithKeyboard(fixture, container.querySelector('button') as HTMLElement);
    pressKey(document.activeElement, 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(options()[1]);
    pressKey(document.activeElement, 'ArrowUp');
    await settle(fixture);
    expect(document.activeElement).toBe(options()[0]);
    pressKey(document.activeElement, 'End');
    await settle(fixture);
    expect(document.activeElement).toBe(options()[2]);
    pressKey(document.activeElement, 'Home');
    await settle(fixture);
    expect(document.activeElement).toBe(options()[0]);
  });

  it('opens onto the selected option', async () => {
    const { container, fixture } = await render(Host, { componentProperties: { value: 'b' } });
    await openWithKeyboard(fixture, container.querySelector('button') as HTMLElement);
    expect(document.activeElement).toBe(options()[1]);
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
  });

  it('type-ahead moves focus to the first option whose label starts with the typed character', async () => {
    const { container, fixture } = await render(Host);
    await openWithKeyboard(fixture, container.querySelector('button') as HTMLElement);
    pressKey(document.activeElement, 'c');
    await settle(fixture);
    expect(document.activeElement).toBe(options()[2]);
  });

  it('Enter on the focused option selects it, closes the listbox and returns focus to the trigger', async () => {
    const { container, fixture } = await render(Host);
    const trigger = container.querySelector('button') as HTMLElement;
    await openWithKeyboard(fixture, trigger);
    pressKey(document.activeElement, 'ArrowDown');
    await settle(fixture);
    pressKey(document.activeElement, 'Enter');
    await settle(fixture);
    expect((fixture.componentInstance as Host).value).toBe('b');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape closes the listbox and returns focus to the trigger', async () => {
    const { container, fixture } = await render(Host);
    const trigger = container.querySelector('button') as HTMLElement;
    await openWithKeyboard(fixture, trigger);
    pressKey(document.activeElement, 'Escape');
    await settle(fixture);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('Tab closes the listbox and hands focus back to the trigger without swallowing the key', async () => {
    const { container, fixture } = await render(Host);
    const trigger = container.querySelector('button') as HTMLElement;
    await openWithKeyboard(fixture, trigger);
    const e = pressKey(document.activeElement, 'Tab');
    await settle(fixture);
    expect(e.defaultPrevented).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('the panel does not publish aria-activedescendant — the focused option is the active one', async () => {
    const { container, fixture } = await render(Host);
    await openWithKeyboard(fixture, container.querySelector('button') as HTMLElement);
    expect(panel().hasAttribute('aria-activedescendant')).toBe(false);
  });
});


describe('KjSelectTrigger — composed KjDisabled (arch F-2 / F-16)', () => {
  @Component({
    selector: 'kj-sel-dis-host',
    standalone: true,
    imports: [KjSelect, KjSelectTrigger, KjSelectContent, KjOption],
    template: `
      <div kjSelect>
        <button kjSelectTrigger kjDisabled #t="kjSelectTrigger">Open</button>
        <kj-select-content [kjFor]="t"><div kjOption [kjOptionValue]="'a'">A</div></kj-select-content>
      </div>
    `,
  })
  class BareHost {}

  it('honours the bare kjDisabled attribute and reflects it', async () => {
    const { container, fixture } = await render(BareHost);
    await settle(fixture);
    const trigger = container.querySelector('button') as HTMLElement;
    // Before arch F-2 this stayed `false` (the bare attribute binds ''), and
    // before arch F-16 nothing reflected the state at all (WCAG 4.1.2).
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(trigger.hasAttribute('data-disabled')).toBe(true);

    trigger.focus();
    pressKey(trigger, 'ArrowDown');
    await settle(fixture);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  @Component({
    selector: 'kj-sel-en-host',
    standalone: true,
    imports: [KjSelect, KjSelectTrigger, KjSelectContent, KjOption],
    template: `
      <div kjSelect>
        <button kjSelectTrigger #t="kjSelectTrigger">Open</button>
        <kj-select-content [kjFor]="t"><div kjOption [kjOptionValue]="'a'">A</div></kj-select-content>
      </div>
    `,
  })
  class EnabledHost {}

  it('reflects nothing when the trigger is enabled', async () => {
    const { container, fixture } = await render(EnabledHost);
    await settle(fixture);
    const trigger = container.querySelector('button') as HTMLElement;
    expect(trigger.hasAttribute('aria-disabled')).toBe(false);
    expect(trigger.hasAttribute('data-disabled')).toBe(false);
  });
});
