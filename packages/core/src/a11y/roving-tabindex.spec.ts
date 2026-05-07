import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjRovingTabindex,
  KjRovingTabindexItemDirective,
} from './roving-tabindex';

expect.extend(toHaveNoViolations);

const template = `
  <div kjRovingTabindex role="toolbar" aria-label="Formatting">
    <button kjRovingTabindexItem>Bold</button>
    <button kjRovingTabindexItem>Italic</button>
    <button kjRovingTabindexItem>Underline</button>
  </div>`;
const imports = [KjRovingTabindex, KjRovingTabindexItemDirective];

describe('KjRovingTabindex', () => {
  it('renders all items', async () => {
    const { getAllByRole } = await render(template, { imports });
    expect(getAllByRole('button')).toHaveLength(3);
  });

  it('first item has tabindex 0, others -1', async () => {
    const { getAllByRole } = await render(template, { imports });
    const [first, second, third] = getAllByRole('button');
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
    expect(third).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus right on ArrowRight', async () => {
    const { getAllByRole, container } = await render(template, { imports });
    const [first, second] = getAllByRole('button');
    first.focus();
    fireEvent.keyDown(container.querySelector('[kjRovingTabindex]')!, { key: 'ArrowRight' });
    expect(second).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus left on ArrowLeft', async () => {
    const { getAllByRole, container } = await render(template, { imports });
    const [first, second] = getAllByRole('button');
    second.focus();
    fireEvent.keyDown(container.querySelector('[kjRovingTabindex]')!, { key: 'ArrowLeft' });
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
  });

  it('wraps to last item on ArrowLeft from first', async () => {
    const { getAllByRole, container } = await render(template, { imports });
    const buttons = getAllByRole('button');
    buttons[0].focus();
    fireEvent.keyDown(container.querySelector('[kjRovingTabindex]')!, { key: 'ArrowLeft' });
    expect(buttons[2]).toHaveAttribute('tabindex', '0');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('kjRovingOrientation', () => {
    const horizontalTemplate = `
      <div kjRovingTabindex="" kjRovingOrientation="horizontal" role="toolbar" aria-label="Formatting">
        <button kjRovingTabindexItem>Bold</button>
        <button kjRovingTabindexItem>Italic</button>
        <button kjRovingTabindexItem>Underline</button>
      </div>`;

    const verticalTemplate = `
      <div kjRovingTabindex="" kjRovingOrientation="vertical" role="toolbar" aria-label="Formatting" aria-orientation="vertical">
        <button kjRovingTabindexItem>Bold</button>
        <button kjRovingTabindexItem>Italic</button>
        <button kjRovingTabindexItem>Underline</button>
      </div>`;

    const bothTemplate = `
      <div kjRovingTabindex="" kjRovingOrientation="both" role="toolbar" aria-label="Formatting">
        <button kjRovingTabindexItem>Bold</button>
        <button kjRovingTabindexItem>Italic</button>
        <button kjRovingTabindexItem>Underline</button>
      </div>`;

    it('default orientation behaves like "both" (ArrowDown moves focus)', async () => {
      const { getAllByRole, container } = await render(template, { imports });
      const [first, second] = getAllByRole('button');
      first.focus();
      fireEvent.keyDown(container.querySelector('[kjRovingTabindex]')!, { key: 'ArrowDown' });
      expect(second).toHaveAttribute('tabindex', '0');
      expect(first).toHaveAttribute('tabindex', '-1');
    });

    it('horizontal: ArrowRight/ArrowLeft move focus', async () => {
      const { getAllByRole, container } = await render(horizontalTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();
      const host = container.querySelector('[kjRovingTabindex]')!;

      fireEvent.keyDown(host, { key: 'ArrowRight' });
      expect(second).toHaveAttribute('tabindex', '0');

      fireEvent.keyDown(host, { key: 'ArrowRight' });
      expect(third).toHaveAttribute('tabindex', '0');

      fireEvent.keyDown(host, { key: 'ArrowLeft' });
      expect(second).toHaveAttribute('tabindex', '0');
    });

    it('horizontal: ArrowUp / ArrowDown are ignored', async () => {
      const { getAllByRole, container } = await render(horizontalTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();
      const host = container.querySelector('[kjRovingTabindex]')!;

      fireEvent.keyDown(host, { key: 'ArrowDown' });
      expect(first).toHaveAttribute('tabindex', '0');
      expect(second).toHaveAttribute('tabindex', '-1');
      expect(third).toHaveAttribute('tabindex', '-1');

      fireEvent.keyDown(host, { key: 'ArrowUp' });
      expect(first).toHaveAttribute('tabindex', '0');
    });

    it('vertical: ArrowDown / ArrowUp move focus', async () => {
      const { getAllByRole, container } = await render(verticalTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();
      const host = container.querySelector('[kjRovingTabindex]')!;

      fireEvent.keyDown(host, { key: 'ArrowDown' });
      expect(second).toHaveAttribute('tabindex', '0');

      fireEvent.keyDown(host, { key: 'ArrowDown' });
      expect(third).toHaveAttribute('tabindex', '0');

      fireEvent.keyDown(host, { key: 'ArrowUp' });
      expect(second).toHaveAttribute('tabindex', '0');
    });

    it('vertical: ArrowLeft / ArrowRight are ignored', async () => {
      const { getAllByRole, container } = await render(verticalTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();
      const host = container.querySelector('[kjRovingTabindex]')!;

      fireEvent.keyDown(host, { key: 'ArrowRight' });
      expect(first).toHaveAttribute('tabindex', '0');
      expect(second).toHaveAttribute('tabindex', '-1');
      expect(third).toHaveAttribute('tabindex', '-1');

      fireEvent.keyDown(host, { key: 'ArrowLeft' });
      expect(first).toHaveAttribute('tabindex', '0');
    });

    it('both: all four arrow keys move focus', async () => {
      const { getAllByRole, container } = await render(bothTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();
      const host = container.querySelector('[kjRovingTabindex]')!;

      fireEvent.keyDown(host, { key: 'ArrowRight' });
      expect(second).toHaveAttribute('tabindex', '0');

      fireEvent.keyDown(host, { key: 'ArrowDown' });
      expect(third).toHaveAttribute('tabindex', '0');

      fireEvent.keyDown(host, { key: 'ArrowLeft' });
      expect(second).toHaveAttribute('tabindex', '0');

      fireEvent.keyDown(host, { key: 'ArrowUp' });
      expect(first).toHaveAttribute('tabindex', '0');
    });

    it('horizontal under dir="rtl": ArrowLeft moves forward, ArrowRight moves backward', async () => {
      const rtlTemplate = `
        <div dir="rtl">
          <div kjRovingTabindex="" kjRovingOrientation="horizontal" role="toolbar" aria-label="Formatting">
            <button kjRovingTabindexItem>Bold</button>
            <button kjRovingTabindexItem>Italic</button>
            <button kjRovingTabindexItem>Underline</button>
          </div>
        </div>`;

      const { getAllByRole, container } = await render(rtlTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();
      const host = container.querySelector('[kjRovingTabindex]')!;

      fireEvent.keyDown(host, { key: 'ArrowLeft' });
      expect(second).toHaveAttribute('tabindex', '0');
      expect(first).toHaveAttribute('tabindex', '-1');

      fireEvent.keyDown(host, { key: 'ArrowLeft' });
      expect(third).toHaveAttribute('tabindex', '0');

      fireEvent.keyDown(host, { key: 'ArrowRight' });
      expect(second).toHaveAttribute('tabindex', '0');
    });
  });
});
