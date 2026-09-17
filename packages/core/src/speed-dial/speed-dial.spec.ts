import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjOverlayStack } from '../primitives/overlay/stack';
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

  it('honours the bare kjOpen attribute (arch F-2)', async () => {
    // Without `booleanAttribute` the bare attribute binds '' — falsy — so the
    // dial rendered collapsed although the markup asked for it open.
    const { getByLabelText } = await render(
      `
        <div kjSpeedDial kjOpen>
          <button kjButton kjSpeedDialTrigger aria-label="Open">+</button>
          <div kjSpeedDialActions>
            <button kjButton kjSpeedDialAction aria-label="A">A</button>
          </div>
        </div>
      `,
      { imports },
    );
    expect(getByLabelText('Open')).toHaveAttribute('aria-expanded', 'true');
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

  // ── overlay-system integration (F-21) ────────────────────────────────

  describe('is a real overlay', () => {
    /** Lets the open / close transition settle and flushes root effects. */
    const flush = async (): Promise<void> => {
      await new Promise((r) => setTimeout(r, 40));
      TestBed.inject(ApplicationRef).tick();
      await new Promise((r) => setTimeout(r, 40));
    };

    it('registers with KjOverlayStack while open and unregisters on close', async () => {
      const { getByLabelText } = await render(TEMPLATE, { imports });
      const stack = TestBed.inject(KjOverlayStack);
      const before = stack.stackSize;

      fireEvent.click(getByLabelText('Open'));
      await flush();
      expect(stack.stackSize).toBe(before + 1);

      fireEvent.click(getByLabelText('Open'));
      await flush();
      expect(stack.stackSize).toBe(before);
    });

    it('Escape closes the dial from an action button, not just from the trigger', async () => {
      const { getByLabelText } = await render(TEMPLATE, { imports });
      const trigger = getByLabelText('Open');
      fireEvent.click(trigger);
      await flush();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      // Reach the action the way a user does, then press Escape from there.
      (getByLabelText('Edit') as HTMLElement).focus();
      expect(document.activeElement).toBe(getByLabelText('Edit'));
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('a press outside the cluster dismisses it; a press inside does not', async () => {
      const outside = document.createElement('button');
      outside.textContent = 'elsewhere';
      document.body.appendChild(outside);
      try {
        const { getByLabelText } = await render(TEMPLATE, { imports });
        const trigger = getByLabelText('Open');
        fireEvent.click(trigger);
        await flush();

        const press = (el: Element) => {
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
        };

        // Inside the cluster: the dial only closes because the action asked it to.
        press(getByLabelText('Edit'));
        await flush();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(trigger);
        await flush();
        expect(trigger).toHaveAttribute('aria-expanded', 'true');

        press(outside);
        await flush();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      } finally {
        outside.remove();
      }
    });

    it('returns focus to the trigger when an action closes the dial', async () => {
      const { getByLabelText } = await render(TEMPLATE, { imports });
      const trigger = getByLabelText('Open');
      fireEvent.click(trigger);
      trigger.focus();
      await flush();

      (getByLabelText('Edit') as HTMLElement).focus();
      fireEvent.click(getByLabelText('Edit'));
      await flush();
      expect(document.activeElement).toBe(trigger);
    });

    it('the cluster is the overlay panel: hidden while closed, and it keeps its own id for aria-controls', async () => {
      const { getByLabelText, container } = await render(TEMPLATE, { imports });
      const trigger = getByLabelText('Open');
      const actions = container.querySelector('[kjSpeedDialActions]') as HTMLElement;

      expect(actions.hasAttribute('hidden')).toBe(true);
      expect(actions).toHaveAttribute('data-state', 'closed');
      // KjOverlayPanel also binds `[id]`; the cluster's own binding wins, so
      // the trigger's aria-controls keeps pointing at a real element.
      expect(actions.id).toMatch(/^kj-speed-dial-\d+$/);
      expect(trigger.getAttribute('aria-controls')).toBe(actions.id);

      fireEvent.click(trigger);
      await flush();
      expect(actions.hasAttribute('hidden')).toBe(false);
      expect(actions).toHaveAttribute('data-state', 'open');
    });

    it('kjDisabled blocks opening through the trigger strategy, not just the root helper', async () => {
      const { getByLabelText, container } = await render(
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
      const stack = TestBed.inject(KjOverlayStack);
      const before = stack.stackSize;
      fireEvent.click(getByLabelText('Open'));
      await flush();
      expect(stack.stackSize).toBe(before);
      expect((container.querySelector('[kjSpeedDialActions]') as HTMLElement).hasAttribute('hidden')).toBe(true);
    });
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
