import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjDisabled } from './disabled';

expect.extend(toHaveNoViolations);

describe('KjDisabled', () => {
  it('sets aria-disabled="true" when disabled', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabled] },
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('sets data-disabled attribute when disabled', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabled] },
    );
    expect(container.querySelector('button')).toHaveAttribute('data-disabled', '');
  });

  it('removes aria-disabled when not disabled', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="false">Submit</button>`,
      { imports: [KjDisabled] },
    );
    expect(container.querySelector('button')).not.toHaveAttribute('aria-disabled');
  });

  it('defaults to not disabled', async () => {
    const { container } = await render(
      `<button kjDisabled>Submit</button>`,
      { imports: [KjDisabled] },
    );
    expect(container.querySelector('button')).not.toHaveAttribute('aria-disabled');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabled] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
