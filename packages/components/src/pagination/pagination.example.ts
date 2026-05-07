import { Component, signal } from '@angular/core';
import {
  KjPaginationComponent,
  KjPaginationItemComponent,
  KjPaginationPreviousComponent,
  KjPaginationNextComponent,
  KjPaginationFirstComponent,
  KjPaginationLastComponent,
  KjPaginationEllipsisComponent,
} from './pagination';

/**
 * Default pagination example — 10-page navigation with the canonical
 * layout (First / Prev / numbered window with ellipsis / Next / Last).
 * Two-way bound `[(kjPage)]` drives the active state.
 */
@Component({
  selector: 'kj-pagination-example',
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
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-pagination [(kjPage)]="page" [kjTotalPages]="10" #p="kjPagination">
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
export class KjPaginationExample {
  readonly page = signal(1);
}
