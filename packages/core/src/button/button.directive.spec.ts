import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjButtonDirective } from './button.directive';

expect.extend(toHaveNoViolations);

describe('KjButtonDirective', () => {
  it('renders a button element', async () => {
    const { getByRole } = await render(`<button kjButton>Click</button>`, { imports: [KjButtonDirective] });
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('sets data-variant attribute', async () => {
    const { getByRole } = await render(`<button kjButton [kjVariant]="'destructive'">Delete</button>`, { imports: [KjButtonDirective] });
    expect(getByRole('button')).toHaveAttribute('data-variant', 'destructive');
  });

  it('sets data-size attribute', async () => {
    const { getByRole } = await render(`<button kjButton [kjSize]="'sm'">Small</button>`, { imports: [KjButtonDirective] });
    expect(getByRole('button')).toHaveAttribute('data-size', 'sm');
  });

  it('sets aria-disabled when disabled via hostDirective', async () => {
    const { getByRole } = await render(`<button kjButton [kjDisabled]="true">Disabled</button>`, { imports: [KjButtonDirective] });
    expect(getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<button kjButton>Action</button>`, { imports: [KjButtonDirective] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
