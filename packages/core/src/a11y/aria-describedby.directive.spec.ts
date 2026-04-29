import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjAriaDescribedByDirective } from './aria-describedby.directive';

expect.extend(toHaveNoViolations);

describe('KjAriaDescribedByDirective', () => {
  it('sets aria-describedby from a single id string', async () => {
    const { container } = await render(
      `<input kjAriaDescribedBy [kjDescribedBy]="'hint-1'" />
       <span id="hint-1">This is a hint</span>`,
      { imports: [KjAriaDescribedByDirective] },
    );
    expect(container.querySelector('input')).toHaveAttribute('aria-describedby', 'hint-1');
  });

  it('sets aria-describedby from multiple ids', async () => {
    const { container } = await render(
      `<input kjAriaDescribedBy [kjDescribedBy]="['hint-1', 'error-1']" />
       <span id="hint-1">Hint</span>
       <span id="error-1">Error</span>`,
      { imports: [KjAriaDescribedByDirective] },
    );
    expect(container.querySelector('input')).toHaveAttribute(
      'aria-describedby',
      'hint-1 error-1',
    );
  });

  it('removes aria-describedby when given empty array', async () => {
    const { container } = await render(
      `<input kjAriaDescribedBy [kjDescribedBy]="[]" />`,
      { imports: [KjAriaDescribedByDirective] },
    );
    expect(container.querySelector('input')).not.toHaveAttribute('aria-describedby');
  });

  it('removes aria-describedby when given empty string', async () => {
    const { container } = await render(
      `<input kjAriaDescribedBy [kjDescribedBy]="''" />`,
      { imports: [KjAriaDescribedByDirective] },
    );
    expect(container.querySelector('input')).not.toHaveAttribute('aria-describedby');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<label for="f">Name</label>
       <input id="f" kjAriaDescribedBy [kjDescribedBy]="'hint'" />
       <span id="hint">Enter your full name</span>`,
      { imports: [KjAriaDescribedByDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
