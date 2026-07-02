import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjDrawer, KjDrawerService } from '@kouji-ui/core';
import {
  KjAvatarComponent,
  KjBreadcrumbComponent,
  KjBreadcrumbCurrentComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbListComponent,
  KjButtonComponent,
  KjCheckboxComponent,
  KjEmptyStateComponent,
  KjEmptyStateDescriptionComponent,
  KjEmptyStateIconComponent,
  KjEmptyStateTitleComponent,
  KjInputComponent,
  KjInputGroupAddonComponent,
  KjInputGroupComponent,
  KjKbdComponent,
  KjOptionComponent,
  KjPaginationComponent,
  KjPaginationEllipsisComponent,
  KjPaginationItemComponent,
  KjPaginationNextComponent,
  KjPaginationPreviousComponent,
  KjRadioComponent,
  KjRadioGroupComponent,
  KjSelectComponent,
  KjSliderComponent,
  KjTagComponent,
  KjTagListComponent,
} from '@kouji-ui/components';
import { PEOPLE } from './fixtures';

type ResultType = 'all' | 'people' | 'files' | 'projects' | 'conversations';
type SortMode = 'recent' | 'alpha' | 'views';
type ViewMode = 'list' | 'grid';

const ALL_TAGS = ['Engineering', 'Design', 'Ops', 'Research', 'Marketing'] as const;
const ALL_STATUS = ['Open', 'In review', 'Done', 'Archived'] as const;

// TODO(theme-gen): rebuild mobile drawer with new API — currently a placeholder
// body that no longer shares state with the parent search filters.
@Component({
  selector: 'kj-preview-search-filters-drawer',
  standalone: true,
  imports: [KjDrawer, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-drawer>
      <h3 style="margin: 0 0 var(--kj-space-md);">Filters</h3>
      <p>Filters here.</p>
      <kj-button kjVariant="ghost">Reset filters</kj-button>
    </kj-drawer>
  `,
})
export class FiltersDrawerBody {}

@Component({
  selector: 'kj-preview-search',
  standalone: true,
  imports: [
    FormsModule,
    KjAvatarComponent,
    KjBreadcrumbComponent,
    KjBreadcrumbCurrentComponent,
    KjBreadcrumbItemComponent,
    KjBreadcrumbLinkComponent,
    KjBreadcrumbListComponent,
    KjButtonComponent,
    KjCheckboxComponent,
    KjEmptyStateComponent,
    KjEmptyStateDescriptionComponent,
    KjEmptyStateIconComponent,
    KjEmptyStateTitleComponent,
    KjInputComponent,
    KjInputGroupAddonComponent,
    KjInputGroupComponent,
    KjKbdComponent,
    KjOptionComponent,
    KjPaginationComponent,
    KjPaginationEllipsisComponent,
    KjPaginationItemComponent,
    KjPaginationNextComponent,
    KjPaginationPreviousComponent,
    KjRadioComponent,
    KjRadioGroupComponent,
    KjSelectComponent,
    KjSliderComponent,
    KjTagComponent,
    KjTagListComponent,
  ],
  templateUrl: './search.html',
  styleUrl: './search.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewSearch {
  private readonly drawer = inject(KjDrawerService);

  protected readonly query = signal('');
  protected readonly page = signal(1);
  protected readonly people = PEOPLE;
  protected readonly results = computed(() => this.people);
  protected readonly chips: readonly { label: string; variant: 'primary' | 'success' | 'info' }[] =
    [
      { label: 'Engineering', variant: 'primary' },
      { label: 'Open', variant: 'success' },
      { label: 'This week', variant: 'info' },
    ];

  protected readonly allTags = ALL_TAGS;
  protected readonly allStatus = ALL_STATUS;

  protected readonly type = signal<ResultType>('all');
  protected readonly statusOpen = signal(true);
  protected readonly statusReview = signal(false);
  protected readonly statusDone = signal(false);
  protected readonly statusArchived = signal(false);
  protected readonly selectedTags = signal<readonly string[]>(['Engineering']);
  protected readonly lastActivity = signal(7);
  protected readonly owners = signal<string[]>([]);
  protected readonly sort = signal<SortMode>('recent');
  protected readonly view = signal<ViewMode>('list');

  protected toggleTag(tag: string): void {
    this.selectedTags.update((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    );
  }

  protected isTagSelected(tag: string): boolean {
    return this.selectedTags().includes(tag);
  }

  protected resetFilters(): void {
    this.type.set('all');
    this.statusOpen.set(false);
    this.statusReview.set(false);
    this.statusDone.set(false);
    this.statusArchived.set(false);
    this.selectedTags.set([]);
    this.lastActivity.set(30);
    this.owners.set([]);
  }

  protected openFilters(): void {
    this.drawer.open(FiltersDrawerBody);
  }
}
