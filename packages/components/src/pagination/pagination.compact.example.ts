import { Component, signal } from '@angular/core';
import {
  KjPaginationComponent,
  KjPaginationItemComponent,
  KjPaginationPreviousComponent,
  KjPaginationNextComponent,
} from './pagination';

/**
 * Compact layout — no first / last, no ellipsis. Just Previous, the
 * current page, and Next. Demonstrates that consumers can drop tokens
 * from the canonical layout to ship a Material-style minimal paginator
 * without changing the underlying directives.
 */
@Component({
  selector: 'kj-pagination-compact-example',
  standalone: true,
  imports: [
    KjPaginationComponent,
    KjPaginationItemComponent,
    KjPaginationPreviousComponent,
    KjPaginationNextComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <kj-pagination [(kjPage)]="page" [kjTotalPages]="10" #p="kjPagination">
      <kj-pagination-previous>‹</kj-pagination-previous>
      <kj-pagination-item [kjPage]="p.page()">{{ p.page() }}</kj-pagination-item>
      <kj-pagination-next>›</kj-pagination-next>
    </kj-pagination>
  `,
})
export class KjPaginationCompactExample {
  readonly page = signal(3);
}
