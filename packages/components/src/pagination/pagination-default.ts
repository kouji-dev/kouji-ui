import {
  Component,
  ChangeDetectionStrategy,
  ModelSignal,
  ViewEncapsulation,
  booleanAttribute,
  input,
  model,
} from '@angular/core';
import {
  KjIcon,
} from '@kouji-ui/core';
import { KjPaginationComponent } from './pagination-root';
import { KjPaginationItemComponent } from './pagination-item';
import { KjPaginationPreviousComponent } from './pagination-previous';
import { KjPaginationNextComponent } from './pagination-next';
import { KjPaginationFirstComponent } from './pagination-first';
import { KjPaginationLastComponent } from './pagination-last';
import { KjPaginationEllipsisComponent } from './pagination-ellipsis';
import { KjPaginationInfoComponent } from './pagination-info';

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
 * @doc-category Library/Navigation
 * @doc
 * @doc-name pagination
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
    KjIcon,
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
      <kj-pagination-next><i kjIcon="chevron-right"></i></kj-pagination-next>
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
export class KjPaginationDefault {
  /**
   * Current page (1-indexed). Two-way bound.
   * Field annotation matches the directive's so ng-packagr does not narrow
   * the model signal and break the `[(kjPage)]` binding through the wrapper.
   */
  readonly kjPage: ModelSignal<number> = model<number>(1);
  /** Total number of pages. Required; may be `0` for an empty dataset. */
  readonly kjTotalPages = input.required<number>();
  /** Pages shown on each side of the current one. Default `1`. */
  readonly kjSiblingCount = input<number>(1);
  /** Pages anchored at each end of the range. Default `1`. */
  readonly kjBoundaryCount = input<number>(1);
  /** Cascaded onto items/boundaries. Unset falls back to the `provideKjPagination(…)` default (`'default'`). */
  readonly kjVariant = input<string | undefined>(undefined);
  /** Cascaded onto items/boundaries. Unset falls back to the configured default (`'md'`). */
  readonly kjSize = input<string | undefined>(undefined);
  /** Render the First / Last boundary buttons. Default `true`. */
  readonly kjShowFirstLast = input(true, { transform: booleanAttribute });
  /** Render the trailing "Page N of M" info span. Default `false`. */
  readonly kjShowInfo = input(false, { transform: booleanAttribute });
}
