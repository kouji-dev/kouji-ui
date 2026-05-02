import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFocusTrap } from './focus-trap';

expect.extend(toHaveNoViolations);

describe('KjFocusTrap', () => {
  it('renders without error when enabled', async () => {
    const { container } = await render(
      `<div kjFocusTrap [kjFocusTrapEnabled]="true">
        <button>First</button>
        <button>Last</button>
      </div>`,
      { imports: [KjFocusTrap] },
    );
    expect(container.querySelector('[kjFocusTrap]')).toBeInTheDocument();
  });

  it('renders without error when disabled', async () => {
    const { container } = await render(
      `<div kjFocusTrap [kjFocusTrapEnabled]="false">
        <button>First</button>
      </div>`,
      { imports: [KjFocusTrap] },
    );
    expect(container.querySelector('[kjFocusTrap]')).toBeInTheDocument();
  });

  it('wraps focus from last to first on Tab when enabled', async () => {
    const { container } = await render(
      `<div kjFocusTrap [kjFocusTrapEnabled]="true">
        <button>First</button>
        <button>Last</button>
      </div>`,
      { imports: [KjFocusTrap] },
    );
    const buttons = container.querySelectorAll('button');
    const last = buttons[buttons.length - 1] as HTMLElement;
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('wraps focus from first to last on Shift+Tab when enabled', async () => {
    const { container } = await render(
      `<div kjFocusTrap [kjFocusTrapEnabled]="true">
        <button>First</button>
        <button>Last</button>
      </div>`,
      { imports: [KjFocusTrap] },
    );
    const buttons = container.querySelectorAll('button');
    const first = buttons[0] as HTMLElement;
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('does not trap focus when disabled', async () => {
    const { container } = await render(
      `<div kjFocusTrap [kjFocusTrapEnabled]="false">
        <button>First</button>
        <button>Last</button>
      </div>`,
      { imports: [KjFocusTrap] },
    );
    const buttons = container.querySelectorAll('button');
    const last = buttons[buttons.length - 1] as HTMLElement;
    last.focus();
    // Tab should not redirect focus — no focus change from the handler.
    const activeBeforeTab = document.activeElement;
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    // When disabled, the handler does nothing, so focus stays on last.
    expect(document.activeElement).toBe(activeBeforeTab);
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<div role="dialog" aria-label="Test dialog" kjFocusTrap [kjFocusTrapEnabled]="true">
        <button>Action</button>
      </div>`,
      { imports: [KjFocusTrap] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
