import { ApplicationRef, ChangeDetectionStrategy, Component, type Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KjInputMaskComponent } from './input-mask';

/**
 * Behavioural cover for the styled `<kj-input-mask>` wrapper: the inner
 * `<input>` it stamps, every knob it forwards to the headless `KjInputMask`,
 * the masked typing round trip, and the `(kjComplete)` re-emission.
 */

@Component({
  standalone: true,
  imports: [KjInputMaskComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-input-mask
      [kjMask]="mask()"
      [kjSlotChar]="slotChar()"
      [kjDisabled]="disabled()"
      [kjInvalid]="invalid()"
      (kjComplete)="completions.set(completions() + 1)"
    />
  `,
})
class Host {
  readonly mask = signal('(999) 999-9999');
  readonly slotChar = signal('_');
  readonly disabled = signal(false);
  readonly invalid = signal(false);
  readonly completions = signal(0);
}

function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector<HTMLInputElement>('input.kj-input-mask__input');
  if (!input) throw new Error('masked input not rendered');
  return { fixture, root, input };
}

/**
 * Type one character the way a browser announces it to the mask engine.
 *
 * The engine moves the caret through `setSelectionRange` inside a
 * `requestAnimationFrame` (browsers reset `selectionStart` after a
 * programmatic value write), so back-to-back synchronous dispatches would all
 * land on slot 0. Placing the caret on the next empty slot first is what the
 * deferred callback does a frame later.
 */
function typeChar(input: HTMLInputElement, ch: string, slotChar = '_'): void {
  const next = input.value.indexOf(slotChar);
  input.setSelectionRange(next < 0 ? input.value.length : next, next < 0 ? input.value.length : next);
  input.dispatchEvent(
    new InputEvent('beforeinput', { data: ch, inputType: 'insertText', bubbles: true, cancelable: true }),
  );
}

describe('KjInputMaskComponent', () => {
  it('renders one text input carrying the wrapper class', () => {
    const { root, input } = mount();

    expect(root.querySelector('kj-input-mask')?.classList.contains('kj-input-mask')).toBe(true);
    expect(input.getAttribute('type')).toBe('text');
    expect(root.querySelectorAll('input')).toHaveLength(1);
  });

  it('derives the placeholder and inputmode from the mask', () => {
    const { input } = mount();

    expect(input.getAttribute('placeholder')).toBe('(___) ___-____');
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });

  it('forwards kjSlotChar into the placeholder', () => {
    const { fixture, input } = mount();
    fixture.componentInstance.slotChar.set('#');
    fixture.detectChanges();

    expect(input.getAttribute('placeholder')).toBe('(###) ###-####');
  });

  it('a mixed mask drops back to inputmode="text"', () => {
    const { fixture, input } = mount();
    fixture.componentInstance.mask.set('aaa-999');
    fixture.detectChanges();

    expect(input.getAttribute('placeholder')).toBe('___-___');
    expect(input.getAttribute('inputmode')).toBe('text');
  });

  it('formats typed characters into the mask, keeping the literals in place', () => {
    const { input } = mount();

    typeChar(input, '4');
    expect(input.value).toBe('(4__) ___-____');

    for (const ch of '15555') typeChar(input, ch);
    expect(input.value).toBe('(415) 555-____');
  });

  it('re-emits (kjComplete) from the inner directive once the last slot fills', () => {
    const { fixture, input } = mount();

    for (const ch of '415555123') typeChar(input, ch);
    expect(fixture.componentInstance.completions()).toBe(0);

    typeChar(input, '4');
    expect(input.value).toBe('(415) 555-1234');
    expect(fixture.componentInstance.completions()).toBe(1);
  });

  it('rejects a character the token does not accept', () => {
    const { input } = mount();

    typeChar(input, 'x');
    expect(input.value).toBe('');
  });

  it('kjDisabled lands on the inner input as ARIA state', () => {
    const { fixture, input } = mount();
    expect(input.getAttribute('aria-disabled')).toBeNull();

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(input.getAttribute('aria-disabled')).toBe('true');
  });

  it('kjInvalid is touched-gated — it paints only after the field has been visited', () => {
    const { fixture, input } = mount();
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();

    // Untouched: the user has not finished with the field, so no error state.
    expect(input.getAttribute('data-invalid')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();

    input.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(input.getAttribute('data-invalid')).toBe('');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  // arch F-2 — every boolean input on the wrapper carries
  // `transform: booleanAttribute`, so `<kj-input-mask kjDisabled>` is not a
  // silent no-op and reaches the inner `<input kjInputMask>`.
  describe('bare boolean attributes (arch F-2)', () => {
    function mountBare(cmp: Type<unknown>): HTMLInputElement {
      const fixture = TestBed.createComponent(cmp);
      fixture.detectChanges();
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
        'input.kj-input-mask__input',
      );
      if (!input) throw new Error('masked input not rendered');
      return input;
    }

    @Component({
      standalone: true,
      imports: [KjInputMaskComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-input-mask kjMask="999" kjDisabled />`,
    })
    class DisabledHost {}

    @Component({
      standalone: true,
      imports: [KjInputMaskComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-input-mask kjMask="999" kjInvalid />`,
    })
    class InvalidHost {}

    @Component({
      standalone: true,
      imports: [KjInputMaskComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-input-mask kjMask="(999) 999-9999" kjAutoClear />`,
    })
    class AutoClearHost {}

    it('bare kjDisabled reaches the inner input', () => {
      const input = mountBare(DisabledHost);
      expect(input.getAttribute('aria-disabled')).toBe('true');
      expect(input.hasAttribute('data-disabled')).toBe(true);
    });

    it('bare kjInvalid reaches the inner input once touched', () => {
      const input = mountBare(InvalidHost);
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      TestBed.inject(ApplicationRef).tick();
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('bare kjAutoClear resets an incomplete value on blur', () => {
      const input = mountBare(AutoClearHost);
      input.value = '(415) 5';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      expect(input.value).toBe('(___) ___-____');
    });
  });
});
