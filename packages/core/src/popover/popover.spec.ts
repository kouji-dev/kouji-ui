import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjPopover, KjPopoverTrigger,
  KjPopoverContent, KjPopoverClose,
} from './popover';

expect.extend(toHaveNoViolations);
const imports = [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverClose];
const template = `<div kjPopover><button kjPopoverTrigger>Open</button><div kjPopoverContent role="dialog" aria-label="Options">Content</div></div>`;

describe('KjPopover', () => {
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

  it('trigger sets aria-controls pointing to content id', async () => {
    const { container } = await render(template, { imports });
    const t = container.querySelector('[kjPopoverTrigger]')!;
    const c = container.querySelector('[kjPopoverContent]')!;
    expect(t.getAttribute('aria-controls')).toBe(c.id);
  });

  it('kjPopoverClose closes the popover', async () => {
    const closeTemplate = `<div kjPopover><button kjPopoverTrigger>Open</button><div kjPopoverContent role="dialog" aria-label="Options"><button kjPopoverClose>Close</button></div></div>`;
    const { container } = await render(closeTemplate, { imports });
    fireEvent.click(container.querySelector('[kjPopoverTrigger]')!);
    expect(container.querySelector('[kjPopoverContent]')).not.toHaveAttribute('hidden');
    fireEvent.click(container.querySelector('[kjPopoverClose]')!);
    expect(container.querySelector('[kjPopoverContent]')).toHaveAttribute('hidden', '');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
