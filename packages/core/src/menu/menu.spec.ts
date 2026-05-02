import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjMenu, KjMenuTrigger, KjMenuItem } from './menu';

expect.extend(toHaveNoViolations);

const imports = [KjMenu, KjMenuTrigger, KjMenuItem];
// CDK menu uses template references for the trigger; kjMenuTriggerFor is the public alias
const template = `
  <button kjMenuTrigger [kjMenuTriggerFor]="menu">Actions</button>
  <ng-template #menu>
    <div kjMenu role="menu">
      <button kjMenuItem role="menuitem">Edit</button>
      <button kjMenuItem role="menuitem">Delete</button>
    </div>
  </ng-template>`;

describe('KjMenu', () => {
  it('renders trigger button', async () => {
    const { getByRole } = await render(template, { imports });
    expect(getByRole('button', { name: 'Actions' })).toBeInTheDocument();
  });

  it('trigger has aria-haspopup', async () => {
    const { getByRole } = await render(template, { imports });
    expect(getByRole('button', { name: 'Actions' })).toHaveAttribute('aria-haspopup');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
