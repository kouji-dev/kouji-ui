import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KJ_ROVING_TABINDEX } from '../a11y/roving-tabindex';
import { KjList, KjListItem } from './list';

expect.extend(toHaveNoViolations);

const imports = [KjList, KjListItem];

describe('KjList', () => {
  describe('container role', () => {
    it('emits role="list" on a <ul> host (defeats Safari list-style:none stripping)', async () => {
      const { container } = await render(
        `<ul kjList aria-label="Recent files"><li kjListItem>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root.tagName).toBe('UL');
      expect(root).toHaveAttribute('role', 'list');
    });

    it('emits role="list" on a <ol> host as well', async () => {
      const { container } = await render(
        `<ol kjList kjAs="ol" aria-label="Steps"><li kjListItem>A</li></ol>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root.tagName).toBe('OL');
      expect(root).toHaveAttribute('role', 'list');
    });

    it('emits role="list" on a <div> host', async () => {
      const { container } = await render(
        `<div kjList kjAs="div" aria-label="Stats"><div kjListItem>A</div></div>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).toHaveAttribute('role', 'list');
    });
  });

  describe('as="nav" landmark', () => {
    it('switches the host to a <nav> landmark and omits role="list"', async () => {
      const { container } = await render(
        `<nav kjList kjAs="nav" aria-label="Primary"><div kjListItem>A</div></nav>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root.tagName).toBe('NAV');
      expect(root).not.toHaveAttribute('role');
    });

    it('warns in dev mode when kjAs="nav" host has no aria-label / aria-labelledby', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        await render(
          `<nav kjList kjAs="nav"><div kjListItem>A</div></nav>`,
          { imports },
        );
        expect(warn).toHaveBeenCalled();
        const message = warn.mock.calls.map((args) => args.join(' ')).join('\n');
        expect(message).toMatch(/kjAs="nav"/);
        expect(message).toMatch(/aria-label/);
      } finally {
        warn.mockRestore();
      }
    });

    it('does not warn when kjAs="nav" host has aria-label', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        await render(
          `<nav kjList kjAs="nav" aria-label="Primary"><div kjListItem>A</div></nav>`,
          { imports },
        );
        const navWarnings = warn.mock.calls
          .map((args) => args.join(' '))
          .filter((line) => line.includes('kjAs="nav"'));
        expect(navWarnings).toHaveLength(0);
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('orientation propagation', () => {
    it('reflects vertical (default) on data-orientation', async () => {
      const { container } = await render(
        `<ul kjList aria-label="L"><li kjListItem>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).toHaveAttribute('data-orientation', 'vertical');
    });

    it('reflects horizontal when kjOrientation="horizontal"', async () => {
      const { container } = await render(
        `<ul kjList kjOrientation="horizontal" aria-label="L"><li kjListItem>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('does not bind aria-orientation (axe aria-allowed-attr forbids it on role="list")', async () => {
      const { container } = await render(
        `<ul kjList kjOrientation="horizontal" aria-label="L"><li kjListItem>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).not.toHaveAttribute('aria-orientation');
    });

    it('reflects data-divided and data-hoverable when toggled', async () => {
      const { container } = await render(
        `<ul kjList [kjDivided]="true" [kjHoverable]="true" aria-label="L"><li kjListItem>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).toHaveAttribute('data-divided', '');
      expect(root).toHaveAttribute('data-hoverable', '');
    });
  });

  describe('arrow-nav opt-in composes KjRovingTabindex', () => {
    it('exposes the roving primitive as a host directive on the root', async () => {
      // KjList unconditionally composes KjRovingTabindex (per accordion's
      // "always-applied roving primitive that no-ops when the flag is off"
      // pattern). Verify the primitive is provided in the root's injector by
      // resolving its DI token from a child element.
      @Component({
        standalone: true,
        imports,
        template: `
          <ul kjList kjArrowNavigation aria-label="Primary">
            <li kjListItem>A</li>
          </ul>
        `,
      })
      class Host {}

      const { fixture } = await render(Host);
      // The KjRovingTabindex provider lives at the root host's element
      // injector — resolve it through a debug element lookup.
      const rootDebugEl = fixture.debugElement.query(
        (de) => de.nativeElement?.matches?.('[kjList]'),
      );
      const rovingFromChild: unknown = rootDebugEl.injector.get(KJ_ROVING_TABINDEX, null);
      expect(rovingFromChild).not.toBeNull();
    });
  });

  describe('KjListItem', () => {
    it('omits role on <li> and emits role="listitem" on <div>', async () => {
      const { container } = await render(
        `<ul kjList aria-label="L">
           <li kjListItem>A</li>
           <div kjListItem>B</div>
         </ul>`,
        { imports },
      );
      const items = Array.from(container.querySelectorAll('[kjListItem]'));
      expect(items[0].tagName).toBe('LI');
      expect(items[0]).not.toHaveAttribute('role');
      expect(items[1].tagName).toBe('DIV');
      expect(items[1]).toHaveAttribute('role', 'listitem');
    });

    it('reflects kjActive to data-active and clears it when toggled off', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <ul kjList aria-label="L">
            <li kjListItem [kjActive]="active()">A</li>
          </ul>
        `,
      })
      class Host {
        active = signal(true);
      }

      const { container, fixture } = await render(Host);
      const item = container.querySelector('[kjListItem]')!;
      expect(item).toHaveAttribute('data-active', '');

      fixture.componentInstance.active.set(false);
      fixture.detectChanges();
      expect(item).not.toHaveAttribute('data-active');
    });

    it('reflects kjDisabled to data-disabled', async () => {
      const { container } = await render(
        `<ul kjList aria-label="L">
           <li kjListItem [kjDisabled]="true">A</li>
         </ul>`,
        { imports },
      );
      const item = container.querySelector('[kjListItem]')!;
      expect(item).toHaveAttribute('data-disabled', '');
    });
  });

  describe('axe', () => {
    it('passes axe audit on a basic <ul> list', async () => {
      const { container } = await render(
        `<ul kjList aria-label="Recent files">
           <li kjListItem>A</li>
           <li kjListItem>B</li>
           <li kjListItem>C</li>
         </ul>`,
        { imports },
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('passes axe audit on a <nav>-wrapped sidebar list with active row', async () => {
      // Recommended idiom for a sidebar nav: the <nav> landmark wraps the
      // labelled <ul kjList>, so listitems retain a `role="list"` parent and
      // the landmark gets a clean accessible name. The kjAs="nav" form is
      // available for layouts that prefer to put kjList on <nav> directly.
      const { container } = await render(
        `<nav aria-label="Primary">
           <ul kjList>
             <li kjListItem [kjActive]="true">
               <a href="/home" aria-current="page">Home</a>
             </li>
             <li kjListItem><a href="/about">About</a></li>
           </ul>
         </nav>`,
        { imports },
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
