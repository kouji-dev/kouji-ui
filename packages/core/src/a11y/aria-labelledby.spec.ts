import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjAriaLabelledBy } from './aria-labelledby';

expect.extend(toHaveNoViolations);

describe('KjAriaLabelledBy', () => {
  it('sets aria-labelledby from a single id string', async () => {
    const { container } = await render(
      `<section kjAriaLabelledBy [kjLabelledBy]="'h-1'">
         <h2 id="h-1">Features</h2>
       </section>`,
      { imports: [KjAriaLabelledBy] },
    );
    expect(container.querySelector('section')).toHaveAttribute('aria-labelledby', 'h-1');
  });

  it('sets aria-labelledby from multiple ids', async () => {
    const { container } = await render(
      `<section kjAriaLabelledBy [kjLabelledBy]="['h-1', 'h-2']">
         <h2 id="h-1">A</h2>
         <h2 id="h-2">B</h2>
       </section>`,
      { imports: [KjAriaLabelledBy] },
    );
    expect(container.querySelector('section')).toHaveAttribute('aria-labelledby', 'h-1 h-2');
  });

  it('removes aria-labelledby when given empty array', async () => {
    const { container } = await render(
      `<section kjAriaLabelledBy [kjLabelledBy]="[]"></section>`,
      { imports: [KjAriaLabelledBy] },
    );
    expect(container.querySelector('section')).not.toHaveAttribute('aria-labelledby');
  });

  it('removes aria-labelledby when given empty string', async () => {
    const { container } = await render(
      `<section kjAriaLabelledBy [kjLabelledBy]="''"></section>`,
      { imports: [KjAriaLabelledBy] },
    );
    expect(container.querySelector('section')).not.toHaveAttribute('aria-labelledby');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<section kjAriaLabelledBy [kjLabelledBy]="'h-1'">
         <h2 id="h-1">Features</h2>
         <p>Stuff</p>
       </section>`,
      { imports: [KjAriaLabelledBy] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
