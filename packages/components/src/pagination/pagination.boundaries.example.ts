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
 * Boundary states — starts on page 1, where First and Previous reflect
 * `aria-disabled="true"` (and stay focusable). Click Next a few times to
 * watch them re-enable; navigate to the last page to see Next / Last
 * become disabled.
 */
@Component({
  selector: 'kj-pagination-boundaries-example',
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
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <kj-pagination [(kjPage)]="page" [kjTotalPages]="5" #p="kjPagination">
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
export class KjPaginationBoundariesExample {
  readonly page = signal(1);
}
