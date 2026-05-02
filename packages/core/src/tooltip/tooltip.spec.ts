import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTooltip, KjTooltipTrigger, KjTooltipContent } from './tooltip';

expect.extend(toHaveNoViolations);
const imports = [KjTooltip, KjTooltipTrigger, KjTooltipContent];

// Use zero delays in tests to avoid fake timer complexity.
const noDelay = `kjTooltip [kjTooltipDelay]="0" [kjTooltipHideDelay]="0"`;

describe('KjTooltip', () => {
  it('content hidden by default', async () => {
    const { container } = await render(
      `<div ${noDelay}><button kjTooltipTrigger>Hover</button><span role="tooltip" kjTooltipContent>Tip</span></div>`,
      { imports },
    );
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });

  it('shows on mouseenter (no delay)', async () => {
    const { container } = await render(
      `<div ${noDelay}><button kjTooltipTrigger>Hover</button><span role="tooltip" kjTooltipContent>Tip</span></div>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('[kjTooltipTrigger]')!);
    expect(container.querySelector('[kjTooltipContent]')).not.toHaveAttribute('hidden');
  });

  it('hides on mouseleave (no delay)', async () => {
    const { container } = await render(
      `<div ${noDelay}><button kjTooltipTrigger>Hover</button><span role="tooltip" kjTooltipContent>Tip</span></div>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('[kjTooltipTrigger]')!);
    fireEvent.mouseLeave(container.querySelector('[kjTooltipTrigger]')!);
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });

  it('hides on Escape key (no delay)', async () => {
    const { container } = await render(
      `<div ${noDelay}><button kjTooltipTrigger>Hover</button><span role="tooltip" kjTooltipContent>Tip</span></div>`,
      { imports },
    );
    const trigger = container.querySelector('[kjTooltipTrigger]')!;
    fireEvent.mouseEnter(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });

  it('trigger has aria-describedby pointing to tooltip', async () => {
    const { container } = await render(
      `<div ${noDelay}><button kjTooltipTrigger>Info</button><span role="tooltip" kjTooltipContent>Info text</span></div>`,
      { imports },
    );
    const trigger = container.querySelector('[kjTooltipTrigger]')!;
    const content = container.querySelector('[kjTooltipContent]')!;
    expect(trigger.getAttribute('aria-describedby')).toBeTruthy();
    expect(trigger.getAttribute('aria-describedby')).toBe(content.id);
  });

  it('passes axe audit when shown', async () => {
    const { container } = await render(
      `<div ${noDelay}><button kjTooltipTrigger>Info</button><span role="tooltip" kjTooltipContent>Info text</span></div>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('[kjTooltipTrigger]')!);
    expect(await axe(container)).toHaveNoViolations();
  });
});
