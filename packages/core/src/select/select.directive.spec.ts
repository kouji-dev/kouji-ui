import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjSelectDirective, KjSelectTriggerDirective, KjSelectContentDirective, KjOptionDirective } from './select.directive';

expect.extend(toHaveNoViolations);

const imports = [KjSelectDirective, KjSelectTriggerDirective, KjSelectContentDirective, KjOptionDirective];
const template = `
  <div kjSelect [(kjSelectValue)]="val">
    <button kjSelectTrigger aria-haspopup="listbox">Select fruit</button>
    <div kjSelectContent cdkListbox role="listbox" [hidden]="true">
      <div kjOption [kjOptionValue]="'apple'" cdkOption="apple" role="option">Apple</div>
      <div kjOption [kjOptionValue]="'banana'" cdkOption="banana" role="option">Banana</div>
    </div>
  </div>`;

describe('KjSelectDirective', () => {
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
