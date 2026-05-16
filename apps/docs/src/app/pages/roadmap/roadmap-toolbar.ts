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
    <div class="filter-group">
      <span class="filter-label">category</span>
      @for (c of categories; track c.id) {
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="activeCats().has(c.id)"
          (click)="toggleCat.emit(c.id)"
        >
          <span>{{ c.label }}</span>
          <span class="count">{{ totalsByCategory()[c.id] ?? 0 }}</span>
        </button>
      }
    </div>

    <div class="filter-group">
      <span class="filter-label">status</span>
      @for (s of columns; track s.id) {
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="activeStatuses().has(s.id)"
          (click)="toggleStatus.emit(s.id)"
        >
          <span>{{ s.label }}</span>
          <span class="count">{{ totalsByStatus()[s.id] ?? 0 }}</span>
        </button>
      }
    </div>

    @if (filterActive()) {
      <button type="button" class="clear" (click)="clearFilters.emit()">
        clear · showing {{ visibleCount() }}
      </button>
    }

    <select
      class="sort"
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
      /* Sticks below the stats strip (intrinsic ≈ 60px) in the page scroller. */
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
    .chip {
      appearance: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border: 1px solid var(--kj-border-default);
      background-color: var(--kj-bg-surface);
      color: var(--kj-fg-default);
      font-family: var(--kj-font-mono);
      font-size: 0.6875rem;
      text-transform: lowercase;
      letter-spacing: 0;
      border-radius: var(--kj-radius-field);
      cursor: pointer;
      white-space: nowrap;
    }
    .chip:hover { border-color: var(--kj-bg-primary); }
    .chip[aria-pressed="true"] {
      background-color: var(--kj-bg-primary);
      color: var(--kj-fg-on-primary);
      border-color: var(--kj-bg-primary);
    }
    .chip .count {
      font-size: 0.625rem;
      opacity: 0.6;
      margin-left: 2px;
      font-variant-numeric: tabular-nums;
    }
    .chip[aria-pressed="true"] .count { opacity: 0.85; }
    .sort {
      appearance: none;
      background-color: var(--kj-bg-surface);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field);
      color: var(--kj-fg-default);
      font-family: var(--kj-font-mono);
      font-size: 0.6875rem;
      padding: 6px 26px 6px 10px;
      cursor: pointer;
      margin-left: auto;
      background-image:
        linear-gradient(45deg, transparent 50%, var(--kj-fg-muted) 50%),
        linear-gradient(135deg, var(--kj-fg-muted) 50%, transparent 50%);
      background-position: calc(100% - 14px) 50%, calc(100% - 10px) 50%;
      background-size: 4px 4px;
      background-repeat: no-repeat;
    }
    .clear {
      appearance: none;
      background: transparent;
      border: 0;
      font-family: var(--kj-font-mono);
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--kj-fg-muted);
      cursor: pointer;
      padding: 0;
    }
    .clear:hover { color: var(--kj-fg-primary); }

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
