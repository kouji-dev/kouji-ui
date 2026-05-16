import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  CATEGORIES,
  CategoryId,
  COLUMNS,
  SortMode,
  StatusId,
} from './roadmap-data';

@Component({
  selector: 'kj-roadmap-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rm-toolbar">
      <div class="rm-filter-group">
        <span class="rm-filter-label">category</span>
        @for (c of categories; track c.id) {
          <button
            type="button"
            class="rm-chip"
            [attr.aria-pressed]="activeCats().has(c.id)"
            (click)="toggleCat.emit(c.id)"
          >
            <span>{{ c.label }}</span>
            <span class="count">{{ totalsByCategory()[c.id] ?? 0 }}</span>
          </button>
        }
      </div>

      <div class="rm-filter-group">
        <span class="rm-filter-label">status</span>
        @for (s of columns; track s.id) {
          <button
            type="button"
            class="rm-chip"
            [attr.aria-pressed]="activeStatuses().has(s.id)"
            (click)="toggleStatus.emit(s.id)"
          >
            <span>{{ s.label }}</span>
            <span class="count">{{ totalsByStatus()[s.id] ?? 0 }}</span>
          </button>
        }
      </div>

      @if (filterActive()) {
        <button type="button" class="rm-clear" (click)="clearFilters.emit()">
          clear · showing {{ visibleCount() }}
        </button>
      }

      <select
        class="rm-sort"
        [value]="sort()"
        (change)="sortChange.emit($any($event.target).value)"
        aria-label="Sort roadmap items"
      >
        <option value="date-desc">sort: newest first</option>
        <option value="date-asc">sort: oldest first</option>
        <option value="version-desc">sort: version desc</option>
        <option value="version-asc">sort: version asc</option>
        <option value="issues">sort: most discussed</option>
      </select>
    </div>
  `,
})
export class RoadmapToolbar {
  protected readonly categories = CATEGORIES;
  protected readonly columns = COLUMNS;

  readonly activeCats = input.required<ReadonlySet<CategoryId>>();
  readonly activeStatuses = input.required<ReadonlySet<StatusId>>();
  readonly totalsByCategory = input.required<Readonly<Record<CategoryId, number>>>();
  readonly totalsByStatus = input.required<Readonly<Record<StatusId, number>>>();
  readonly sort = input.required<SortMode>();
  readonly filterActive = input.required<boolean>();
  readonly visibleCount = input.required<number>();

  readonly toggleCat = output<CategoryId>();
  readonly toggleStatus = output<StatusId>();
  readonly clearFilters = output<void>();
  readonly sortChange = output<SortMode>();
}
