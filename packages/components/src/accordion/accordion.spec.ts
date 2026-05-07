import { Component, signal } from '@angular/core';
import { fireEvent, render } from '@testing-library/angular';

import {
  KjAccordionComponent,
  KjAccordionContentComponent,
  KjAccordionItemComponent,
  KjAccordionTriggerComponent,
} from './accordion';

const imports = [
  KjAccordionComponent,
  KjAccordionItemComponent,
  KjAccordionTriggerComponent,
  KjAccordionContentComponent,
];

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

describe('KjAccordionComponent', () => {
  it('renders the wrapper class on the host', async () => {
    const { container } = await render(
      `<kj-accordion>
        <kj-accordion-item value="a" label="A"><kj-accordion-content>A body</kj-accordion-content></kj-accordion-item>
      </kj-accordion>`,
      { imports },
    );
    const root = container.querySelector('kj-accordion') as HTMLElement;
    expect(root.classList.contains('kj-accordion')).toBe(true);
  });

  it('forwards `type="multiple"` to the directive (both items can open)', async () => {
    const { container } = await render(
      `<kj-accordion type="multiple">
        <kj-accordion-item value="a" label="A"><kj-accordion-content>A</kj-accordion-content></kj-accordion-item>
        <kj-accordion-item value="b" label="B"><kj-accordion-content>B</kj-accordion-content></kj-accordion-item>
      </kj-accordion>`,
      { imports },
    );
    const triggers = container.querySelectorAll<HTMLButtonElement>('button.kj-accordion-trigger');
    fireEvent.click(triggers[0]);
    fireEvent.click(triggers[1]);
    expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
    expect(triggers[1]).toHaveAttribute('aria-expanded', 'true');
  });

  it('wires aria-controls / aria-labelledby through the wrapper', async () => {
    const { container } = await render(
      `<kj-accordion>
        <kj-accordion-item value="x" label="X"><kj-accordion-content>Body</kj-accordion-content></kj-accordion-item>
      </kj-accordion>`,
      { imports },
    );
    const trigger = container.querySelector<HTMLElement>('button.kj-accordion-trigger')!;
    const content = container.querySelector<HTMLElement>('.kj-accordion-content')!;
    expect(content.getAttribute('role')).toBe('region');
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
  });

  it('two-way `[(value)]` round-trips through `kjValue`', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-accordion [(value)]="open">
          <kj-accordion-item value="a" label="A"><kj-accordion-content>A</kj-accordion-content></kj-accordion-item>
          <kj-accordion-item value="b" label="B"><kj-accordion-content>B</kj-accordion-content></kj-accordion-item>
        </kj-accordion>`,
    })
    class Host {
      readonly open = signal<string>('a');
    }

    const { container, fixture } = await render(Host);
    await flush();
    const triggers = container.querySelectorAll<HTMLButtonElement>('button.kj-accordion-trigger');
    expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(triggers[1]);
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe('b');
    expect(triggers[1]).toHaveAttribute('aria-expanded', 'true');
  });

  it('item `disabled` propagates via `kjItemDisabled` (toggle is a no-op)', async () => {
    const { container } = await render(
      `<kj-accordion>
        <kj-accordion-item value="locked" label="Locked" disabled>
          <kj-accordion-content>Body</kj-accordion-content>
        </kj-accordion-item>
      </kj-accordion>`,
      { imports },
    );
    const trigger = container.querySelector<HTMLElement>('button.kj-accordion-trigger')!;
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('arrow-key navigation moves focus when `arrowNavigation` is set', async () => {
    const { container } = await render(
      `<kj-accordion arrowNavigation>
        <kj-accordion-item value="a" label="A"><kj-accordion-content>A</kj-accordion-content></kj-accordion-item>
        <kj-accordion-item value="b" label="B"><kj-accordion-content>B</kj-accordion-content></kj-accordion-item>
      </kj-accordion>`,
      { imports },
    );
    const triggers = container.querySelectorAll<HTMLButtonElement>('button.kj-accordion-trigger');
    triggers[0].focus();
    fireEvent.keyDown(triggers[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(triggers[1]);
  });
});
