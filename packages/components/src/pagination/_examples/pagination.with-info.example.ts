import { Component, signal } from '@angular/core';
import {
  KjPaginationComponent,
  KjPaginationItemComponent,
  KjPaginationPreviousComponent,
  KjPaginationNextComponent,
  KjPaginationEllipsisComponent,
  KjPaginationInfoComponent,
} from '../pagination';

/**
 * Pagination with a trailing "Page N of M" info span. The info component
 * renders the configured `infoTemplate` text reactively as the user
 * navigates; AT users hear it when they enter the navigation landmark.
 */
@Component({
  selector: 'kj-pagination-with-info-example',
  standalone: true,
  imports: [
    KjPaginationComponent,
    KjPaginationItemComponent,
    KjPaginationPreviousComponent,
    KjPaginationNextComponent,
    KjPaginationEllipsisComponent,
    KjPaginationInfoComponent,
  ],
  styles: [`
    :host { display: block; }
    kj-pagination { width: 100%; justify-content: space-between; }
  `],
  template: `
    <kj-pagination [(kjPage)]="page" [kjTotalPages]="10" #p="kjPagination">
      <kj-pagination-previous>Previous</kj-pagination-previous>
      <kj-pagination-info />
      <kj-pagination-next>Next</kj-pagination-next>
    </kj-pagination>
  `,
})
export class KjPaginationWithInfoExample {
  readonly page = signal(3);
}
