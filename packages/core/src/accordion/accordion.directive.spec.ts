import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjAccordionDirective, KjAccordionItemDirective, KjAccordionTriggerDirective, KjAccordionContentDirective } from './accordion.directive';

expect.extend(toHaveNoViolations);
const imports = [KjAccordionDirective, KjAccordionItemDirective, KjAccordionTriggerDirective, KjAccordionContentDirective];
const template = `<div kjAccordion><div kjAccordionItem [kjItemValue]="'i1'"><button kjAccordionTrigger>Section</button><div kjAccordionContent>Content</div></div></div>`;

describe('KjAccordionDirective', () => {
  it('content hidden by default', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjAccordionContent]')).toHaveAttribute('hidden', '');
  });
  it('click trigger expands', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjAccordionTrigger]')!);
    expect(container.querySelector('[kjAccordionContent]')).not.toHaveAttribute('hidden');
  });
  it('trigger has aria-expanded=false when closed', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjAccordionTrigger]')).toHaveAttribute('aria-expanded', 'false');
  });
  it('trigger has aria-expanded=true when open', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjAccordionTrigger]')!);
    expect(container.querySelector('[kjAccordionTrigger]')).toHaveAttribute('aria-expanded', 'true');
  });
  it('passes axe audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
