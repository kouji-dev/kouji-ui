import { Component, Directive, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KJ_ROVING_ORIENTATION_DEFAULT,
  KJ_ROVING_TABINDEX,
  KjRovingTabindex,
  KjRovingTabindexItem,
} from './roving-tabindex';

expect.extend(toHaveNoViolations);

const template = `
  <div kjRovingTabindex role="toolbar" aria-label="Formatting">
    <button kjRovingTabindexItem>Bold</button>
    <button kjRovingTabindexItem>Italic</button>
    <button kjRovingTabindexItem>Underline</button>
  </div>`;
const imports = [KjRovingTabindex, KjRovingTabindexItem];

/** Dispatches `key` from the element that really has focus, as a user would. */
function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
}

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
    const { getAllByRole, detectChanges } = await render(template, { imports });
    const [first, second] = getAllByRole('button');
    first.focus();
    press('ArrowRight');
    detectChanges();
    expect(document.activeElement).toBe(second);
    expect(second).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus left on ArrowLeft', async () => {
    const { getAllByRole, detectChanges } = await render(template, { imports });
    const [first, second] = getAllByRole('button');
    second.focus();
    press('ArrowLeft');
    detectChanges();
    expect(document.activeElement).toBe(first);
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
  });

  it('wraps to last item on ArrowLeft from first', async () => {
    const { getAllByRole, detectChanges } = await render(template, { imports });
    const buttons = getAllByRole('button');
    buttons[0].focus();
    press('ArrowLeft');
    detectChanges();
    expect(document.activeElement).toBe(buttons[2]);
    expect(buttons[2]).toHaveAttribute('tabindex', '0');
  });

  it('Home and End jump to the first and last item', async () => {
    const { getAllByRole, detectChanges } = await render(template, { imports });
    const buttons = getAllByRole('button');
    buttons[1].focus();
    press('End');
    detectChanges();
    expect(document.activeElement).toBe(buttons[2]);
    press('Home');
    detectChanges();
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('seeding the tab stop (F-19)', () => {
    it('kjRovingActive puts the tab stop on the selected item instead of the first', async () => {
      const { getAllByRole } = await render(
        `<div kjRovingTabindex role="toolbar" aria-label="T">
           <button kjRovingTabindexItem>One</button>
           <button kjRovingTabindexItem>Two</button>
           <button kjRovingTabindexItem kjRovingActive>Three</button>
         </div>`,
        { imports },
      );
      const buttons = getAllByRole('button');
      expect(buttons[0]).toHaveAttribute('tabindex', '-1');
      expect(buttons[2]).toHaveAttribute('tabindex', '0');
    });

    it('setActive() moves the tab stop to the given element, or to the item inside an ancestor', async () => {
      const { fixture, getAllByRole, detectChanges } = await render(
        `<div kjRovingTabindex role="toolbar" aria-label="T">
           <button kjRovingTabindexItem>One</button>
           <span data-row><button kjRovingTabindexItem>Two</button></span>
           <button kjRovingTabindexItem>Three</button>
         </div>`,
        { imports },
      );
      const roving = fixture.debugElement
        .query((de) => de.nativeElement?.matches?.('[kjRovingTabindex]'))
        .injector.get(KJ_ROVING_TABINDEX);
      const buttons = getAllByRole('button');

      roving.setActive(buttons[2]);
      detectChanges();
      expect(buttons[2]).toHaveAttribute('tabindex', '0');
      expect(buttons[0]).toHaveAttribute('tabindex', '-1');

      roving.setActive(fixture.nativeElement.querySelector('[data-row]'));
      detectChanges();
      expect(buttons[1]).toHaveAttribute('tabindex', '0');
      expect(buttons[2]).toHaveAttribute('tabindex', '-1');
      expect(document.activeElement).not.toBe(buttons[1]);
    });

    it('removing the active last item keeps exactly one tab stop and moves focus to the neighbour', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <div kjRovingTabindex role="toolbar" aria-label="T">
            @for (item of items(); track item) {
              <button kjRovingTabindexItem>{{ item }}</button>
            }
          </div>`,
      })
      class Host {
        readonly items = signal(['a', 'b', 'c']);
      }
      const { fixture, detectChanges } = await render(Host);
      const host = fixture.componentInstance as Host;
      const buttons = screen.getAllByRole('button');
      buttons[0].focus();
      press('End');
      detectChanges();
      expect(document.activeElement).toBe(buttons[2]);

      host.items.set(['a', 'b']);
      detectChanges();
      const remaining = screen.getAllByRole('button');
      expect(remaining).toHaveLength(2);
      expect(remaining.filter((b) => b.getAttribute('tabindex') === '0')).toHaveLength(1);
      expect(remaining[1]).toHaveAttribute('tabindex', '0');
      expect(document.activeElement).toBe(remaining[1]);
    });

    it('removing an inactive item leaves the tab stop where it was', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <div kjRovingTabindex role="toolbar" aria-label="T">
            @for (item of items(); track item) {
              <button kjRovingTabindexItem [kjRovingActive]="item === 'a'">{{ item }}</button>
            }
          </div>`,
      })
      class Host {
        readonly items = signal(['a', 'b', 'c']);
      }
      const { fixture, detectChanges } = await render(Host);
      (fixture.componentInstance as Host).items.set(['a', 'c']);
      detectChanges();
      const remaining = screen.getAllByRole('button');
      expect(remaining[0]).toHaveAttribute('tabindex', '0');
      expect(remaining[1]).toHaveAttribute('tabindex', '-1');
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('disabled items (F-12)', () => {
    const disabledTemplate = `
      <div kjRovingTabindex role="toolbar" aria-label="T">
        <button kjRovingTabindexItem>One</button>
        <button kjRovingTabindexItem disabled>Two</button>
        <button kjRovingTabindexItem aria-disabled="true">Three</button>
        <button kjRovingTabindexItem kjRovingItemDisabled>Four</button>
        <button kjRovingTabindexItem hidden>Five</button>
        <button kjRovingTabindexItem>Six</button>
      </div>`;

    it('arrow keys skip natively disabled, aria-disabled, kjRovingItemDisabled and hidden items', async () => {
      const { getAllByRole, detectChanges } = await render(disabledTemplate, { imports });
      const buttons = getAllByRole('button', { hidden: true });
      buttons[0].focus();
      press('ArrowRight');
      detectChanges();
      expect(document.activeElement).toBe(buttons[5]);
      expect(buttons[5]).toHaveAttribute('tabindex', '0');
      press('ArrowLeft');
      detectChanges();
      expect(document.activeElement).toBe(buttons[0]);
    });

    it('End lands on the last navigable item, and a disabled item never becomes the tab stop', async () => {
      const { getAllByRole, detectChanges } = await render(
        `<div kjRovingTabindex role="toolbar" aria-label="T">
           <button kjRovingTabindexItem disabled>One</button>
           <button kjRovingTabindexItem>Two</button>
           <button kjRovingTabindexItem disabled>Three</button>
         </div>`,
        { imports },
      );
      const buttons = getAllByRole('button');
      expect(buttons[0]).toHaveAttribute('tabindex', '-1');
      expect(buttons[1]).toHaveAttribute('tabindex', '0');
      buttons[1].focus();
      press('End');
      detectChanges();
      expect(document.activeElement).toBe(buttons[1]);
    });

    it('keeps focus in place when no other item is navigable', async () => {
      const { getAllByRole, detectChanges } = await render(
        `<div kjRovingTabindex role="toolbar" aria-label="T">
           <button kjRovingTabindexItem>Only</button>
           <button kjRovingTabindexItem disabled>Off</button>
         </div>`,
        { imports },
      );
      const [only, off] = getAllByRole('button');
      only.focus();
      press('ArrowRight');
      detectChanges();
      expect(document.activeElement).toBe(only);
      expect(only).toHaveAttribute('tabindex', '0');
      expect(off).toHaveAttribute('tabindex', '-1');
    });
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
      const { getAllByRole, detectChanges } = await render(template, { imports });
      const [first, second] = getAllByRole('button');
      first.focus();
      press('ArrowDown');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');
      expect(first).toHaveAttribute('tabindex', '-1');
    });

    it('horizontal: ArrowRight/ArrowLeft move focus', async () => {
      const { getAllByRole, detectChanges } = await render(horizontalTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();

      press('ArrowRight');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');

      press('ArrowRight');
      detectChanges();
      expect(third).toHaveAttribute('tabindex', '0');

      press('ArrowLeft');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');
    });

    it('horizontal: ArrowUp / ArrowDown are ignored', async () => {
      const { getAllByRole, detectChanges } = await render(horizontalTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();

      press('ArrowDown');
      detectChanges();
      expect(first).toHaveAttribute('tabindex', '0');
      expect(second).toHaveAttribute('tabindex', '-1');
      expect(third).toHaveAttribute('tabindex', '-1');

      press('ArrowUp');
      detectChanges();
      expect(first).toHaveAttribute('tabindex', '0');
    });

    it('vertical: ArrowDown / ArrowUp move focus', async () => {
      const { getAllByRole, detectChanges } = await render(verticalTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();

      press('ArrowDown');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');

      press('ArrowDown');
      detectChanges();
      expect(third).toHaveAttribute('tabindex', '0');

      press('ArrowUp');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');
    });

    it('vertical: ArrowLeft / ArrowRight are ignored', async () => {
      const { getAllByRole, detectChanges } = await render(verticalTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();

      press('ArrowRight');
      detectChanges();
      expect(first).toHaveAttribute('tabindex', '0');
      expect(second).toHaveAttribute('tabindex', '-1');
      expect(third).toHaveAttribute('tabindex', '-1');

      press('ArrowLeft');
      detectChanges();
      expect(first).toHaveAttribute('tabindex', '0');
    });

    it('both: all four arrow keys move focus', async () => {
      const { getAllByRole, detectChanges } = await render(bothTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();

      press('ArrowRight');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');

      press('ArrowDown');
      detectChanges();
      expect(third).toHaveAttribute('tabindex', '0');

      press('ArrowLeft');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');

      press('ArrowUp');
      detectChanges();
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

      const { getAllByRole, detectChanges } = await render(rtlTemplate, { imports });
      const [first, second, third] = getAllByRole('button');
      first.focus();

      press('ArrowLeft');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');
      expect(first).toHaveAttribute('tabindex', '-1');

      press('ArrowLeft');
      detectChanges();
      expect(third).toHaveAttribute('tabindex', '0');

      press('ArrowRight');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');
    });

    it('a composing container pins the axis through KJ_ROVING_ORIENTATION_DEFAULT (arch F-18)', async () => {
      @Directive({
        selector: '[kjPinVertical]',
        standalone: true,
        providers: [{ provide: KJ_ROVING_ORIENTATION_DEFAULT, useValue: () => 'vertical' }],
      })
      class PinVertical {}

      const { getAllByRole, detectChanges } = await render(
        `<div kjRovingTabindex kjPinVertical role="toolbar" aria-label="T" aria-orientation="vertical">
           <button kjRovingTabindexItem>One</button>
           <button kjRovingTabindexItem>Two</button>
         </div>`,
        { imports: [...imports, PinVertical] },
      );
      const [first, second] = getAllByRole('button');
      first.focus();
      press('ArrowRight');
      detectChanges();
      expect(first).toHaveAttribute('tabindex', '0');
      press('ArrowDown');
      detectChanges();
      expect(second).toHaveAttribute('tabindex', '0');
    });
  });
});
