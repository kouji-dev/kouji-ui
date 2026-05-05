import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';

/**
 * Docs-internal callout — flex container with an icon on the left and prose
 * content on the right. Mirrors the original docs design (info / success /
 * warning / destructive variants accent the left border + icon color).
 *
 * Lives in apps/docs (not @kouji-ui/components) because the icon-on-left
 * pattern with content projection is a docs-specific convention and isn't
 * generalizable enough to ship as a library component.
 *
 * @example
 * ```html
 * <kj-docs-callout variant="info">
 *   <span class="callout-icon">◈</span>
 *   <p><strong>Lead.</strong> Body text.</p>
 * </kj-docs-callout>
 * ```
 */
@Component({
  selector: 'kj-docs-callout',
  standalone: true,
  template: `
    <div class="callout" role="note" [attr.data-variant]="variant()">
      <ng-content />
    </div>
  `,
  styleUrl: './callout.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsCalloutComponent {
  readonly variant = input<'info' | 'success' | 'warning' | 'destructive'>('info');
}
