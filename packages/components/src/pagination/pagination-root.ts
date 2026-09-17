import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjPagination,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjPagination` directive — root of the
 * pagination compound. Re-maps the `kjPage` / `kjTotalPages` /
 * `kjSiblingCount` / `kjBoundaryCount` / `kjVariant` / `kjSize` inputs and
 * mirrors the `kjPageChange` output. Hosts `<nav aria-label="Pagination">`
 * via the underlying directive.
 *
 * Compose the eight wrappers — `<kj-pagination>`, `<kj-pagination-item>`,
 * `<kj-pagination-previous>`, `<kj-pagination-next>`, `<kj-pagination-first>`,
 * `<kj-pagination-last>`, `<kj-pagination-ellipsis>`, `<kj-pagination-info>`
 * — to mirror the directive family. The root exposes the directive's
 * `pages()` computed via the `#p="kjPagination"` template ref so the
 * `@for` over numeric tokens / ellipsis tokens lives in the consumer's
 * template (the same tag-agnostic compound shape as the directives).
 *
 * @example
 * ```html
 * <kj-pagination [(kjPage)]="page" [kjTotalPages]="10" #p="kjPagination">
 *   <kj-pagination-previous>Previous</kj-pagination-previous>
 *   @for (token of p.pages(); track token) {
 *     @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
 *       <kj-pagination-ellipsis>…</kj-pagination-ellipsis>
 *     } @else {
 *       <kj-pagination-item [kjPage]="token">{{ token }}</kj-pagination-item>
 *     }
 *   }
 *   <kj-pagination-next>Next</kj-pagination-next>
 * </kj-pagination>
 * ```
 *
 * @doc-example Default
 *   The canonical hand-authored compound — First / Prev / pages / Next / Last.
 *   @doc-file pagination.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages via the `<kj-pagination-default>`
 *   convenience wrapper. Use this as the copy-paste starting point.
 *   @doc-file pagination.usage.example.ts
 * @doc-example Large dataset (ellipsis)
 *   Larger total counts surface the ellipsis windowing pattern.
 *   @doc-file pagination.large.example.ts
 * @doc-example Boundaries
 *   First / Last buttons jump to the edges of the range.
 *   @doc-file pagination.boundaries.example.ts
 * @doc-example Compact
 *   `kjSize="sm"` shrinks the row for dense table footers.
 *   @doc-file pagination.compact.example.ts
 * @doc-example With info
 *   `<kj-pagination-info>` renders the localised "Page N of M" status.
 *   @doc-file pagination.with-info.example.ts
 *
 * @doc-keyboard
 *   Tab          — Moves focus across the visible page / boundary buttons
 *   Enter|Space  — Activates the focused button (navigates to that page)
 *
 * @doc-aria
 *   role="navigation"  — On the host `<nav>` (provided by the directive)
 *   aria-label         — "Pagination" by default; localise via the directive's input
 *   aria-current="page" — Reflected on the active page item
 *   aria-disabled      — Reflected on boundary buttons when at range edges
 *   data-active        — Mirrors the current page for theme/scope hooks
 *
 * @doc-touch
 *   Items render at 2.75rem (44px) square via `--kj-pagination-item-size` —
 *   meets WCAG 2.5.5 by default. `kjSize="sm"` drops to 32px and relies on
 *   the inline-text-link exception; reserve for dense desktop tables.
 *
 * @doc-a11y
 *   The compound emits real `<button>` elements so native focus and click
 *   semantics are preserved. The ellipsis indicator is `aria-hidden` with a
 *   visually-hidden "More pages" label appended at render time. Boundary
 *   buttons reflect their disabled state via `aria-disabled` rather than
 *   `disabled` so they remain focusable (and announce a reason).
 *
 * @doc-related table,list,carousel
 *
 * @doc-css-var
 *   --kj-pagination-gap                  — Gap between adjacent page items and boundary controls.
 *   --kj-pagination-item-size            — Min width/height of each item. 2.75rem for WCAG 2.5.5.
 *   --kj-pagination-item-radius          — Corner radius for items and boundary buttons.
 *   --kj-pagination-item-bg              — Item background fill. Variants override.
 *   --kj-pagination-item-bg-hover        — Item hover background fill.
 *   --kj-pagination-item-bg-current      — Background fill on the active page.
 *   --kj-pagination-item-fg              — Item foreground (label) color.
 *   --kj-pagination-item-fg-current      — Label color on the active page.
 *   --kj-pagination-item-border-color    — Item border color. Variants override.
 *   --kj-pagination-item-border-width    — Item border thickness. Inherits --kj-border.
 *   --kj-pagination-item-font            — Item font family. Defaults to --kj-font-sans.
 *   --kj-pagination-item-font-size       — Item font size. Sizes override.
 *   --kj-pagination-ellipsis-color       — Color of the ellipsis gap glyph.
 *   --kj-pagination-info-color           — Color of the trailing "Page N of M" info text.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name pagination
 * @doc-description Themed pagination control with ellipsis windowing, accessible nav, and two-way page binding.
 * @doc-is-main
 */
@Component({
  selector: 'kj-pagination',
  standalone: true,
  hostDirectives: [
    {
      directive: KjPagination,
      inputs: [
        'kjPage',
        'kjTotalPages',
        'kjSiblingCount',
        'kjBoundaryCount',
        'kjVariant',
        'kjSize',
      ],
      outputs: ['kjPageChange'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './pagination.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-pagination' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationComponent {}
