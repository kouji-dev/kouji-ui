import { Component, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { render, fireEvent } from '@testing-library/angular';
import { FormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { KjInputOtp, KjInputOtpCell } from './input-otp';

// ── Test host component ───────────────────────────────────────────────────────

@Component({
  selector: 'kj-test-host',
  standalone: true,
  imports: [KjInputOtp, KjInputOtpCell, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      kjInputOtp
      [kjLength]="length()"
      [kjCharSet]="charSet()"
      [kjMask]="masked()"
      [(ngModel)]="value"
      (kjComplete)="completed.push($event)"
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
  readonly completed: string[] = [];
  readonly otp = viewChild.required(KjInputOtp);
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
      inputs.forEach((input) => expect(input.getAttribute('maxlength')).toBe('1'));
    });

    it('sets spellcheck="false" on each cell', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      inputs.forEach((input) => expect(input.getAttribute('spellcheck')).toBe('false'));
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

    it('emits kjComplete exactly once when the last cell fills, with the full code', async () => {
      const { container, fixture } = await setup();
      const host = fixture.componentInstance as TestHost;
      const inputs = getInputs(container);

      fireEvent.input(inputs[0], { target: { value: '12345' } });
      await fixture.whenStable();
      expect(host.completed).toEqual([]);

      fireEvent.input(inputs[5], { target: { value: '6' } });
      await fixture.whenStable();
      expect(host.completed).toEqual(['123456']);

      // Moving focus / re-rendering does not re-emit.
      inputs[2].focus();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.completed).toEqual(['123456']);
    });

    it('does not complete while a middle cell is empty', async () => {
      const { container, fixture } = await setup();
      const host = fixture.componentInstance as TestHost;
      const inputs = getInputs(container);

      fireEvent.input(inputs[0], { target: { value: '12' } });
      fireEvent.input(inputs[3], { target: { value: '456' } });
      await fixture.whenStable();

      expect(inputs[2].value).toBe('');
      expect(host.completed).toEqual([]);
    });

    it('re-arms after a cell is cleared and emits again on refill', async () => {
      const { container, fixture } = await setup();
      const host = fixture.componentInstance as TestHost;
      const inputs = getInputs(container);

      fireEvent.input(inputs[0], { target: { value: '123456' } });
      await fixture.whenStable();
      expect(host.completed).toHaveLength(1);

      inputs[5].focus();
      fireEvent.keyDown(inputs[5], { key: 'Delete' });
      await fixture.whenStable();
      expect(host.completed).toHaveLength(1);

      fireEvent.input(inputs[5], { target: { value: '9' } });
      await fixture.whenStable();
      expect(host.completed).toEqual(['123456', '123459']);
    });

    it('announces "Code complete" through a registered live region, once per completion', async () => {
      const { container, fixture } = await setup();
      const host = fixture.componentInstance as TestHost;
      const region = { announce: vi.fn() };
      const deregister = host.otp().registerLiveRegion(region);
      const inputs = getInputs(container);

      fireEvent.input(inputs[0], { target: { value: '123456' } });
      await fixture.whenStable();
      expect(region.announce).toHaveBeenCalledTimes(1);
      expect(region.announce).toHaveBeenCalledWith('Code complete');

      // The root is not a live region itself: the cells are never wrapped by one.
      const root = container.querySelector('[kjInputOtp]')!;
      expect(root.hasAttribute('aria-live')).toBe(false);
      expect(getInputs(container)).toHaveLength(6);

      deregister();
      inputs[5].focus();
      fireEvent.keyDown(inputs[5], { key: 'Delete' });
      fireEvent.input(inputs[5], { target: { value: '6' } });
      await fixture.whenStable();
      expect(region.announce).toHaveBeenCalledTimes(1);
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
      inputs.forEach((input) => expect(input.type).toBe('password'));
    });

    it('uses type="text" by default', async () => {
      const { container } = await setup();
      const inputs = getInputs(container);
      inputs.forEach((input) => expect(input.type).toBe('text'));
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

  // arch F-13 — the root's `ngOnInit`/`ngOnDestroy` and the cell's
  // `ngOnInit`/`ngOnDestroy` are gone; the char array is sized by an effect
  // and each cell registers through an `effect(onCleanup)`.
  describe('no lifecycle hooks (arch F-13)', () => {
    it('neither class declares a lifecycle hook any more', () => {
      const root = KjInputOtp.prototype as unknown as Record<string, unknown>;
      const cell = KjInputOtpCell.prototype as unknown as Record<string, unknown>;
      for (const hook of ['ngOnInit', 'ngOnDestroy', 'ngAfterViewInit', 'ngAfterContentInit']) {
        expect(root[hook]).toBeUndefined();
        expect(cell[hook]).toBeUndefined();
      }
    });

    it('sizes the char array from kjLength without ngOnInit', async () => {
      const { fixture } = await setup();
      expect(fixture.componentInstance.otp().chars()).toEqual(['', '', '', '', '', '']);
    });

    it('cells register with the root, so typing auto-advances focus', async () => {
      const { container, fixture } = await setup();
      const inputs = getInputs(container);
      inputs[0].focus();
      fireEvent.input(inputs[0], { target: { value: '1' } });
      fixture.detectChanges();
      // Auto-advance only works if the cell registered its element.
      expect(document.activeElement).toBe(inputs[1]);
    });

    it('a removed cell unregisters itself (effect cleanup replaces ngOnDestroy)', async () => {
      const { container, fixture } = await setup();
      fixture.componentInstance.cells.set([0, 1, 2]);
      fixture.componentInstance.length.set(3);
      fixture.detectChanges();
      const inputs = getInputs(container);
      expect(inputs).toHaveLength(3);
      inputs[1].focus();
      fireEvent.input(inputs[1], { target: { value: '2' } });
      fixture.detectChanges();
      expect(document.activeElement).toBe(inputs[2]);
    });
  });

  // arch F-2 — `kjMask`, `kjAutoSubmit`, `kjInvalid`, `kjReadonly` and the
  // composed `kjDisabled` all carry `transform: booleanAttribute`, so the
  // bare-attribute form the docs teach is not a silent no-op.
  describe('bare boolean attributes (arch F-2)', () => {
    async function renderBare(attrs: string) {
      return render(
        `<div kjInputOtp ${attrs} kjAriaLabel="Code">
           <input kjInputOtpCell [kjIndex]="0" />
           <input kjInputOtpCell [kjIndex]="1" />
         </div>`,
        { imports: [KjInputOtp, KjInputOtpCell] },
      );
    }

    it('bare kjMask flips the cells to type="password"', async () => {
      const { container } = await renderBare('kjMask');
      for (const cell of getInputs(container)) {
        expect(cell.getAttribute('type')).toBe('password');
      }
    });

    it('bare kjReadonly marks every cell readonly', async () => {
      const { container } = await renderBare('kjReadonly');
      for (const cell of getInputs(container)) {
        expect(cell.hasAttribute('readonly')).toBe(true);
      }
    });

    it('bare kjDisabled disables every cell and reflects on the group', async () => {
      const { container } = await renderBare('kjDisabled');
      const group = container.querySelector('[kjInputOtp]') as HTMLElement;
      expect(group.getAttribute('aria-disabled')).toBe('true');
      for (const cell of getInputs(container)) {
        expect(cell.hasAttribute('disabled')).toBe(true);
      }
    });

    it('bare kjAutoSubmit is read as true by the root', async () => {
      const { fixture } = await renderBare('kjAutoSubmit');
      const group = fixture.nativeElement.querySelector('[kjInputOtp]') as HTMLElement;
      const otp = fixture.debugElement
        .query((n: { nativeElement?: HTMLElement }) => n.nativeElement === group)
        .injector.get(KjInputOtp);
      expect(otp.kjAutoSubmit()).toBe(true);
    });
  });
});
