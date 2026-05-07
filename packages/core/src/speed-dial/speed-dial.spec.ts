import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjButton } from '../button/button';
import {
  KjSpeedDial,
  KjSpeedDialAction,
  KjSpeedDialActions,
  KjSpeedDialTrigger,
} from './index';

expect.extend(toHaveNoViolations);

const imports = [
  KjButton,
  KjSpeedDial,
  KjSpeedDialTrigger,
  KjSpeedDialActions,
  KjSpeedDialAction,
];

const TEMPLATE = `
  <div kjSpeedDial>
    <button kjButton kjSpeedDialTrigger aria-label="Open">+</button>
    <div kjSpeedDialActions>
      <button kjButton kjSpeedDialAction aria-label="Edit">E</button>
      <button kjButton kjSpeedDialAction aria-label="Share">S</button>
    </div>
  </div>
`;

describe('KjSpeedDial', () => {
  it('starts collapsed and reflects ARIA on the trigger', async () => {
    const { getByLabelText, container } = await render(TEMPLATE, { imports });
    const trigger = getByLabelText('Open');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger.getAttribute('aria-controls')).toMatch(/^kj-speed-dial-\d+$/);

    const actions = container.querySelector('[kjSpeedDialActions]') as HTMLElement;
    expect(actions).toHaveAttribute('aria-hidden', 'true');
    expect(actions.id).toMatch(/^kj-speed-dial-\d+$/);
    expect(trigger.getAttribute('aria-controls')).toBe(actions.id);
  });

  it('reflects kjDirection as data-direction on root and actions container', async () => {
    const { container } = await render(
      `
        <div kjSpeedDial kjDirection="left">
          <button kjButton kjSpeedDialTrigger aria-label="Open">+</button>
          <div kjSpeedDialActions>
            <button kjButton kjSpeedDialAction aria-label="A">A</button>
          </div>
        </div>
      `,
      { imports },
    );

    const root = container.querySelector('[kjSpeedDial]') as HTMLElement;
    const actions = container.querySelector('[kjSpeedDialActions]') as HTMLElement;
    expect(root).toHaveAttribute('data-direction', 'left');
    expect(actions).toHaveAttribute('data-direction', 'left');
  });

  it('toggles open on trigger click and expands the cluster', async () => {
    const { getByLabelText, container } = await render(TEMPLATE, { imports });
    const trigger = getByLabelText('Open');
    const actions = container.querySelector('[kjSpeedDialActions]') as HTMLElement;
    const root = container.querySelector('[kjSpeedDial]') as HTMLElement;

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('data-state', 'open');
    expect(actions).not.toHaveAttribute('aria-hidden');
    expect(actions).toHaveAttribute('data-expanded', '');
    expect(root).toHaveAttribute('data-expanded', '');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(actions).toHaveAttribute('aria-hidden', 'true');
  });

  it('closes when an action is activated (default kjCloseOnActivate=true)', async () => {
    const { getByLabelText } = await render(TEMPLATE, { imports });
    fireEvent.click(getByLabelText('Open'));
    expect(getByLabelText('Open')).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(getByLabelText('Edit'));
    expect(getByLabelText('Open')).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the dial open when kjCloseOnActivate=false', async () => {
    const { getByLabelText } = await render(
      `
        <div kjSpeedDial>
          <button kjButton kjSpeedDialTrigger aria-label="Open">+</button>
          <div kjSpeedDialActions>
            <button kjButton kjSpeedDialAction [kjCloseOnActivate]="false" aria-label="Stay">S</button>
          </div>
        </div>
      `,
      { imports },
    );
    fireEvent.click(getByLabelText('Open'));
    fireEvent.click(getByLabelText('Stay'));
    expect(getByLabelText('Open')).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes when Escape is pressed on the trigger', async () => {
    const { getByLabelText } = await render(TEMPLATE, { imports });
    fireEvent.click(getByLabelText('Open'));
    expect(getByLabelText('Open')).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(getByLabelText('Open'), { key: 'Escape' });
    expect(getByLabelText('Open')).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not open when kjDisabled', async () => {
    const { getByLabelText } = await render(
      `
        <div kjSpeedDial [kjDisabled]="true">
          <button kjButton kjSpeedDialTrigger aria-label="Open">+</button>
          <div kjSpeedDialActions>
            <button kjButton kjSpeedDialAction aria-label="A">A</button>
          </div>
        </div>
      `,
      { imports },
    );
    fireEvent.click(getByLabelText('Open'));
    expect(getByLabelText('Open')).toHaveAttribute('aria-expanded', 'false');
  });

  it('passes axe audit when collapsed', async () => {
    const { container } = await render(TEMPLATE, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe audit when expanded', async () => {
    const { getByLabelText, container } = await render(TEMPLATE, { imports });
    fireEvent.click(getByLabelText('Open'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
