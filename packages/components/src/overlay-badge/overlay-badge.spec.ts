import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { KjOverlayBadgeComponent } from './overlay-badge';

const imports = [KjOverlayBadgeComponent];

/** Resolve the badge slot rendered inside a `<kj-overlay-badge>` host. */
function slot(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[kjOverlayBadgeContent]');
  if (!el) throw new Error('expected a [kjOverlayBadgeContent] slot');
  return el;
}

/** Resolve the wrapper host element. */
function host(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('kj-overlay-badge');
  if (!el) throw new Error('expected a <kj-overlay-badge> host');
  return el;
}

describe('KjOverlayBadgeComponent (wrapper)', () => {
  describe('anchor wrapper', () => {
    it('applies position:relative on the anchor host (from KjOverlayBadge)', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjValue]="1" kjDescription="1 new"><span>Bell</span></kj-overlay-badge>`,
        { imports },
      );
      // The hostDirective `KjOverlayBadge` inline-binds position: relative
      // on its host element — which here is <kj-overlay-badge>.
      expect(host(container).style.position).toBe('relative');
    });

    it('reflects kjPosition through to the slot data-position', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjValue]="1" kjPosition="bottom-start" kjDescription="1 new"><span>Bell</span></kj-overlay-badge>`,
        { imports },
      );
      expect(slot(container).getAttribute('data-position')).toBe('bottom-start');
    });

    it('defaults position to top-end on the slot', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjValue]="1" kjDescription="1 new"><span>Bell</span></kj-overlay-badge>`,
        { imports },
      );
      expect(slot(container).getAttribute('data-position')).toBe('top-end');
    });
  });

  describe('content child composes badge', () => {
    it('forwards kjVariant onto the slot via KjBadge.kjBadgeVariant (data-variant)', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjValue]="2" kjVariant="destructive" kjDescription="2 unread">
           <span>Bell</span>
         </kj-overlay-badge>`,
        { imports },
      );
      expect(slot(container).getAttribute('data-variant')).toBe('destructive');
    });

    it('renders the truncated displayValue (99+) for values above kjMaxValue', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjValue]="248" kjDescription="lots"><span>X</span></kj-overlay-badge>`,
        { imports },
      );
      expect(slot(container).textContent?.trim()).toBe('99+');
    });

    it('renders the raw value when below kjMaxValue', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjValue]="7" kjDescription="7 new"><span>X</span></kj-overlay-badge>`,
        { imports },
      );
      expect(slot(container).textContent?.trim()).toBe('7');
    });

    it('reflects data-dot when kjDot is true and skips the value text', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjDot]="true" [kjValue]="9" kjDescription="online"><span>X</span></kj-overlay-badge>`,
        { imports },
      );
      const s = slot(container);
      expect(s.getAttribute('data-dot')).toBe('');
      expect(s.textContent?.trim()).toBe('');
    });

    it('omits the slot when kjHidden is true', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjValue]="3" [kjHidden]="true" kjDescription="3 new"><span>X</span></kj-overlay-badge>`,
        { imports },
      );
      expect(container.querySelector('[kjOverlayBadgeContent]')).toBeNull();
      expect(host(container).getAttribute('data-hidden')).toBe('');
    });

    it('omits the slot when kjValue is null and not in dot mode', async () => {
      const { container } = await render(
        `<kj-overlay-badge kjDescription="none"><span>X</span></kj-overlay-badge>`,
        { imports },
      );
      expect(container.querySelector('[kjOverlayBadgeContent]')).toBeNull();
    });
  });

  describe('description merges into aria-describedby', () => {
    it('appends the visually-hidden description id onto the anchor host', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjValue]="4" kjDescription="4 unread"><span>Bell</span></kj-overlay-badge>`,
        { imports },
      );
      const wrapper = host(container);
      const ids = wrapper.getAttribute('aria-describedby')?.split(/\s+/u) ?? [];
      expect(ids).toHaveLength(1);
      expect(ids[0]).toMatch(/^kj-overlay-badge-\d+-desc$/u);

      // The visually-hidden span actually exists with that id.
      const desc = container.querySelector(`#${ids[0]}`);
      expect(desc?.textContent?.trim()).toBe('4 unread');
    });

    it('preserves existing aria-describedby ids while appending the description id', async () => {
      const { container } = await render(
        `<kj-overlay-badge
           aria-describedby="hint err"
           [kjValue]="1"
           kjDescription="1 unread"
         ><span>Bell</span></kj-overlay-badge>
         <span id="hint">Hint</span>
         <span id="err">Error</span>`,
        { imports },
      );
      const ids = host(container).getAttribute('aria-describedby')!.split(/\s+/u);
      expect(ids[0]).toBe('hint');
      expect(ids[1]).toBe('err');
      expect(ids[2]).toMatch(/^kj-overlay-badge-\d+-desc$/u);
    });

    it('skips the describedby merge in decorative mode', async () => {
      const { container } = await render(
        `<kj-overlay-badge [kjValue]="1" [kjDecorative]="true" kjDescription="ignored"><span>X</span></kj-overlay-badge>`,
        { imports },
      );
      expect(host(container).hasAttribute('aria-describedby')).toBe(false);
      // Slot is aria-hidden in decorative mode.
      expect(slot(container).getAttribute('aria-hidden')).toBe('true');
    });

    it('drops the description id when description becomes empty', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <kj-overlay-badge [kjValue]="1" [kjDescription]="desc()">
            <span>Bell</span>
          </kj-overlay-badge>
        `,
      })
      class Host {
        readonly desc = signal<string | undefined>('1 unread');
      }

      const { fixture } = await render(Host);
      const wrapper = fixture.nativeElement.querySelector('kj-overlay-badge') as HTMLElement;
      expect(wrapper.getAttribute('aria-describedby')).toMatch(/^kj-overlay-badge-\d+-desc$/u);

      fixture.componentInstance.desc.set(undefined);
      fixture.detectChanges();

      expect(wrapper.hasAttribute('aria-describedby')).toBe(false);
    });
  });
});
