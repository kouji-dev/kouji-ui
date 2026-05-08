import { render, fireEvent } from '@testing-library/angular';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjColorPicker,
  KjColorPickerAlphaSlider,
  KjColorPickerArea,
  KjColorPickerHueSlider,
  KjColorPickerInput,
  KjColorPickerPanel,
  KjColorPickerTrigger,
} from './color-picker';
import {
  kjHsvToRgb,
  kjParseHex,
  kjRgbToHex,
  kjRgbToHsv,
} from './color-picker.utils';

expect.extend(toHaveNoViolations);

const directiveImports = [
  KjColorPicker,
  KjColorPickerTrigger,
  KjColorPickerPanel,
  KjColorPickerArea,
  KjColorPickerHueSlider,
  KjColorPickerAlphaSlider,
  KjColorPickerInput,
];

const fullTemplate = `
  <div kjColorPicker [formControl]="ctrl" [kjShowAlpha]="showAlpha">
    <button kjColorPickerTrigger>open</button>
    <div kjColorPickerPanel>
      <div kjColorPickerArea></div>
      <input kjColorPickerHueSlider />
      <input kjColorPickerAlphaSlider />
      <input kjColorPickerInput />
    </div>
  </div>
`;

/** When `bodyPortal` mounts the panel out to <body>, search there too. */
function findPanel(container: HTMLElement): HTMLElement {
  return (
    container.querySelector('[kjColorPickerPanel]') ??
    document.body.querySelector('[kjColorPickerPanel]')!
  ) as HTMLElement;
}

describe('color-picker utils', () => {
  it('parses 6-char hex with leading hash', () => {
    expect(kjParseHex('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('parses 3-char hex without leading hash', () => {
    expect(kjParseHex('f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('parses 8-char hex with alpha', () => {
    const r = kjParseHex('#ff000080');
    expect(r?.r).toBe(255);
    expect(r?.g).toBe(0);
    expect(r?.b).toBe(0);
    expect(r?.a).toBeCloseTo(0x80 / 255, 5);
  });

  it('returns null for invalid hex', () => {
    expect(kjParseHex('not-a-color')).toBeNull();
    expect(kjParseHex('#xyzxyz')).toBeNull();
    expect(kjParseHex('#ff')).toBeNull();
  });

  it('round-trips RGB → HSV → RGB for primary red', () => {
    const hsv = kjRgbToHsv({ r: 255, g: 0, b: 0, a: 1 });
    const back = kjHsvToRgb(hsv);
    expect(back.r).toBe(255);
    expect(back.g).toBe(0);
    expect(back.b).toBe(0);
  });

  it('round-trips RGB → HSV → RGB for arbitrary color', () => {
    const original = { r: 184, g: 245, b: 0, a: 1 };
    const hsv = kjRgbToHsv(original);
    const back = kjHsvToRgb(hsv);
    expect(back.r).toBe(original.r);
    expect(back.g).toBe(original.g);
    expect(back.b).toBe(original.b);
  });

  it('formats RGB to lowercase six-char hex by default', () => {
    expect(kjRgbToHex({ r: 0xab, g: 0xcd, b: 0xef, a: 1 }, false))
      .toBe('#abcdef');
  });

  it('formats RGB to eight-char hex when alpha is requested', () => {
    expect(kjRgbToHex({ r: 0, g: 0, b: 0, a: 0.5 }, true))
      .toBe('#00000080');
  });
});

describe('KjColorPicker', () => {
  function makeCtrl(initial = '#ff0000') {
    return new FormControl(initial);
  }

  it('panel is hidden by default', async () => {
    const { container } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    expect(findPanel(container)).toHaveAttribute('hidden', '');
  });

  it('clicking the trigger opens the panel', async () => {
    const { container } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    fireEvent.click(container.querySelector('[kjColorPickerTrigger]')!);
    expect(findPanel(container)).not.toHaveAttribute('hidden');
  });

  it('trigger reflects aria-expanded based on open state', async () => {
    const { container } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    const trigger = container.querySelector('[kjColorPickerTrigger]')!;
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('trigger has aria-haspopup="dialog"', async () => {
    const { container } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    const trigger = container.querySelector('[kjColorPickerTrigger]')!;
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('panel has role="dialog"', async () => {
    const { container } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    const panel = findPanel(container);
    expect(panel).toHaveAttribute('role', 'dialog');
  });

  it('sat/value area has role="slider" with aria-valuetext', async () => {
    const { container } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    const area = container.querySelector('[kjColorPickerArea]')!;
    expect(area).toHaveAttribute('role', 'slider');
    expect(area.getAttribute('aria-valuetext')).toMatch(/saturation/i);
  });

  it('arrow keys on the sat/value area update aria-valuenow', async () => {
    const { container } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    fireEvent.click(container.querySelector('[kjColorPickerTrigger]')!);
    const area = container.querySelector('[kjColorPickerArea]')
      ?? document.body.querySelector('[kjColorPickerArea]')!;
    // Initial red has saturation=1; ArrowLeft is the unambiguous direction to move.
    const before = area.getAttribute('aria-valuenow');
    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    const after = area.getAttribute('aria-valuenow');
    expect(after).not.toBe(before);
  });

  it('hex input commits a parseable value on Enter', async () => {
    const ctrl = makeCtrl();
    const { container, fixture } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl, showAlpha: false },
    });
    fireEvent.click(container.querySelector('[kjColorPickerTrigger]')!);
    const input = (container.querySelector('[kjColorPickerInput]')
      ?? document.body.querySelector('[kjColorPickerInput]')) as HTMLInputElement;
    input.value = '#00ff00';
    fireEvent.input(input, { target: input });
    fireEvent.keyDown(input, { key: 'Enter' });
    fixture.detectChanges();
    expect(ctrl.value).toBe('#00ff00');
  });

  it('writeValue parses external hex and reflects it on the trigger', async () => {
    const ctrl = makeCtrl('#000000');
    const { container, fixture } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl, showAlpha: false },
    });
    ctrl.setValue('#0000ff');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const trigger = container.querySelector('[kjColorPickerTrigger]') as HTMLElement;
    expect(trigger.style.getPropertyValue('--kj-color-picker-current'))
      .toBe('#0000ff');
  });

  it('hue slider has aria-label="Hue" and is a native range input', async () => {
    const { container } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    const hue = container.querySelector('[kjColorPickerHueSlider]')!;
    expect(hue).toHaveAttribute('aria-label', 'Hue');
    expect(hue).toHaveAttribute('type', 'range');
  });

  it('alpha slider mounts but is disabled until kjShowAlpha is true', async () => {
    const { container, fixture } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    const alpha = container.querySelector('[kjColorPickerAlphaSlider]') as HTMLInputElement;
    expect(alpha.disabled).toBe(true);
    (fixture.componentInstance as { showAlpha: boolean }).showAlpha = true;
    fixture.detectChanges();
    expect(alpha.disabled).toBe(false);
  });

  it('panel passes axe audit when open', async () => {
    const { container } = await render(fullTemplate, {
      imports: [...directiveImports, ReactiveFormsModule],
      componentProperties: { ctrl: makeCtrl(), showAlpha: false },
    });
    fireEvent.click(container.querySelector('[kjColorPickerTrigger]')!);
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});
