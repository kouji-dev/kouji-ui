import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  CATEGORIES,
  CategoryId,
  COLUMNS,
  ROADMAP,
  RoadmapItem,
  SortMode,
  StatusId,
  versionSort,
} from './roadmap-data';
import { RoadmapToolbar } from './roadmap-toolbar';
import { RoadmapColumn } from './roadmap-column';

@Component({
  selector: 'kj-roadmap-page',
  standalone: true,
  imports: [RoadmapToolbar, RoadmapColumn],
  templateUrl: './roadmap.html',
  styleUrl: './roadmap.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapPage {
  protected readonly activeCats     = signal<ReadonlySet<CategoryId>>(new Set());
  protected readonly activeStatuses = signal<ReadonlySet<StatusId>>(new Set());
  protected readonly sort           = signal<SortMode>('date-desc');
  protected readonly expanded       = signal<ReadonlySet<string>>(new Set());

  protected readonly filtered = computed<readonly RoadmapItem[]>(() => {
    const cats = this.activeCats();
    const stats = this.activeStatuses();
    return ROADMAP.filter(i => {
      if (cats.size > 0 && !cats.has(i.category)) return false;
      if (stats.size > 0 && !stats.has(i.status)) return false;
      return true;
    });
  });

  protected readonly sorted = computed<readonly RoadmapItem[]>(() => {
    const arr = [...this.filtered()];
    switch (this.sort()) {
      case 'date-desc':    arr.sort((a, b) => versionSort(b.version) - versionSort(a.version)); break;
      case 'date-asc':     arr.sort((a, b) => versionSort(a.version) - versionSort(b.version)); break;
      case 'version-desc': arr.sort((a, b) => b.version.localeCompare(a.version)); break;
      case 'version-asc':  arr.sort((a, b) => a.version.localeCompare(b.version)); break;
      case 'issues':       arr.sort((a, b) => (b.issues || 0) - (a.issues || 0)); break;
    }
    return arr;
  });

  protected readonly itemsByStatus = computed<Readonly<Record<StatusId, readonly RoadmapItem[]>>>(() => {
    const out: Record<StatusId, RoadmapItem[]> = {
      idea: [], next: [], wip: [], shipped: [],
    };
    for (const item of this.sorted()) out[item.status].push(item);
    return out;
  });

  protected readonly totalsByStatus = computed<Readonly<Record<StatusId, number>>>(() => {
    const m: Record<StatusId, number> = { idea: 0, next: 0, wip: 0, shipped: 0 };
    for (const i of ROADMAP) m[i.status]++;
    return m;
  });

  protected readonly totalsByCategory = computed<Readonly<Record<CategoryId, number>>>(() => {
    const m: Record<CategoryId, number> = { component: 0, theme: 0, a11y: 0, perf: 0, docs: 0 };
    for (const i of ROADMAP) m[i.category]++;
    return m;
  });

  protected readonly filterActive = computed(
    () => this.activeCats().size > 0 || this.activeStatuses().size > 0,
  );

  protected readonly stats = computed(() => ({
    shipped:   ROADMAP.filter(i => i.status === 'shipped').length,
    wip:       ROADMAP.filter(i => i.status === 'wip').length,
    next:      ROADMAP.filter(i => i.status === 'next').length,
    idea:      ROADMAP.filter(i => i.status === 'idea').length,
    candidate: ROADMAP.filter(i => i.candidate).length,
  }));

  protected readonly columns = COLUMNS;
  protected readonly categories = CATEGORIES;

  protected toggleCat(id: CategoryId): void {
    const next = new Set(this.activeCats());
    next.has(id) ? next.delete(id) : next.add(id);
    this.activeCats.set(next);
  }
  protected toggleStatus(id: StatusId): void {
    const next = new Set(this.activeStatuses());
    next.has(id) ? next.delete(id) : next.add(id);
    this.activeStatuses.set(next);
  }
  protected clearFilters(): void {
    this.activeCats.set(new Set());
    this.activeStatuses.set(new Set());
  }
  protected toggleExpand(id: string): void {
    const next = new Set(this.expanded());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expanded.set(next);
  }
  protected setSort(mode: SortMode): void {
    this.sort.set(mode);
  }
}
