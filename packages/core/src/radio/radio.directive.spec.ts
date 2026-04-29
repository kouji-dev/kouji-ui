import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjRadioGroupDirective, KjRadioDirective } from './radio.directive';

expect.extend(toHaveNoViolations);

const template = `<div kjRadioGroup [(kjValue)]="selected" aria-label="Opts"><div kjRadio [kjRadioValue]="'a'" tabindex="0">A</div><div kjRadio [kjRadioValue]="'b'" tabindex="-1">B</div></div>`;
const imports = [KjRadioGroupDirective, KjRadioDirective];

describe('KjRadioGroupDirective', () => {
  it('has radiogroup role', async () => {
    const { getByRole } = await render(template, { imports, componentProperties: { selected: 'a' } });
    expect(getByRole('radiogroup')).toBeInTheDocument();
  });

  it('radio items have role=radio', async () => {
    const { getAllByRole } = await render(template, { imports, componentProperties: { selected: 'a' } });
    expect(getAllByRole('radio')).toHaveLength(2);
  });

  it('selected radio has aria-checked=true', async () => {
    const { getAllByRole } = await render(template, { imports, componentProperties: { selected: 'a' } });
    expect(getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking radio selects it', async () => {
    const { getAllByRole } = await render(template, { imports, componentProperties: { selected: 'a' } });
    fireEvent.click(getAllByRole('radio')[1]);
    expect(getAllByRole('radio')[1]).toHaveAttribute('aria-checked', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports, componentProperties: { selected: 'a' } });
    expect(await axe(container)).toHaveNoViolations();
  });
});
