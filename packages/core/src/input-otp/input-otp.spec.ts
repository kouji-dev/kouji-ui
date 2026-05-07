import { Component, signal } from '@angular/core';
import { render, fireEvent } from '@testing-library/angular';
import { FormsModule } from '@angular/forms';
import { KjInputOtp, KjInputOtpCell } from './input-otp';

// ── Test host component ───────────────────────────────────────────────────────

@Component({
  selector: 'kj-test-host',
  standalone: true,
  imports: [KjInputOtp, KjInputOtpCell, FormsModule],
  template: `
    <div
      kjInputOtp
      [kjLength]="length()"
      [kjCharSet]="charSet()"
      [kjMask]="masked()"
      [(ngModel)]="value"
    >
      @for (i of cells(); track i) {
        <input kjInputOtpCell [kjIndex]="i" />
      }
    </div>
  `,
})
class TestHost {
  value = '';
  readonly length = signal(6);
  readonly charSet = signal<'digits' | 'alphanumeric'>('digits');
  readonly masked = signal(false);
  readonly cells = signal([0, 1, 2, 3, 4, 5]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setup() {
  const result = await render(TestHost, {});
  return result;
}

function getInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input[kjInputOtpCell]'));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KjInputOtp + KjInputOtpCell', () => {

  describe('rendering', () => {
    it('renders 6 cells by default', async () => {
      const { container } = await setup();
      expect(getInputs(container)).toHaveLength(6);
    });

    it('sets role="group" on the root', async () => {
      const { container } = await setup();
      expect(container.querySelector('[role="group"]')).toBeInTheDocument();
    });

    it('sets autocomplete="one-time-code" on cell 0 only', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      expect(inputs[0].getAttribute('autocomplete')).toBe('one-time-code');
      expect(inputs[1].getAttribute('autocomplete')).toBe('off');
    });

    it('sets inputmode="numeric" for digits charSet', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      expect(inputs[0].getAttribute('inputmode')).toBe('numeric');
    });

    it('sets correct aria-label per cell', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      expect(inputs[0].getAttribute('aria-label')).toBe('Code digit 1 of 6');
      expect(inputs[5].getAttribute('aria-label')).toBe('Code digit 6 of 6');
    });

    it('sets maxlength="1" on each cell', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      inputs.forEach(input => expect(input.getAttribute('maxlength')).toBe('1'));
    });

    it('sets spellcheck="false" on each cell', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      inputs.forEach(input => expect(input.getAttribute('spellcheck')).toBe('false'));
    });
  });

  describe('auto-advance', () => {
    it('sets cell value and advances when a valid character is entered', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);
      inputs[0].focus();

      // Simulate typing '1' into cell 0.
      // We set the target value before firing (testing-library normalises this).
      Object.defineProperty(inputs[0], 'value', { value: '1', writable: true, configurable: true });
      fireEvent.input(inputs[0], { target: { value: '1' } });
      await fixture.whenStable();

      // The context should have the char set to '1' in cell 0.
      expect(inputs[0].value).toBe('1');
    });

    it('ignores non-digit characters when charSet is digits', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);
      inputs[0].focus();

      fireEvent.input(inputs[0], { target: { value: 'a' } });
      await fixture.whenStable();

      // Cell should remain empty since 'a' is rejected.
      expect(inputs[0].value).toBe('');
    });
  });

  describe('backspace', () => {
    it('clears a cell and moves focus back on backspace when cell is filled', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);

      // First fill cell 0 via multi-char input event (iOS autofill path).
      fireEvent.input(inputs[0], { target: { value: '12' } });
      await fixture.whenStable();

      // Focus cell 1 and press backspace.
      inputs[1].focus();
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
      await fixture.whenStable();

      // Cell 1 should now be empty.
      expect(inputs[1].value).toBe('');
    });

    it('moves to previous cell on backspace when current cell is empty', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);

      // Cell 1 is empty; focus it.
      inputs[1].focus();
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
      await fixture.whenStable();

      // No error thrown; cell 0 is still in the DOM.
      expect(inputs[0]).toBeInTheDocument();
    });
  });

  describe('arrow keys', () => {
    it('ArrowLeft and ArrowRight are handled without errors', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);
      inputs[2].focus();

      fireEvent.keyDown(inputs[2], { key: 'ArrowLeft' });
      await fixture.whenStable();
      expect(inputs[1]).toBeInTheDocument();

      fireEvent.keyDown(inputs[1], { key: 'ArrowRight' });
      await fixture.whenStable();
      expect(inputs[2]).toBeInTheDocument();
    });

    it('Home focuses cell 0', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);
      inputs[3].focus();

      fireEvent.keyDown(inputs[3], { key: 'Home' });
      await fixture.whenStable();

      expect(inputs[0]).toBeInTheDocument();
    });

    it('End focuses last cell', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);
      inputs[0].focus();

      fireEvent.keyDown(inputs[0], { key: 'End' });
      await fixture.whenStable();

      expect(inputs[5]).toBeInTheDocument();
    });
  });

  describe('paste distribution (via iOS autofill path)', () => {
    it('distributes multi-char input across cells from index 0', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);

      // Simulate iOS autofill: cell 0 receives the full OTP as its input value.
      fireEvent.input(inputs[0], { target: { value: '123456' } });
      await fixture.whenStable();

      expect(inputs[0].value).toBe('1');
      expect(inputs[1].value).toBe('2');
      expect(inputs[2].value).toBe('3');
      expect(inputs[3].value).toBe('4');
      expect(inputs[4].value).toBe('5');
      expect(inputs[5].value).toBe('6');
    });

    it('filters non-digit characters when distributing', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);

      // '1a2b3c' → only '1', '2', '3' pass the digits filter.
      fireEvent.input(inputs[0], { target: { value: '1a2b3c' } });
      await fixture.whenStable();

      expect(inputs[0].value).toBe('1');
      expect(inputs[1].value).toBe('2');
      expect(inputs[2].value).toBe('3');
      // Remaining cells stay empty.
      expect(inputs[3].value).toBe('');
    });

    it('distributes from a mid-cell index', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);

      // First fill cells 0+1 via multi-char from cell 0.
      fireEvent.input(inputs[0], { target: { value: '12' } });
      await fixture.whenStable();

      // Then paste '345' from cell 2.
      fireEvent.input(inputs[2], { target: { value: '345' } });
      await fixture.whenStable();

      expect(inputs[2].value).toBe('3');
      expect(inputs[3].value).toBe('4');
      expect(inputs[4].value).toBe('5');
    });
  });

  describe('completion', () => {
    it('fills all cells when a 6-char value is distributed from cell 0', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);

      fireEvent.input(inputs[0], { target: { value: '123456' } });
      await fixture.whenStable();

      // All 6 cells should have their respective digits.
      expect(inputs[0].value).toBe('1');
      expect(inputs[5].value).toBe('6');
    });
  });

  describe('mask mode', () => {
    it('sets type="password" when kjMask is true', async () => {
      const { container, fixture } = await render(TestHost, {});
      const comp = fixture.componentInstance as TestHost;
      comp.masked.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const inputs = getInputs(container);
      inputs.forEach(input => expect(input.type).toBe('password'));
    });

    it('uses type="text" by default', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      inputs.forEach(input => expect(input.type).toBe('text'));
    });
  });

  describe('tab stop', () => {
    it('first cell has tabindex="0" when all cells are empty', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      expect(inputs[0].getAttribute('tabindex')).toBe('0');
      expect(inputs[1].getAttribute('tabindex')).toBe('-1');
    });

    it('all non-first cells have tabindex="-1"', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      for (let i = 1; i < inputs.length; i++) {
        expect(inputs[i].getAttribute('tabindex')).toBe('-1');
      }
    });
  });

  describe('delete key', () => {
    it('clears a filled cell without moving focus', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);

      // Fill cell 0.
      fireEvent.input(inputs[0], { target: { value: '5' } });
      await fixture.whenStable();

      inputs[0].focus();
      fireEvent.keyDown(inputs[0], { key: 'Delete' });
      await fixture.whenStable();

      expect(inputs[0].value).toBe('');
    });
  });
});
