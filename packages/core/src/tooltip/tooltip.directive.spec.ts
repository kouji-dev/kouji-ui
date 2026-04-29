import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTooltipDirective, KjTooltipTriggerDirective, KjTooltipContentDirective } from './tooltip.directive';

expect.extend(toHaveNoViolations);
const imports = [KjTooltipDirective, KjTooltipTriggerDirective, KjTooltipContentDirective];

describe('KjTooltipDirective', () => {
  it('content hidden by default', async () => {
    const { container } = await render(`<div kjTooltip><button kjTooltipTrigger>Hover</button><span role="tooltip" kjTooltipContent>Tip</span></div>`, { imports });
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });
  it('shows on mouseenter', async () => {
    const { container } = await render(`<div kjTooltip><button kjTooltipTrigger>Hover</button><span role="tooltip" kjTooltipContent>Tip</span></div>`, { imports });
    fireEvent.mouseEnter(container.querySelector('[kjTooltipTrigger]')!);
    expect(container.querySelector('[kjTooltipContent]')).not.toHaveAttribute('hidden');
  });
  it('hides on mouseleave', async () => {
    const { container } = await render(`<div kjTooltip><button kjTooltipTrigger>Hover</button><span role="tooltip" kjTooltipContent>Tip</span></div>`, { imports });
    fireEvent.mouseEnter(container.querySelector('[kjTooltipTrigger]')!);
    fireEvent.mouseLeave(container.querySelector('[kjTooltipTrigger]')!);
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });
  it('passes axe audit when shown', async () => {
    const { container } = await render(`<div kjTooltip><button kjTooltipTrigger aria-describedby="t1">Info</button><span role="tooltip" id="t1" kjTooltipContent>Info text</span></div>`, { imports });
    fireEvent.mouseEnter(container.querySelector('[kjTooltipTrigger]')!);
    expect(await axe(container)).toHaveNoViolations();
  });
});
