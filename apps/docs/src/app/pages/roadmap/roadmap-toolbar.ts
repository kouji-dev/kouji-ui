import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  KjButtonComponent,
  KjOptionComponent,
  KjSelectComponent,
  KjTagComponent,
} from '@kouji-ui/components';
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
  imports: [KjButtonComponent, KjOptionComponent, KjSelectComponent, KjTagComponent],
  template: `
    <div class="filter-group">
      <span class="filter-label">category</span>
      @for (c of categories; track c.id) {
        <kj-tag
          kjVariant="outline"
          kjSize="xs"
          [kjTagSelectable]="true"
          [kjTagSelected]="activeCats().has(c.id)"
          (kjTagSelectedChange)="toggleCat.emit(c.id)"
        >
          {{ c.label }}
          <span class="count">{{ totalsByCategory()[c.id] ?? 0 }}</span>
        </kj-tag>
      }
    </div>

    <div class="filter-group">
      <span class="filter-label">status</span>
      @for (s of columns; track s.id) {
        <kj-tag
          kjVariant="outline"
          kjSize="xs"
          [kjTagSelectable]="true"
          [kjTagSelected]="activeStatuses().has(s.id)"
          (kjTagSelectedChange)="toggleStatus.emit(s.id)"
        >
          {{ s.label }}
          <span class="count">{{ totalsByStatus()[s.id] ?? 0 }}</span>
        </kj-tag>
      }
    </div>

    @if (filterActive()) {
      <kj-button kjVariant="link" kjSize="sm" (click)="clearFilters.emit()">
        clear · showing {{ visibleCount() }}
      </kj-button>
    }

    <kj-select
      class="sort"
      [value]="sort()"
      (valueChange)="sortChange.emit($any($event))"
      aria-label="Sort roadmap items"
    >
      <kj-option [value]="'date-desc'">sort: newest first</kj-option>
      <kj-option [value]="'date-asc'">sort: oldest first</kj-option>
      <kj-option [value]="'version-desc'">sort: version desc</kj-option>
      <kj-option [value]="'version-asc'">sort: version asc</kj-option>
      <kj-option [value]="'issues'">sort: most discussed</kj-option>
    </kj-select>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding: 16px 32px;
      background-color: var(--kj-bg-body);
      border-bottom: 1px solid var(--kj-border-default);
      position: sticky;
      top: 60px;
      z-index: 20;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .filter-label {
      font-family: var(--kj-font-mono);
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--kj-fg-muted);
      margin-right: 4px;
    }
    /* Tag-internal count chip — small, muted; brightens when the tag is pressed. */
    .count {
      font-size: 0.625rem;
      opacity: 0.6;
      margin-left: 4px;
      font-variant-numeric: tabular-nums;
    }
    kj-tag[aria-pressed="true"] .count { opacity: 0.85; }

    .sort {
      margin-left: auto;
      min-width: 12rem;
    }

    @media (max-width: 760px) {
      :host { padding: 12px 20px; }
    }
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
