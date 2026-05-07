import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjOverlayBadge } from './overlay-badge';
import { KjOverlayBadgeContent } from './overlay-badge-content';
import type { KjOverlayBadgePosition } from './overlay-badge.context';

expect.extend(toHaveNoViolations);

const imports = [KjOverlayBadge, KjOverlayBadgeContent];

const anchor = (extras = ''): string =>
  `<button kjOverlayBadge ${extras}>Bell<span kjOverlayBadgeContent>4</span></button>`;

describe('KjOverlayBadge', () => {
  describe('position', () => {
    it('defaults data-position to top-end on the content node', async () => {
      const { container } = await render(anchor(), { imports });
      expect(container.querySelector('[kjOverlayBadgeContent]')).toHaveAttribute(
        'data-position',
        'top-end',
      );
    });

    it.each<KjOverlayBadgePosition>([
      'top-end',
      'top-start',
      'bottom-end',
      'bottom-start',
    ])(
      'reflects %s verbatim to data-position — RTL is a CSS concern, not JS',
      async corner => {
        const { container } = await render(anchor(`[kjPosition]="'${corner}'"`), {
          imports,
        });
        expect(container.querySelector('[kjOverlayBadgeContent]')).toHaveAttribute(
          'data-position',
          corner,
        );
      },
    );

    it('does not read [dir] — same data-position regardless of RTL', async () => {
      const { container } = await render(
        `<div dir="rtl">${anchor(`[kjPosition]="'top-end'"`)}</div>`,
        { imports },
      );
      expect(container.querySelector('[kjOverlayBadgeContent]')).toHaveAttribute(
        'data-position',
        'top-end',
      );
    });
  });

  describe('dot mode', () => {
    it('omits data-dot when kjDot is false (default)', async () => {
      const { container } = await render(anchor(), { imports });
      expect(container.querySelector('[kjOverlayBadgeContent]')).not.toHaveAttribute(
        'data-dot',
      );
    });

    it('reflects data-dot="" when kjDot is true', async () => {
      const { container } = await render(anchor(`[kjDot]="true"`), { imports });
      expect(container.querySelector('[kjOverlayBadgeContent]')).toHaveAttribute(
        'data-dot',
        '',
      );
    });
  });

  describe('decorative mode', () => {
    it('sets aria-hidden="true" on the content node', async () => {
      const { container } = await render(
        anchor(`[kjDecorative]="true" kjDescription="ignored"`),
        { imports },
      );
      expect(container.querySelector('[kjOverlayBadgeContent]')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });

    it('does not merge a description id into aria-describedby when decorative', async () => {
      const { container } = await render(
        anchor(`[kjDecorative]="true" kjDescription="4 unread"`),
        { imports },
      );
      expect(container.querySelector('button')).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('aria-describedby merge', () => {
    it('appends the description id while preserving existing ids', async () => {
      const template = `
        <button kjOverlayBadge kjDescription="4 unread" aria-describedby="hint err">
          Bell<span kjOverlayBadgeContent>4</span>
        </button>
        <span id="hint">Hint</span>
        <span id="err">Error</span>
      `;
      const { container } = await render(template, { imports });
      const button = container.querySelector('button')!;
      const ids = button.getAttribute('aria-describedby')!.split(/\s+/u);

      expect(ids[0]).toBe('hint');
      expect(ids[1]).toBe('err');
      expect(ids[2]).toMatch(/^kj-overlay-badge-\d+-desc$/u);
    });

    it('renders a single description id when no consumer ids exist', async () => {
      const { container } = await render(anchor(`kjDescription="4 unread"`), {
        imports,
      });
      const button = container.querySelector('button')!;
      const ids = button.getAttribute('aria-describedby')!.split(/\s+/u);
      expect(ids).toHaveLength(1);
      expect(ids[0]).toMatch(/^kj-overlay-badge-\d+-desc$/u);
    });

    it('drops aria-describedby when no description and no original ids', async () => {
      const { container } = await render(anchor(), { imports });
      expect(container.querySelector('button')).not.toHaveAttribute('aria-describedby');
    });

    it('preserves original aria-describedby when description is unset', async () => {
      const template = `
        <button kjOverlayBadge aria-describedby="hint">
          Bell<span kjOverlayBadgeContent>4</span>
        </button>
        <span id="hint">Hint</span>
      `;
      const { container } = await render(template, { imports });
      expect(container.querySelector('button')).toHaveAttribute(
        'aria-describedby',
        'hint',
      );
    });

    it('removes the description id when description is cleared', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <button kjOverlayBadge [kjDescription]="desc()">
            Bell<span kjOverlayBadgeContent>4</span>
          </button>
        `,
      })
      class Host {
        readonly desc = signal<string | undefined>('4 unread');
      }
      const { fixture } = await render(Host);
      const button = fixture.nativeElement.querySelector('button')!;
      expect(button.getAttribute('aria-describedby')).toMatch(/^kj-overlay-badge-\d+-desc$/u);

      fixture.componentInstance.desc.set(undefined);
      fixture.detectChanges();

      expect(button.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('content host bindings', () => {
    it('applies pointer-events:none on the content host so clicks reach the anchor', async () => {
      const { container } = await render(anchor(), { imports });
      const content = container.querySelector('[kjOverlayBadgeContent]') as HTMLElement;
      expect(content.style.pointerEvents).toBe('none');
    });

    it('applies position:absolute on the content host', async () => {
      const { container } = await render(anchor(), { imports });
      const content = container.querySelector('[kjOverlayBadgeContent]') as HTMLElement;
      expect(content.style.position).toBe('absolute');
    });

    it('host-composes KjBadge — data-variant lands on the content node', async () => {
      const { container } = await render(
        `<button kjOverlayBadge>Bell<span kjOverlayBadgeContent [kjBadgeVariant]="'destructive'">4</span></button>`,
        { imports },
      );
      expect(container.querySelector('[kjOverlayBadgeContent]')).toHaveAttribute(
        'data-variant',
        'destructive',
      );
    });

    it('aria-hidden="true" by default (no description, not decorative)', async () => {
      const { container } = await render(anchor(), { imports });
      expect(container.querySelector('[kjOverlayBadgeContent]')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });

    it('drops aria-hidden when a description is wired', async () => {
      const { container } = await render(anchor(`kjDescription="4 unread"`), {
        imports,
      });
      expect(container.querySelector('[kjOverlayBadgeContent]')).not.toHaveAttribute(
        'aria-hidden',
      );
    });
  });

  describe('anchor host bindings', () => {
    it('applies position:relative inline so the absolute content can land', async () => {
      const { container } = await render(anchor(), { imports });
      const button = container.querySelector('button') as HTMLElement;
      expect(button.style.position).toBe('relative');
    });
  });

  it('passes axe audit', async () => {
    const { container } = await render(anchor(`kjDescription="4 unread"`), {
      imports,
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
