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

  // The bare attribute is the HTML boolean-attribute convention: `<button
  // kjDisabled>` parses as `kjDisabled=""` and `booleanAttribute('')` is
  // `true`, exactly as `<input disabled>` means disabled. The previous version
  // of this test asserted the opposite and had been red since the input gained
  // its transform. Use `[kjDisabled]="false"` to apply the directive without
  // disabling (covered above).
  it('treats the bare attribute as disabled', async () => {
    const { container } = await render(
      `<button kjDisabled>Submit</button>`,
      { imports: [KjDisabled] },
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('is not disabled when the input is bound to false', async () => {
    const { container } = await render(
      `<button [kjDisabled]="false">Submit</button>`,
      { imports: [KjDisabled] },
    );
    expect(container.querySelector('button')).not.toHaveAttribute('data-disabled');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabled] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
