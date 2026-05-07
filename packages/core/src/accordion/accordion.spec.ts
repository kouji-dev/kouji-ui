import { Component, signal } from '@angular/core';
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjAccordion,
  KjAccordionItem,
  KjAccordionTrigger,
  KjAccordionContent,
} from './accordion';

expect.extend(toHaveNoViolations);

const imports = [KjAccordion, KjAccordionItem, KjAccordionTrigger, KjAccordionContent];

const baseTemplate = `
  <div kjAccordion>
    <div kjAccordionItem kjItemValue="i1">
      <button kjAccordionTrigger>Section 1</button>
      <div kjAccordionContent>Body 1</div>
    </div>
    <div kjAccordionItem kjItemValue="i2">
      <button kjAccordionTrigger>Section 2</button>
      <div kjAccordionContent>Body 2</div>
    </div>
  </div>
`;

describe('KjAccordion', () => {
  it('content hidden by default', async () => {
    const { container } = await render(baseTemplate, { imports });
    expect(container.querySelector('[kjAccordionContent]')).toHaveAttribute('hidden', '');
  });

  it('click trigger expands and updates aria-expanded', async () => {
    const { container } = await render(baseTemplate, { imports });
    const trigger = container.querySelector('[kjAccordionTrigger]')!;
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('[kjAccordionContent]')).not.toHaveAttribute('hidden');
  });

  it('single mode closes other items when one opens', async () => {
    const { container } = await render(baseTemplate, { imports });
    const triggers = container.querySelectorAll('[kjAccordionTrigger]');
    fireEvent.click(triggers[0]);
    fireEvent.click(triggers[1]);
    expect(triggers[0]).toHaveAttribute('aria-expanded', 'false');
    expect(triggers[1]).toHaveAttribute('aria-expanded', 'true');
  });

  it('multiple mode keeps multiple items open', async () => {
    const { container } = await render(
      `<div kjAccordion kjType="multiple">
        <div kjAccordionItem kjItemValue="a"><button kjAccordionTrigger>A</button><div kjAccordionContent>A</div></div>
        <div kjAccordionItem kjItemValue="b"><button kjAccordionTrigger>B</button><div kjAccordionContent>B</div></div>
      </div>`,
      { imports },
    );
    const triggers = container.querySelectorAll('[kjAccordionTrigger]');
    fireEvent.click(triggers[0]);
    fireEvent.click(triggers[1]);
    expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
    expect(triggers[1]).toHaveAttribute('aria-expanded', 'true');
  });

  describe('ARIA wiring', () => {
    it('trigger gets aria-controls pointing at the content id', async () => {
      const { container } = await render(baseTemplate, { imports });
      const trigger = container.querySelector('[kjAccordionTrigger]') as HTMLElement;
      const content = container.querySelector('[kjAccordionContent]') as HTMLElement;
      const controls = trigger.getAttribute('aria-controls');
      expect(controls).toBeTruthy();
      expect(controls).toBe(content.id);
    });

    it('content has role="region" and aria-labelledby pointing at the trigger id', async () => {
      const { container } = await render(baseTemplate, { imports });
      const trigger = container.querySelector('[kjAccordionTrigger]') as HTMLElement;
      const content = container.querySelector('[kjAccordionContent]') as HTMLElement;
      expect(content).toHaveAttribute('role', 'region');
      const labelledBy = content.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(labelledBy).toBe(trigger.id);
    });

    it('header / content ids are stable across change detection', async () => {
      const { container, fixture } = await render(baseTemplate, { imports });
      const trigger = container.querySelector('[kjAccordionTrigger]') as HTMLElement;
      const before = trigger.id;
      fireEvent.click(trigger);
      fixture.detectChanges();
      expect(trigger.id).toBe(before);
    });

    it('passes axe audit (closed)', async () => {
      const { container } = await render(baseTemplate, { imports });
      expect(await axe(container)).toHaveNoViolations();
    });

    it('passes axe audit (open)', async () => {
      const { container } = await render(baseTemplate, { imports });
      fireEvent.click(container.querySelector('[kjAccordionTrigger]')!);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('disabled item', () => {
    it('toggle is a no-op and aria-disabled is set on the trigger', async () => {
      const { container } = await render(
        `<div kjAccordion>
          <div kjAccordionItem kjItemValue="locked" kjItemDisabled>
            <button kjAccordionTrigger>Locked</button>
            <div kjAccordionContent>Body</div>
          </div>
        </div>`,
        { imports },
      );
      const trigger = container.querySelector('[kjAccordionTrigger]') as HTMLElement;
      expect(trigger).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('two-way value binding', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <div kjAccordion [(kjValue)]="open">
          <div kjAccordionItem kjItemValue="a"><button kjAccordionTrigger>A</button><div kjAccordionContent>A</div></div>
          <div kjAccordionItem kjItemValue="b"><button kjAccordionTrigger>B</button><div kjAccordionContent>B</div></div>
        </div>
      `,
    })
    class SingleHost {
      readonly open = signal<string>('a');
    }

    it('opens the seeded item from the bound value (single mode)', async () => {
      const { container, fixture } = await render(SingleHost);
      await fixture.whenStable();
      fixture.detectChanges();
      const triggers = container.querySelectorAll('[kjAccordionTrigger]');
      expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
      expect(triggers[1]).toHaveAttribute('aria-expanded', 'false');
    });

    it('writes the open value back to the parent signal on click', async () => {
      const { container, fixture } = await render(SingleHost);
      await fixture.whenStable();
      fireEvent.click(container.querySelectorAll('[kjAccordionTrigger]')[1]);
      fixture.detectChanges();
      expect(fixture.componentInstance.open()).toBe('b');
    });

    @Component({
      standalone: true,
      imports,
      template: `
        <div kjAccordion kjType="multiple" [(kjValue)]="open">
          <div kjAccordionItem kjItemValue="a"><button kjAccordionTrigger>A</button><div kjAccordionContent>A</div></div>
          <div kjAccordionItem kjItemValue="b"><button kjAccordionTrigger>B</button><div kjAccordionContent>B</div></div>
        </div>
      `,
    })
    class MultipleHost {
      readonly open = signal<string[]>(['a']);
    }

    it('multiple mode emits array updates', async () => {
      const { container, fixture } = await render(MultipleHost);
      await fixture.whenStable();
      fireEvent.click(container.querySelectorAll('[kjAccordionTrigger]')[1]);
      fixture.detectChanges();
      expect(fixture.componentInstance.open()).toEqual(['a', 'b']);
    });
  });

  describe('arrow-key navigation (opt-in)', () => {
    it('does not move focus when kjArrowNavigation is off (default)', async () => {
      const { container } = await render(baseTemplate, { imports });
      const triggers = container.querySelectorAll<HTMLElement>('[kjAccordionTrigger]');
      triggers[0].focus();
      fireEvent.keyDown(triggers[0], { key: 'ArrowDown' });
      // Without arrow-nav opted in, focus stays on the first trigger.
      expect(document.activeElement).toBe(triggers[0]);
    });

    it('ArrowDown / ArrowUp / Home / End move focus when kjArrowNavigation is on', async () => {
      const { container } = await render(
        `<div kjAccordion kjArrowNavigation kjType="multiple">
          <div kjAccordionItem kjItemValue="a"><button kjAccordionTrigger>A</button><div kjAccordionContent>A</div></div>
          <div kjAccordionItem kjItemValue="b"><button kjAccordionTrigger>B</button><div kjAccordionContent>B</div></div>
          <div kjAccordionItem kjItemValue="c"><button kjAccordionTrigger>C</button><div kjAccordionContent>C</div></div>
        </div>`,
        { imports },
      );
      const triggers = container.querySelectorAll<HTMLElement>('[kjAccordionTrigger]');
      triggers[0].focus();
      fireEvent.keyDown(triggers[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(triggers[1]);
      fireEvent.keyDown(triggers[1], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(triggers[2]);
      fireEvent.keyDown(triggers[2], { key: 'ArrowDown' });
      // Wraps to first.
      expect(document.activeElement).toBe(triggers[0]);
      fireEvent.keyDown(triggers[0], { key: 'ArrowUp' });
      // Wraps backwards to last.
      expect(document.activeElement).toBe(triggers[2]);
      fireEvent.keyDown(triggers[2], { key: 'Home' });
      expect(document.activeElement).toBe(triggers[0]);
      fireEvent.keyDown(triggers[0], { key: 'End' });
      expect(document.activeElement).toBe(triggers[2]);
    });

    it('skips disabled items during arrow navigation', async () => {
      const { container } = await render(
        `<div kjAccordion kjArrowNavigation>
          <div kjAccordionItem kjItemValue="a"><button kjAccordionTrigger>A</button></div>
          <div kjAccordionItem kjItemValue="b" kjItemDisabled><button kjAccordionTrigger>B</button></div>
          <div kjAccordionItem kjItemValue="c"><button kjAccordionTrigger>C</button></div>
        </div>`,
        { imports },
      );
      const triggers = container.querySelectorAll<HTMLElement>('[kjAccordionTrigger]');
      triggers[0].focus();
      fireEvent.keyDown(triggers[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(triggers[2]);
    });
  });
});
