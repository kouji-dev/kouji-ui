import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';

/**
 * Themed anchor link.
 * Presentation-only: no headless directive in core, no behavior beyond native <a>.
 *
 * Variants:
 * - `default` — accent-colored inline link with underline
 * - `subtle`  — base-content colored, no underline (for nav links)
 * - `nav`     — same as subtle plus padding/hover background (sidebar nav)
 *
 * Set `external` to add `target="_blank" rel="noopener"`.
 *
 * @example
 * ```html
 * <kj-link href="/docs">Docs</kj-link>
 * <kj-link href="https://github.com" external>GitHub</kj-link>
 * <kj-link href="/docs/components/button" variant="nav">Button</kj-link>
 * ```
 */
@Component({
  selector: 'kj-link',
  standalone: true,
  template: `
    <a
      class="kj-link"
      [attr.href]="href()"
      [attr.data-variant]="variant()"
      [attr.target]="external() ? '_blank' : null"
      [attr.rel]="external() ? 'noopener' : null"
    >
      <ng-content />
    </a>
  `,
  styleUrl: './link.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjLinkComponent {
  readonly href = input<string>('');
  readonly variant = input<'default' | 'subtle' | 'nav'>('default');
  readonly external = input(false);
}
