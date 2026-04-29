import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjDisabledDirective } from './disabled.directive';

expect.extend(toHaveNoViolations);

describe('KjDisabledDirective', () => {
  it('sets aria-disabled="true" when disabled', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('sets data-disabled attribute when disabled', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(container.querySelector('button')).toHaveAttribute('data-disabled', '');
  });

  it('removes aria-disabled when not disabled', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="false">Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(container.querySelector('button')).not.toHaveAttribute('aria-disabled');
  });

  it('defaults to not disabled', async () => {
    const { container } = await render(
      `<button kjDisabled>Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(container.querySelector('button')).not.toHaveAttribute('aria-disabled');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
