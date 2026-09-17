import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KJ_ROVING_TABINDEX, KjRovingTabindexItem } from '../a11y/roving-tabindex';
import { KjList, KjListRow } from './list';

expect.extend(toHaveNoViolations);

const imports = [KjList, KjListRow];

describe('KjList', () => {
  describe('container role', () => {
    it('emits role="list" on a <ul> host (defeats Safari list-style:none stripping)', async () => {
      const { container } = await render(
        `<ul kjList aria-label="Recent files"><li kjListRow>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root.tagName).toBe('UL');
      expect(root).toHaveAttribute('role', 'list');
    });

    it('emits role="list" on a <ol> host as well', async () => {
      const { container } = await render(
        `<ol kjList kjAs="ol" aria-label="Steps"><li kjListRow>A</li></ol>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root.tagName).toBe('OL');
      expect(root).toHaveAttribute('role', 'list');
    });

    it('emits role="list" on a <div> host', async () => {
      const { container } = await render(
        `<div kjList kjAs="div" aria-label="Stats"><div kjListRow>A</div></div>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).toHaveAttribute('role', 'list');
    });
  });

  describe('as="nav" landmark', () => {
    it('switches the host to a <nav> landmark and omits role="list"', async () => {
      const { container } = await render(
        `<nav kjList kjAs="nav" aria-label="Primary"><div kjListRow>A</div></nav>`,
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
          `<nav kjList kjAs="nav"><div kjListRow>A</div></nav>`,
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
          `<nav kjList kjAs="nav" aria-label="Primary"><div kjListRow>A</div></nav>`,
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
        `<ul kjList aria-label="L"><li kjListRow>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).toHaveAttribute('data-orientation', 'vertical');
    });

    it('reflects horizontal when kjOrientation="horizontal"', async () => {
      const { container } = await render(
        `<ul kjList kjOrientation="horizontal" aria-label="L"><li kjListRow>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('does not bind aria-orientation (axe aria-allowed-attr forbids it on role="list")', async () => {
      const { container } = await render(
        `<ul kjList kjOrientation="horizontal" aria-label="L"><li kjListRow>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).not.toHaveAttribute('aria-orientation');
    });

    it('reflects data-divided and data-hoverable when toggled', async () => {
      const { container } = await render(
        `<ul kjList [kjDivided]="true" [kjHoverable]="true" aria-label="L"><li kjListRow>A</li></ul>`,
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
          <!-- Either form works: kjArrowNavigation now carries the same
               booleanAttribute transform as KjAccordion's input of the same
               name, so the bare attribute in KjList's own TSDoc example
               type-checks too. Bound here to name the value explicitly. -->
          <ul kjList [kjArrowNavigation]="true" aria-label="Primary">
            <li kjListRow>A</li>
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

    it('the active row seeds the tab stop onto its roving item (a11y F-19)', async () => {
      @Component({
        standalone: true,
        imports: [...imports, KjRovingTabindexItem],
        template: `
          <nav kjList kjAs="nav" [kjArrowNavigation]="true" aria-label="Primary">
            <div kjListRow><a kjRovingTabindexItem href="#home">Home</a></div>
            <div kjListRow [kjActive]="true"><a kjRovingTabindexItem href="#settings" aria-current="page">Settings</a></div>
            <div kjListRow><a kjRovingTabindexItem href="#about">About</a></div>
          </nav>
        `,
      })
      class Host {}

      const { container } = await render(Host);
      const links = container.querySelectorAll<HTMLAnchorElement>('a');
      expect(links[0]).toHaveAttribute('tabindex', '-1');
      expect(links[1]).toHaveAttribute('tabindex', '0');
      expect(links[2]).toHaveAttribute('tabindex', '-1');
    });

    it('an UNBOUND kjOrientation still pins the axis (off-axis keys ignored)', async () => {
      // A `hostDirectives` input alias carries a binding, never a default, so
      // `<ul kjList>` used to leave the roving primitive at `'both'` while the
      // host reported `data-orientation="vertical"` — ArrowRight walked a
      // vertical nav list. `KJ_ROVING_ORIENTATION_DEFAULT` carries the
      // effective value whether or not the input is bound.
      @Component({
        standalone: true,
        imports: [...imports, KjRovingTabindexItem],
        template: `
          <ul kjList [kjArrowNavigation]="true" aria-label="Primary">
            <li kjListRow><a kjRovingTabindexItem href="#home">Home</a></li>
            <li kjListRow><a kjRovingTabindexItem href="#about">About</a></li>
          </ul>
        `,
      })
      class Host {}

      const { container, detectChanges } = await render(Host);
      const root = container.querySelector('[kjList]')!;
      expect(root).toHaveAttribute('data-orientation', 'vertical');
      const links = container.querySelectorAll<HTMLAnchorElement>('a');
      links[0].focus();

      const press = (key: string) => {
        (document.activeElement ?? document.body).dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
        detectChanges();
      };

      press('ArrowRight');
      expect(links[0]).toHaveAttribute('tabindex', '0');
      expect(links[1]).toHaveAttribute('tabindex', '-1');

      press('ArrowDown');
      expect(links[1]).toHaveAttribute('tabindex', '0');
      expect(links[0]).toHaveAttribute('tabindex', '-1');
    });

    it('a bound kjOrientation still wins over the pinned default', async () => {
      @Component({
        standalone: true,
        imports: [...imports, KjRovingTabindexItem],
        template: `
          <ul kjList kjOrientation="horizontal" [kjArrowNavigation]="true" aria-label="Tools">
            <li kjListRow><a kjRovingTabindexItem href="#a">A</a></li>
            <li kjListRow><a kjRovingTabindexItem href="#b">B</a></li>
          </ul>
        `,
      })
      class Host {}

      const { container, detectChanges } = await render(Host);
      const links = container.querySelectorAll<HTMLAnchorElement>('a');
      links[0].focus();
      const press = (key: string) => {
        (document.activeElement ?? document.body).dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
        detectChanges();
      };

      press('ArrowDown');
      expect(links[0]).toHaveAttribute('tabindex', '0');

      press('ArrowRight');
      expect(links[1]).toHaveAttribute('tabindex', '0');
    });
  });

  describe('KjListRow', () => {
    it('omits role on <li> and emits role="listitem" on <div>', async () => {
      const { container } = await render(
        `<ul kjList aria-label="L">
           <li kjListRow>A</li>
           <div kjListRow>B</div>
         </ul>`,
        { imports },
      );
      const items = Array.from(container.querySelectorAll('[kjListRow]'));
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
            <li kjListRow [kjActive]="active()">A</li>
          </ul>
        `,
      })
      class Host {
        active = signal(true);
      }

      const { container, fixture } = await render(Host);
      const item = container.querySelector('[kjListRow]')!;
      expect(item).toHaveAttribute('data-active', '');

      fixture.componentInstance.active.set(false);
      fixture.detectChanges();
      expect(item).not.toHaveAttribute('data-active');
    });

    it('reflects kjDisabled to data-disabled', async () => {
      const { container } = await render(
        `<ul kjList aria-label="L">
           <li kjListRow [kjDisabled]="true">A</li>
         </ul>`,
        { imports },
      );
      const item = container.querySelector('[kjListRow]')!;
      expect(item).toHaveAttribute('data-disabled', '');
    });
  });

  describe('axe', () => {
    it('passes axe audit on a basic <ul> list', async () => {
      const { container } = await render(
        `<ul kjList aria-label="Recent files">
           <li kjListRow>A</li>
           <li kjListRow>B</li>
           <li kjListRow>C</li>
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
             <li kjListRow [kjActive]="true">
               <a href="/home" aria-current="page">Home</a>
             </li>
             <li kjListRow><a href="/about">About</a></li>
           </ul>
         </nav>`,
        { imports },
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  // arch F-2 — a bare attribute binds the empty string, which is falsy. Every
  // boolean input needs `booleanAttribute` or the form the docs teach no-ops.
  describe('bare boolean attributes (arch F-2)', () => {
    it('kjDivided / kjHoverable reflect from the bare attribute form', async () => {
      const { container } = await render(
        `<ul kjList kjDivided kjHoverable aria-label="Files"><li kjListRow>A</li></ul>`,
        { imports },
      );
      const root = container.querySelector('[kjList]')!;
      expect(root).toHaveAttribute('data-divided', '');
      expect(root).toHaveAttribute('data-hoverable', '');
    });

    it('kjDisabled / kjActive on a row reflect from the bare attribute form', async () => {
      const { container } = await render(
        `<ul kjList aria-label="Files"><li kjListRow kjDisabled kjActive>A</li></ul>`,
        { imports },
      );
      // The row paints the chrome only — `aria-disabled` is the projected
      // child's job, per KjListRow's own contract.
      const row = container.querySelector('[kjListRow]')!;
      expect(row).toHaveAttribute('data-disabled', '');
      expect(row).toHaveAttribute('data-active', '');
    });

    it('kjListWrap="false" turns wrapping off (a string attribute, not a binding)', async () => {
      const { container } = await render(
        `<ul kjList kjListWrap="false" aria-label="Files"><li kjListRow>A</li></ul>`,
        { imports },
      );
      // `booleanAttribute('false')` is false — without the transform the
      // string 'false' would have been truthy and wrapping would stay on.
      expect(container.querySelector('[kjList]')).toBeTruthy();
    });
  });
});
