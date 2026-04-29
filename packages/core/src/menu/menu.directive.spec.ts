import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjMenuDirective, KjMenuTriggerDirective, KjMenuContentDirective, KjMenuItemDirective } from './menu.directive';

expect.extend(toHaveNoViolations);
const imports = [KjMenuDirective, KjMenuTriggerDirective, KjMenuContentDirective, KjMenuItemDirective];
const template = `<div kjMenu><button kjMenuTrigger>Actions</button><div role="menu" kjMenuContent><button kjMenuItem role="menuitem">Edit</button><button kjMenuItem role="menuitem">Delete</button></div></div>`;

describe('KjMenuDirective', () => {
  it('menu content hidden by default', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjMenuContent]')).toHaveAttribute('hidden', '');
  });
  it('trigger opens menu', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjMenuTrigger]')!);
    expect(container.querySelector('[kjMenuContent]')).not.toHaveAttribute('hidden');
  });
  it('Escape closes menu', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjMenuTrigger]')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('[kjMenuContent]')).toHaveAttribute('hidden', '');
  });
  it('menu items close menu on click', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjMenuTrigger]')!);
    fireEvent.click(container.querySelector('[kjMenuItem]')!);
    expect(container.querySelector('[kjMenuContent]')).toHaveAttribute('hidden', '');
  });
  it('passes axe audit when open', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjMenuTrigger]')!);
    expect(await axe(container)).toHaveNoViolations();
  });
});
