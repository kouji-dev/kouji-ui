import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjDrawerTrigger } from '@kouji-ui/core';
import {
  KjAvatarComponent,
  KjBreadcrumbComponent,
  KjBreadcrumbCurrentComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbListComponent,
  KjButtonComponent,
  KjDrawerBodyComponent,
  KjDrawerComponent,
  KjDrawerHeaderComponent,
  KjDrawerTitleComponent,
  KjEmptyStateComponent,
  KjEmptyStateDescriptionComponent,
  KjEmptyStateIconComponent,
  KjEmptyStateTitleComponent,
  KjInputComponent,
  KjKbdComponent,
  KjPaginationComponent,
  KjPaginationEllipsisComponent,
  KjPaginationItemComponent,
  KjPaginationNextComponent,
  KjPaginationPreviousComponent,
  KjTagComponent,
  KjTagListComponent,
} from '@kouji-ui/components';
import { PEOPLE } from './fixtures';

@Component({
  selector: 'kj-preview-search',
  standalone: true,
  imports: [
    FormsModule,
    KjDrawerTrigger,
    KjAvatarComponent,
    KjBreadcrumbComponent,
    KjBreadcrumbCurrentComponent,
    KjBreadcrumbItemComponent,
    KjBreadcrumbLinkComponent,
    KjBreadcrumbListComponent,
    KjButtonComponent,
    KjDrawerBodyComponent,
    KjDrawerComponent,
    KjDrawerHeaderComponent,
    KjDrawerTitleComponent,
    KjEmptyStateComponent,
    KjEmptyStateDescriptionComponent,
    KjEmptyStateIconComponent,
    KjEmptyStateTitleComponent,
    KjInputComponent,
    KjKbdComponent,
    KjPaginationComponent,
    KjPaginationEllipsisComponent,
    KjPaginationItemComponent,
    KjPaginationNextComponent,
    KjPaginationPreviousComponent,
    KjTagComponent,
    KjTagListComponent,
  ],
  templateUrl: './search.html',
  styleUrl: './search.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewSearch {
  protected readonly query = signal('');
  protected readonly page = signal(1);
  protected readonly people = PEOPLE;
  protected readonly results = computed(() => this.people);
  protected readonly chips = ['Engineering', 'Open', 'This week'] as const;
}
