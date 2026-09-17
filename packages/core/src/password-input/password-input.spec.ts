import { ApplicationRef, Component, effect, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { KjButton } from '../button/button';
import { KjLiveRegion } from '../a11y/live-region';
import { KjVisuallyHidden } from '../a11y/visually-hidden';
import {
  KjPasswordCapsLockWarning,
  KjPasswordInput,
  KjPasswordInputScope,
  KjPasswordStrength,
  KjPasswordToggle,
} from './password-input';
import { defaultPasswordScorer } from './password-input.scorer';

expect.extend(toHaveNoViolations);

const ALL_DIRECTIVES = [
  KjPasswordInput,
  KjPasswordInputScope,
  KjPasswordToggle,
  KjPasswordStrength,
  KjPasswordCapsLockWarning,
  KjButton,
];

describe('KjPasswordInput', () => {
  it('renders an input with type="password" by default', async () => {
    const { container } = await render(`<input kjPasswordInput />`, {
      imports: [KjPasswordInput],
    });
    const input = container.querySelector('input')!;
    expect(input.getAttribute('type')).toBe('password');
  });

  it('defaults autocomplete to "current-password"', async () => {
    const { container } = await render(`<input kjPasswordInput />`, {
      imports: [KjPasswordInput],
    });
    expect(container.querySelector('input')!.getAttribute('autocomplete')).toBe(
      'current-password',
    );
  });

  it('forwards kjAutocomplete="new-password"', async () => {
    const { container } = await render(
      `<input kjPasswordInput kjAutocomplete="new-password" />`,
      { imports: [KjPasswordInput] },
    );
    expect(container.querySelector('input')!.getAttribute('autocomplete')).toBe(
      'new-password',
    );
  });

  it('forwards kjMaxLength to native maxlength', async () => {
    const { container } = await render(
      `<input kjPasswordInput [kjMaxLength]="32" />`,
      { imports: [KjPasswordInput] },
    );
    expect(container.querySelector('input')!.getAttribute('maxlength')).toBe(
      '32',
    );
  });

  it('auto-generates an id when none was supplied', async () => {
    const { container } = await render(`<input kjPasswordInput />`, {
      imports: [KjPasswordInput],
    });
    expect(container.querySelector('input')!.getAttribute('id')).toMatch(
      /^kj-password-/,
    );
  });

  it('keeps the consumer-provided id when present', async () => {
    const { container } = await render(
      `<input id="my-pw" kjPasswordInput />`,
      { imports: [KjPasswordInput] },
    );
    expect(container.querySelector('input')!.getAttribute('id')).toBe('my-pw');
  });

  it('flips type to "text" when kjRevealed is true', async () => {
    const { container } = await render(
      `<input kjPasswordInput [kjRevealed]="true" />`,
      { imports: [KjPasswordInput] },
    );
    expect(container.querySelector('input')!.getAttribute('type')).toBe('text');
  });

  it('toggle button flips reveal state on click', async () => {
    const { container } = await render(
      `<div kjPasswordInputScope>
         <input kjPasswordInput />
         <button kjButton kjPasswordToggle>eye</button>
       </div>`,
      { imports: ALL_DIRECTIVES },
    );
    const input = container.querySelector('input')!;
    const button = container.querySelector('button')!;
    expect(input.getAttribute('type')).toBe('password');
    button.click();
    await new Promise(r => setTimeout(r, 0));
    expect(input.getAttribute('type')).toBe('text');
    button.click();
    await new Promise(r => setTimeout(r, 0));
    expect(input.getAttribute('type')).toBe('password');
  });

  it('toggle wires aria-controls to the input id', async () => {
    const { container } = await render(
      `<div kjPasswordInputScope>
         <input id="pw1" kjPasswordInput />
         <button kjButton kjPasswordToggle>eye</button>
       </div>`,
      { imports: ALL_DIRECTIVES },
    );
    expect(container.querySelector('button')!.getAttribute('aria-controls')).toBe(
      'pw1',
    );
  });

  it('toggle aria-label switches with state', async () => {
    const { container } = await render(
      `<div kjPasswordInputScope>
         <input kjPasswordInput />
         <button kjButton kjPasswordToggle>eye</button>
       </div>`,
      { imports: ALL_DIRECTIVES },
    );
    const button = container.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Show password');
    button.click();
    await new Promise(r => setTimeout(r, 0));
    expect(button.getAttribute('aria-label')).toBe('Hide password');
  });

  it('toggle reflects aria-pressed', async () => {
    const { container } = await render(
      `<div kjPasswordInputScope>
         <input kjPasswordInput />
         <button kjButton kjPasswordToggle>eye</button>
       </div>`,
      { imports: ALL_DIRECTIVES },
    );
    const button = container.querySelector('button')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    await new Promise(r => setTimeout(r, 0));
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('strength meter exposes role=progressbar with the score in 0..4', async () => {
    const ctrl = new FormControl('');
    const { container } = await render(
      `<div kjPasswordInputScope>
         <input kjPasswordInput [formControl]="ctrl" />
         <div kjPasswordStrength></div>
       </div>`,
      {
        imports: [...ALL_DIRECTIVES, ReactiveFormsModule],
        componentProperties: { ctrl },
      },
    );
    const meter = container.querySelector('[kjPasswordStrength]')!;
    expect(meter.getAttribute('role')).toBe('progressbar');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('4');
    // empty value → 0
    expect(meter.getAttribute('aria-valuenow')).toBe('0');
    expect(meter.getAttribute('aria-valuetext')).toBe('too weak');

    // strong value → 4
    ctrl.setValue('Aa1!Aa1!Aa1!Aa1!');
    await new Promise(r => setTimeout(r, 0));
    expect(meter.getAttribute('aria-valuenow')).toBe('4');
    expect(meter.getAttribute('aria-valuetext')).toBe('strong');
  });

  it('caps lock warning is hidden by default', async () => {
    const { container } = await render(
      `<div kjPasswordInputScope>
         <input kjPasswordInput />
         <p kjPasswordCapsLockWarning>caps</p>
       </div>`,
      { imports: ALL_DIRECTIVES },
    );
    const warn = container.querySelector('[kjPasswordCapsLockWarning]') as HTMLElement;
    expect(warn.hidden).toBe(true);
    expect(warn.getAttribute('role')).toBe('status');
    expect(warn.getAttribute('aria-live')).toBe('polite');
  });

  it('caps lock warning becomes visible when CapsLock modifier is detected', async () => {
    const { container } = await render(
      `<div kjPasswordInputScope>
         <input kjPasswordInput />
         <p kjPasswordCapsLockWarning>caps</p>
       </div>`,
      { imports: ALL_DIRECTIVES },
    );
    const input = container.querySelector('input')!;
    const warn = container.querySelector('[kjPasswordCapsLockWarning]') as HTMLElement;

    const event = new KeyboardEvent('keydown', { key: 'a' });
    Object.defineProperty(event, 'getModifierState', {
      value: (key: string) => key === 'CapsLock',
    });
    input.dispatchEvent(event);
    await new Promise(r => setTimeout(r, 0));
    expect(warn.hidden).toBe(false);

    input.dispatchEvent(new Event('blur'));
    await new Promise(r => setTimeout(r, 0));
    expect(warn.hidden).toBe(true);
  });

  it('disabled toggle is a no-op', async () => {
    @Component({
      standalone: true,
      imports: ALL_DIRECTIVES,
      template: `
        <div kjPasswordInputScope>
          <input kjPasswordInput [kjDisabled]="true" />
          <button kjButton kjPasswordToggle>eye</button>
        </div>
      `,
    })
    class Host {}

    const { container } = await render(Host);
    const input = container.querySelector('input')!;
    const button = container.querySelector('button')!;
    expect(input.getAttribute('type')).toBe('password');
    button.click();
    await new Promise(r => setTimeout(r, 0));
    expect(input.getAttribute('type')).toBe('password');
  });

  it('passes axe audit (login form shape)', async () => {
    const { container } = await render(
      `<div kjPasswordInputScope>
         <label for="pw">Password</label>
         <input id="pw" kjPasswordInput />
         <button kjButton kjPasswordToggle>eye</button>
       </div>`,
      { imports: ALL_DIRECTIVES },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('defaultPasswordScorer', () => {
  it('returns 0 for empty / very short inputs', () => {
    expect(defaultPasswordScorer('')).toBe(0);
    expect(defaultPasswordScorer('abc')).toBe(0);
  });

  it('returns 1 for short passwords', () => {
    expect(defaultPasswordScorer('abcdefg')).toBe(1);
  });

  it('returns 2 for medium-length, multi-class passwords', () => {
    expect(defaultPasswordScorer('Abcdefg1')).toBe(2);
  });

  it('returns 3 for long, three-class passwords', () => {
    expect(defaultPasswordScorer('Abcdefghi1')).toBe(3);
  });

  it('returns 4 for long, four-class passwords', () => {
    expect(defaultPasswordScorer('Abcdefghij1!')).toBe(4);
  });

  // arch F-2 — `kjDisabled` carries `transform: booleanAttribute`, and so
  // does the `KjDisabled` the composed `KjInput` brings to the same element,
  // so the two owners agree under the bare-attribute form.
  describe('bare boolean attributes (arch F-2)', () => {
    it('bare kjDisabled reflects aria-disabled / data-disabled', async () => {
      const { container } = await render(`<input kjPasswordInput kjDisabled aria-label="Password" />`, {
        imports: ALL_DIRECTIVES,
      });
      const el = container.querySelector('input') as HTMLInputElement;
      expect(el.getAttribute('aria-disabled')).toBe('true');
      expect(el.hasAttribute('data-disabled')).toBe(true);
    });

    it('bare kjDisabled also suppresses the reveal toggle', async () => {
      const { container } = await render(
        `<div kjPasswordInputScope>
           <input kjPasswordInput kjDisabled aria-label="Password" />
           <button kjButton kjPasswordToggle>Show</button>
         </div>`,
        { imports: ALL_DIRECTIVES },
      );
      const input = container.querySelector('input') as HTMLInputElement;
      const toggle = container.querySelector('button') as HTMLButtonElement;
      toggle.click();
      expect(input.getAttribute('type')).toBe('password');
    });

    it('bare kjAnnounce is read as true', async () => {
      const { container } = await render(
        `<div kjPasswordInputScope>
           <input kjPasswordInput aria-label="Password" />
           <div kjPasswordStrength kjAnnounce></div>
         </div>`,
        { imports: ALL_DIRECTIVES },
      );
      const meter = container.querySelector('[kjPasswordStrength]') as HTMLElement;
      // The meter is never itself the live region: it is a `role="progressbar"`,
      // whose descendants are not exposed, and a live region announces a text
      // change rather than an `aria-valuetext` change. The announcement goes to
      // a region registered from outside — see the block below.
      expect(meter.hasAttribute('aria-live')).toBe(false);
      expect(meter.getAttribute('role')).toBe('progressbar');
    });
  });
});

/**
 * arch F-10: `kjAnnounce` used to be a published no-op whose TSDoc promised a
 * live region. These pin the real contract.
 *
 * `KjLiveRegion.announce` clears the node and writes the message 50 ms later
 * (the gap is what makes a screen reader notice a change), so every assertion
 * here waits past that.
 */
describe('KjPasswordStrength — announcing the tier (arch F-10)', () => {
  @Component({
    standalone: true,
    imports: [
      KjPasswordInputScope,
      KjPasswordInput,
      KjPasswordStrength,
      KjLiveRegion,
      KjVisuallyHidden,
      ReactiveFormsModule,
    ],
    template: `
      <div kjPasswordInputScope>
        <input kjPasswordInput aria-label="Password" [formControl]="ctrl" />
        <div kjPasswordStrength [kjAnnounce]="announce()"></div>
        <span kjVisuallyHidden kjLiveRegion></span>
      </div>
    `,
  })
  class Host {
    readonly ctrl = new FormControl('', { nonNullable: true });
    readonly announce = signal(true);
    readonly meter = viewChild.required(KjPasswordStrength);
    private readonly region = viewChild.required(KjLiveRegion);
    constructor() {
      effect((onCleanup) => {
        onCleanup(this.meter().registerLiveRegion(this.region()));
      });
    }
  }

  /** Lets the effect queue drain and the 50 ms announce timer fire. */
  async function settle(fixture: { detectChanges(): void }): Promise<void> {
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 90));
    TestBed.inject(ApplicationRef).tick();
  }

  function regionText(root: HTMLElement): string {
    return (root.querySelector('[kjLiveRegion]') as HTMLElement).textContent ?? '';
  }

  it('says nothing for the tier the meter mounted with', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    // Score 0 ("too weak") is the empty-value tier, and it is what the meter
    // came up with — announcing it would talk over a form the user has not
    // touched.
    expect(regionText(fixture.nativeElement)).toBe('');
  });

  it('announces the label, prefixed by the meter name, when the tier changes', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    // 12 chars, all four character classes -> score 4.
    fixture.componentInstance.ctrl.setValue('Aa1!aaaaaaaa');
    await settle(fixture);
    expect(regionText(fixture.nativeElement)).toBe('Password strength: strong');
  });

  it('stays silent while the tier holds, even as the value keeps changing', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    fixture.componentInstance.ctrl.setValue('Aa1!aaaaaaaa');
    await settle(fixture);
    // Still 12+ chars / 4 classes: same tier, so nothing new is said. This is
    // the "one announcement per tier, not per keystroke" half of the contract.
    fixture.componentInstance.ctrl.setValue('Aa1!aaaaaaaaaaaa');
    await settle(fixture);
    expect(regionText(fixture.nativeElement)).toBe('Password strength: strong');
  });

  it('says nothing at all with kjAnnounce off', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.announce.set(false);
    await settle(fixture);
    fixture.componentInstance.ctrl.setValue('Aa1!aaaaaaaa');
    await settle(fixture);
    expect(regionText(fixture.nativeElement)).toBe('');
  });

  it('turning kjAnnounce on does not replay the tier the user already reached', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.announce.set(false);
    await settle(fixture);
    fixture.componentInstance.ctrl.setValue('Aa1!aaaaaaaa');
    await settle(fixture);
    fixture.componentInstance.announce.set(true);
    await settle(fixture);
    expect(regionText(fixture.nativeElement)).toBe('');
    // ...and the next real change still speaks.
    fixture.componentInstance.ctrl.setValue('abc');
    await settle(fixture);
    expect(regionText(fixture.nativeElement)).toBe('Password strength: too weak');
  });

  it('a deregistered region stops receiving announcements', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const calls: string[] = [];
    const deregister = fixture.componentInstance
      .meter()
      .registerLiveRegion({ announce: (m: string) => calls.push(m) });
    fixture.componentInstance.ctrl.setValue('Aa1!aaaaaaaa');
    await settle(fixture);
    expect(calls).toEqual(['Password strength: strong']);
    deregister();
    fixture.componentInstance.ctrl.setValue('abc');
    await settle(fixture);
    expect(calls).toEqual(['Password strength: strong']);
  });
});
