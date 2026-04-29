import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjPopoverDirective, KjPopoverTriggerDirective, KjPopoverContentDirective } from './popover.directive';

expect.extend(toHaveNoViolations);
const imports = [KjPopoverDirective, KjPopoverTriggerDirective, KjPopoverContentDirective];
const template = `<div kjPopover><button kjPopoverTrigger>Open</button><div kjPopoverContent>Content</div></div>`;

describe('KjPopoverDirective', () => {
  it('content hidden by default', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjPopoverContent]')).toHaveAttribute('hidden', '');
  });
  it('trigger toggles content', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjPopoverTrigger]')!);
    expect(container.querySelector('[kjPopoverContent]')).not.toHaveAttribute('hidden');
  });
  it('trigger sets aria-expanded', async () => {
    const { container } = await render(template, { imports });
    const t = container.querySelector('[kjPopoverTrigger]')!;
    expect(t).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(t);
    expect(t).toHaveAttribute('aria-expanded', 'true');
  });
  it('passes axe audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
