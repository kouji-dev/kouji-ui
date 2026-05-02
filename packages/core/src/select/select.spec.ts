import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjSelect, KjSelectTrigger, KjSelectContent, KjOption } from './select';

expect.extend(toHaveNoViolations);

const imports = [KjSelect, KjSelectTrigger, KjSelectContent, KjOption];
const template = `
  <div kjSelect [(kjSelectValue)]="val">
    <button kjSelectTrigger aria-haspopup="listbox">Select fruit</button>
    <div kjSelectContent cdkListbox role="listbox" [hidden]="true">
      <div kjOption [kjOptionValue]="'apple'" cdkOption="apple" role="option">Apple</div>
      <div kjOption [kjOptionValue]="'banana'" cdkOption="banana" role="option">Banana</div>
    </div>
  </div>`;

describe('KjSelect', () => {
  it('listbox hidden by default', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    expect(container.querySelector('[kjSelectContent]')).toHaveAttribute('hidden', '');
  });

  it('trigger opens listbox', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    expect(container.querySelector('[kjSelectContent]')).not.toHaveAttribute('hidden');
  });

  it('trigger sets aria-expanded', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    expect(container.querySelector('[kjSelectTrigger]')).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking option selects and closes', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    fireEvent.click(container.querySelector('[kjOption]')!);
    expect(container.querySelector('[kjSelectContent]')).toHaveAttribute('hidden', '');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    expect(await axe(container)).toHaveNoViolations();
  });
});
