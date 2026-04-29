import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFocusTrapDirective } from './focus-trap.directive';

expect.extend(toHaveNoViolations);

describe('KjFocusTrapDirective', () => {
  it('renders without error when enabled', async () => {
    const { container } = await render(
      `<div kjFocusTrap [kjFocusTrapEnabled]="true">
        <button>First</button>
        <button>Last</button>
      </div>`,
      { imports: [KjFocusTrapDirective] },
    );
    expect(container.querySelector('[kjFocusTrap]')).toBeInTheDocument();
  });

  it('renders without error when disabled', async () => {
    const { container } = await render(
      `<div kjFocusTrap [kjFocusTrapEnabled]="false">
        <button>First</button>
      </div>`,
      { imports: [KjFocusTrapDirective] },
    );
    expect(container.querySelector('[kjFocusTrap]')).toBeInTheDocument();
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<div role="dialog" aria-label="Test dialog" kjFocusTrap [kjFocusTrapEnabled]="true">
        <button>Action</button>
      </div>`,
      { imports: [KjFocusTrapDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
