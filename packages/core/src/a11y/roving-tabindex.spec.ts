import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjRovingTabindex,
  KjRovingTabindexItemDirective,
} from './roving-tabindex';

expect.extend(toHaveNoViolations);

const template = `
  <div kjRovingTabindex role="toolbar" aria-label="Formatting">
    <button kjRovingTabindexItem>Bold</button>
    <button kjRovingTabindexItem>Italic</button>
    <button kjRovingTabindexItem>Underline</button>
  </div>`;
const imports = [KjRovingTabindex, KjRovingTabindexItemDirective];

describe('KjRovingTabindex', () => {
  it('renders all items', async () => {
    const { getAllByRole } = await render(template, { imports });
    expect(getAllByRole('button')).toHaveLength(3);
  });

  it('first item has tabindex 0, others -1', async () => {
    const { getAllByRole } = await render(template, { imports });
    const [first, second, third] = getAllByRole('button');
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
    expect(third).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus right on ArrowRight', async () => {
    const { getAllByRole, container } = await render(template, { imports });
    const [first, second] = getAllByRole('button');
    first.focus();
    fireEvent.keyDown(container.querySelector('[kjRovingTabindex]')!, { key: 'ArrowRight' });
    expect(second).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus left on ArrowLeft', async () => {
    const { getAllByRole, container } = await render(template, { imports });
    const [first, second] = getAllByRole('button');
    second.focus();
    fireEvent.keyDown(container.querySelector('[kjRovingTabindex]')!, { key: 'ArrowLeft' });
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
  });

  it('wraps to last item on ArrowLeft from first', async () => {
    const { getAllByRole, container } = await render(template, { imports });
    const buttons = getAllByRole('button');
    buttons[0].focus();
    fireEvent.keyDown(container.querySelector('[kjRovingTabindex]')!, { key: 'ArrowLeft' });
    expect(buttons[2]).toHaveAttribute('tabindex', '0');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
