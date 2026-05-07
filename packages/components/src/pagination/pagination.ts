import {
  Component,
  ChangeDetectionStrategy,
  ModelSignal,
  ViewEncapsulation,
  input,
  model,
} from '@angular/core';
import {
  KjPagination,
  KjPaginationItem,
  KjPaginationPrevious,
  KjPaginationNext,
  KjPaginationFirst,
  KjPaginationLast,
  KjPaginationEllipsis,
  KjPaginationInfo,
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
 *   @doc-file pagination.example.ts
 * @doc-example Large dataset (ellipsis)
 *   @doc-file pagination.large.example.ts
 * @doc-example Boundaries
 *   @doc-file pagination.boundaries.example.ts
 * @doc-example Compact
 *   @doc-file pagination.compact.example.ts
 * @doc-example With info
 *   @doc-file pagination.with-info.example.ts
 * @category Library/Navigation
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

/**
 * Per-page button within a `<kj-pagination>`. Wraps `KjPaginationItem` and
 * forwards the required `kjPage` plus optional `kjDisabled` / `kjVariant` /
 * `kjSize` inputs. Reflects `aria-current="page"` on the active page.
 *
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-pagination-item',
  standalone: true,
  imports: [KjPaginationItem],
  template: `
    <button
      type="button"
      kjPaginationItem
      class="kj-pagination-item"
      [kjPage]="kjPage()"
      [kjDisabled]="kjDisabled()"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
    >
      <ng-content />
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationItemComponent {
  /** Page number this item navigates to (1-indexed). Required. */
  readonly kjPage = input.required<number>();
  /** Per-item disabled state. Suppresses click and reflects `aria-disabled`. */
  readonly kjDisabled = input<boolean>(false);
  readonly kjVariant = input<string | undefined>(undefined);
  readonly kjSize = input<string | undefined>(undefined);
}

/**
 * Boundary control that retreats one page. Disabled (via `aria-disabled`)
 * when the parent is on page 1 or the dataset is empty.
 *
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-pagination-previous',
  standalone: true,
  imports: [KjPaginationPrevious],
  template: `
    <button
      type="button"
      kjPaginationPrevious
      class="kj-pagination-action kj-pagination-action--previous"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
    >
      <ng-content />
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationPreviousComponent {
  readonly kjVariant = input<string | undefined>(undefined);
  readonly kjSize = input<string | undefined>(undefined);
}

/**
 * Boundary control that advances one page. Disabled when the parent is on
 * the last page or the dataset is empty.
 *
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-pagination-next',
  standalone: true,
  imports: [KjPaginationNext],
  template: `
    <button
      type="button"
      kjPaginationNext
      class="kj-pagination-action kj-pagination-action--next"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
    >
      <ng-content />
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationNextComponent {
  readonly kjVariant = input<string | undefined>(undefined);
  readonly kjSize = input<string | undefined>(undefined);
}

/**
 * Boundary control that jumps to page 1. Disabled when already on the
 * first page or the dataset is empty.
 *
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-pagination-first',
  standalone: true,
  imports: [KjPaginationFirst],
  template: `
    <button
      type="button"
      kjPaginationFirst
      class="kj-pagination-action kj-pagination-action--first"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
    >
      <ng-content />
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationFirstComponent {
  readonly kjVariant = input<string | undefined>(undefined);
  readonly kjSize = input<string | undefined>(undefined);
}

/**
 * Boundary control that jumps to the last page. Disabled when already on
 * the last page or the dataset is empty.
 *
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-pagination-last',
  standalone: true,
  imports: [KjPaginationLast],
  template: `
    <button
      type="button"
      kjPaginationLast
      class="kj-pagination-action kj-pagination-action--last"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
    >
      <ng-content />
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationLastComponent {
  readonly kjVariant = input<string | undefined>(undefined);
  readonly kjSize = input<string | undefined>(undefined);
}

/**
 * Gap indicator within a `<kj-pagination>`. Wraps `KjPaginationEllipsis`;
 * the visible glyph is decorative, an AT-readable visually-hidden label
 * ("More pages") is appended at render time.
 *
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-pagination-ellipsis',
  standalone: true,
  hostDirectives: [KjPaginationEllipsis],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-pagination-ellipsis' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationEllipsisComponent {}

/**
 * Renders the localised "Page N of M" status text for a `<kj-pagination>`.
 * Wraps `KjPaginationInfo`; when the consumer projects their own content
 * the directive yields and the projection wins.
 *
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-pagination-info',
  standalone: true,
  hostDirectives: [KjPaginationInfo],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-pagination-info' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationInfoComponent {}

/**
 * Convenience wrapper that auto-renders the canonical pagination layout
 * (Previous, First, page tokens with ellipsis, Last, Next) given just
 * `kjPage` + `kjTotalPages`. Use this for the 80% case where the consumer
 * does not need to hand-author the layout.
 *
 * Drop down to the compound (`<kj-pagination>` + child wrappers + `@for`)
 * when more control is required.
 *
 * @example
 * ```html
 * <kj-pagination-default [(kjPage)]="page" [kjTotalPages]="10" />
 * ```
 *
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-pagination-default',
  standalone: true,
  imports: [
    KjPaginationComponent,
    KjPaginationItemComponent,
    KjPaginationPreviousComponent,
    KjPaginationNextComponent,
    KjPaginationFirstComponent,
    KjPaginationLastComponent,
    KjPaginationEllipsisComponent,
    KjPaginationInfoComponent,
  ],
  template: `
    <kj-pagination
      [(kjPage)]="kjPage"
      [kjTotalPages]="kjTotalPages()"
      [kjSiblingCount]="kjSiblingCount()"
      [kjBoundaryCount]="kjBoundaryCount()"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
      #p="kjPagination"
    >
      @if (kjShowFirstLast()) {
        <kj-pagination-first>«</kj-pagination-first>
      }
      <kj-pagination-previous>‹</kj-pagination-previous>
      @for (token of p.pages(); track token) {
        @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
          <kj-pagination-ellipsis>…</kj-pagination-ellipsis>
        } @else {
          <kj-pagination-item [kjPage]="token">{{ token }}</kj-pagination-item>
        }
      }
      <kj-pagination-next>›</kj-pagination-next>
      @if (kjShowFirstLast()) {
        <kj-pagination-last>»</kj-pagination-last>
      }
      @if (kjShowInfo()) {
        <kj-pagination-info />
      }
    </kj-pagination>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationDefaultComponent {
  /**
   * Current page (1-indexed). Two-way bound.
   * Field annotation matches the directive's so ng-packagr does not narrow
   * the model signal and break the `[(kjPage)]` binding through the wrapper.
   */
  readonly kjPage: ModelSignal<number> = model<number>(1);
  readonly kjTotalPages = input.required<number>();
  readonly kjSiblingCount = input<number>(1);
  readonly kjBoundaryCount = input<number>(1);
  readonly kjVariant = input<string>('default');
  readonly kjSize = input<string>('md');
  /** Render the First / Last boundary buttons. Default `true`. */
  readonly kjShowFirstLast = input<boolean>(true);
  /** Render the trailing "Page N of M" info span. Default `false`. */
  readonly kjShowInfo = input<boolean>(false);
}
