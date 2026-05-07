import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { KjButton } from '../button/button';
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
});
