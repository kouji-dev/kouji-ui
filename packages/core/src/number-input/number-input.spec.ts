import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjNumberInput } from './number-input';
import { KjNumberStepper } from './number-stepper';
import { KjNumberInputGroup } from './number-input-group';

expect.extend(toHaveNoViolations);

describe('KjNumberInput', () => {
  it('sets role=spinbutton on the host input', async () => {
    const { container } = await render(`<input kjNumberInput aria-label="Qty" />`, { imports: [KjNumberInput] });
    expect(container.querySelector('input')).toHaveAttribute('role', 'spinbutton');
  });

  it('reflects aria-valuemin / aria-valuemax / aria-valuenow', async () => {
    const { container } = await render(
      `<input kjNumberInput aria-label="Qty" [kjMin]="0" [kjMax]="10" [kjValue]="3" />`,
      { imports: [KjNumberInput] },
    );
    const input = container.querySelector('input')!;
    expect(input).toHaveAttribute('aria-valuemin', '0');
    expect(input).toHaveAttribute('aria-valuemax', '10');
    expect(input).toHaveAttribute('aria-valuenow', '3');
  });

  it('omits aria-valuemin / max when bounds are unset', async () => {
    const { container } = await render(`<input kjNumberInput aria-label="Qty" [kjValue]="3" />`, {
      imports: [KjNumberInput],
    });
    const input = container.querySelector('input')!;
    expect(input).not.toHaveAttribute('aria-valuemin');
    expect(input).not.toHaveAttribute('aria-valuemax');
  });

  it('ArrowUp increments by step (snapped to the lattice)', async () => {
    const { container } = await render(
      `<input kjNumberInput aria-label="Qty" [kjValue]="2" [kjStep]="2" />`,
      { imports: [KjNumberInput] },
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveAttribute('aria-valuenow', '4');
  });

  it('ArrowDown decrements by step', async () => {
    const { container } = await render(
      `<input kjNumberInput aria-label="Qty" [kjValue]="3" [kjStep]="1" />`,
      { imports: [KjNumberInput] },
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-valuenow', '2');
  });

  it('PageUp adds pageStep (10× step by default)', async () => {
    const { container } = await render(
      `<input kjNumberInput aria-label="Qty" [kjValue]="0" [kjStep]="2" />`,
      { imports: [KjNumberInput] },
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'PageUp' });
    expect(input).toHaveAttribute('aria-valuenow', '20');
  });

  it('Home jumps to kjMin and End jumps to kjMax', async () => {
    const { container } = await render(
      `<input kjNumberInput aria-label="Qty" [kjValue]="3" [kjMin]="0" [kjMax]="10" />`,
      { imports: [KjNumberInput] },
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'Home' });
    expect(input).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(input, { key: 'End' });
    expect(input).toHaveAttribute('aria-valuenow', '10');
  });

  it('clamps to kjMax when stepping past the upper bound', async () => {
    const { container } = await render(
      `<input kjNumberInput aria-label="Qty" [kjValue]="9" [kjStep]="5" [kjMax]="10" />`,
      { imports: [KjNumberInput] },
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveAttribute('aria-valuenow', '10');
  });

  it('uses type="text" by default', async () => {
    const { container } = await render(`<input kjNumberInput aria-label="A" />`, { imports: [KjNumberInput] });
    expect(container.querySelector('input')).toHaveAttribute('type', 'text');
  });

  it('uses type="number" when kjUseNativeNumber=true', async () => {
    const { container } = await render(
      `<input kjNumberInput aria-label="B" kjUseNativeNumber />`,
      { imports: [KjNumberInput] },
    );
    expect(container.querySelector('input')).toHaveAttribute('type', 'number');
  });

  it('passes axe audit with a label', async () => {
    const { container } = await render(
      `<label for="qty">Quantity</label><input id="qty" kjNumberInput [kjValue]="3" />`,
      { imports: [KjNumberInput] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('KjNumberStepper', () => {
  it('increments the value when clicked with kjStep="up"', async () => {
    const { container } = await render(
      `<div kjNumberInputGroup>
         <input kjNumberInput aria-label="Qty" [kjValue]="3" />
         <button kjNumberStepper kjStep="up" aria-label="Increase">+</button>
       </div>`,
      { imports: [KjNumberInput, KjNumberStepper, KjNumberInputGroup] },
    );
    const input = container.querySelector('input')!;
    const button = container.querySelector('button')!;
    fireEvent.click(button);
    expect(input).toHaveAttribute('aria-valuenow', '4');
  });

  it('decrements the value when clicked with kjStep="down"', async () => {
    const { container } = await render(
      `<div kjNumberInputGroup>
         <input kjNumberInput aria-label="Qty" [kjValue]="3" />
         <button kjNumberStepper kjStep="down" aria-label="Decrease">-</button>
       </div>`,
      { imports: [KjNumberInput, KjNumberStepper, KjNumberInputGroup] },
    );
    const input = container.querySelector('input')!;
    const button = container.querySelector('button')!;
    fireEvent.click(button);
    expect(input).toHaveAttribute('aria-valuenow', '2');
  });

  it('reflects bounds-aware aria-disabled when at the max bound', async () => {
    const { container } = await render(
      `<div kjNumberInputGroup>
         <input kjNumberInput aria-label="Qty" [kjValue]="10" [kjMax]="10" />
         <button kjNumberStepper kjStep="up" aria-label="Increase">+</button>
       </div>`,
      { imports: [KjNumberInput, KjNumberStepper, KjNumberInputGroup] },
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('forces type="button" on the host', async () => {
    const { container } = await render(
      `<div kjNumberInputGroup>
         <input kjNumberInput aria-label="Qty" />
         <button kjNumberStepper kjStep="up" aria-label="Increase">+</button>
       </div>`,
      { imports: [KjNumberInput, KjNumberStepper, KjNumberInputGroup] },
    );
    expect(container.querySelector('button')).toHaveAttribute('type', 'button');
  });

  it('is removed from the tab sequence (tabindex="-1")', async () => {
    const { container } = await render(
      `<div kjNumberInputGroup>
         <input kjNumberInput aria-label="Qty" />
         <button kjNumberStepper kjStep="up" aria-label="Increase">+</button>
       </div>`,
      { imports: [KjNumberInput, KjNumberStepper, KjNumberInputGroup] },
    );
    expect(container.querySelector('button')).toHaveAttribute('tabindex', '-1');
  });

// arch F-2 — the number-input family's boolean inputs all carry
// `transform: booleanAttribute`. Four of them default to `true`, so the
// meaningful static form there is `kjAllowNegative="false"`; Angular's
// `booleanAttribute` is the only transform that maps the string `"false"`
// to `false`.
describe('KjNumberInput — bare boolean attributes (arch F-2)', () => {
  it('bare kjReadonly reflects readonly + aria-readonly', async () => {
    const { container } = await render(
      `<input kjNumberInput kjReadonly aria-label="Qty" />`,
      { imports: [KjNumberInput] },
    );
    const el = container.querySelector('input') as HTMLInputElement;
    expect(el.hasAttribute('readonly')).toBe(true);
    expect(el.getAttribute('aria-readonly')).toBe('true');
  });

  it('bare kjUseNativeNumber flips the element to type="number"', async () => {
    const { container } = await render(
      `<input kjNumberInput kjUseNativeNumber aria-label="Qty" />`,
      { imports: [KjNumberInput] },
    );
    expect(container.querySelector('input')).toHaveAttribute('type', 'number');
  });

  it('kjAllowNegative="false" turns a default-true flag off', async () => {
    const { container } = await render(
      `<input kjNumberInput kjAllowNegative="false" aria-label="Qty" />`,
      { imports: [KjNumberInput] },
    );
    const el = container.querySelector('input') as HTMLInputElement;
    const minus = new KeyboardEvent('keydown', { key: '-', bubbles: true, cancelable: true });
    el.dispatchEvent(minus);
    expect(minus.defaultPrevented).toBe(true);
  });

  it('the same flag left at its default still accepts a minus sign', async () => {
    const { container } = await render(
      `<input kjNumberInput aria-label="Qty" />`,
      { imports: [KjNumberInput] },
    );
    const el = container.querySelector('input') as HTMLInputElement;
    const minus = new KeyboardEvent('keydown', { key: '-', bubbles: true, cancelable: true });
    el.dispatchEvent(minus);
    expect(minus.defaultPrevented).toBe(false);
  });

  it('bare kjDisabled on a stepper reflects aria-disabled', async () => {
    const { container } = await render(
      `<div kjNumberInputGroup>
         <input kjNumberInput aria-label="Qty" />
         <button kjNumberStepper kjStep="up" kjDisabled aria-label="Increase">+</button>
       </div>`,
      { imports: [KjNumberInput, KjNumberStepper, KjNumberInputGroup] },
    );
    const btn = container.querySelector('button') as HTMLElement;
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.hasAttribute('data-disabled')).toBe(true);
  });
});
});
