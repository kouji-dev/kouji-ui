import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTooltipContent, KjTooltipTrigger } from './tooltip';

expect.extend(toHaveNoViolations);
const imports = [KjTooltipTrigger, KjTooltipContent];

// [kjTooltipTrigger]="t" is a property binding — it does not appear as a DOM attribute.
// Select the trigger element by its tag or by aria-describedby (always set per WAI-ARIA spec).
// Select the content element by [kjTooltipContent] which IS a static directive attribute.

describe('KjTooltipContent + KjTooltipTrigger', () => {
  it('content hidden by default', async () => {
    const { container } = await render(
      `<button [kjTooltipTrigger]="t">Hover</button>
       <span #t kjTooltipContent [kjTooltipDelay]="0" [kjTooltipHideDelay]="0">Tip</span>`,
      { imports },
    );
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });

  it('content has role=tooltip by default', async () => {
    const { container } = await render(
      `<button [kjTooltipTrigger]="t">Hover</button>
       <span #t kjTooltipContent [kjTooltipDelay]="0">Tip</span>`,
      { imports },
    );
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('role', 'tooltip');
  });

  it('shows on mouseenter (no delay)', async () => {
    const { container } = await render(
      `<button [kjTooltipTrigger]="t">Hover</button>
       <span #t kjTooltipContent [kjTooltipDelay]="0" [kjTooltipHideDelay]="0">Tip</span>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('button')!);
    expect(container.querySelector('[kjTooltipContent]')).not.toHaveAttribute('hidden');
  });

  it('hides on mouseleave (no delay)', async () => {
    const { container } = await render(
      `<button [kjTooltipTrigger]="t">Hover</button>
       <span #t kjTooltipContent [kjTooltipDelay]="0" [kjTooltipHideDelay]="0">Tip</span>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('button')!);
    fireEvent.mouseLeave(container.querySelector('button')!);
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });

  it('hides on Escape key', async () => {
    const { container } = await render(
      `<button [kjTooltipTrigger]="t">Hover</button>
       <span #t kjTooltipContent [kjTooltipDelay]="0">Tip</span>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('button')!);
    fireEvent.keyDown(container.querySelector('button')!, { key: 'Escape' });
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });

  it('hides on blur', async () => {
    const { container } = await render(
      `<button [kjTooltipTrigger]="t">Hover</button>
       <span #t kjTooltipContent [kjTooltipDelay]="0" [kjTooltipHideDelay]="0">Tip</span>`,
      { imports },
    );
    fireEvent.focus(container.querySelector('button')!);
    fireEvent.blur(container.querySelector('button')!);
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });

  it('trigger has aria-describedby wired to content id always', async () => {
    const { container } = await render(
      `<button [kjTooltipTrigger]="t">Info</button>
       <span #t kjTooltipContent [kjTooltipDelay]="0">Info text</span>`,
      { imports },
    );
    const trigger = container.querySelector('button')!;
    const content = container.querySelector('[kjTooltipContent]')!;
    expect(trigger.getAttribute('aria-describedby')).toBeTruthy();
    expect(trigger.getAttribute('aria-describedby')).toBe(content.id);
  });

  it('role can be customised', async () => {
    const { container } = await render(
      `<button [kjTooltipTrigger]="t">X</button>
       <span #t kjTooltipContent kjTooltipRole="note" [kjTooltipDelay]="0">Note</span>`,
      { imports },
    );
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('role', 'note');
  });

  it('passes axe audit when shown', async () => {
    const { container } = await render(
      `<button [kjTooltipTrigger]="t">Info</button>
       <span #t kjTooltipContent [kjTooltipDelay]="0">Info text</span>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('button')!);
    expect(await axe(container)).toHaveNoViolations();
  });
});
