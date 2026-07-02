import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  KjPaginationComponent,
  KjPaginationItemComponent,
  KjPaginationPreviousComponent,
  KjPaginationNextComponent,
  KjPaginationFirstComponent,
  KjPaginationLastComponent,
  KjPaginationEllipsisComponent,
} from '../pagination';

/**
 * Large dataset — 50 pages with the cursor near the middle, demonstrating
 * the windowed page-token algorithm rendering ellipses on **both** sides.
 */
@Component({
  selector: 'kj-pagination-large-example',
  standalone: true,
  imports: [
    KjPaginationComponent,
    KjPaginationItemComponent,
    KjPaginationPreviousComponent,
    KjPaginationNextComponent,
    KjPaginationFirstComponent,
    KjPaginationLastComponent,
    KjPaginationEllipsisComponent,
  ],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-pagination [(kjPage)]="page" [kjTotalPages]="50" #p="kjPagination">
      <kj-pagination-first>«</kj-pagination-first>
      <kj-pagination-previous>‹</kj-pagination-previous>
      @for (token of p.pages(); track token) {
        @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
          <kj-pagination-ellipsis>…</kj-pagination-ellipsis>
        } @else {
          <kj-pagination-item [kjPage]="token">{{ token }}</kj-pagination-item>
        }
      }
      <kj-pagination-next>›</kj-pagination-next>
      <kj-pagination-last>»</kj-pagination-last>
    </kj-pagination>
  `,
})
export class KjPaginationLargeExample {
  readonly page = signal(25);
}
