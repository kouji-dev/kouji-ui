import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  KjCommandPaletteComponent,
  KjCommandItemComponent,
  KjCommandPaletteItemTemplate,
} from '@kouji-ui/components';
import { SearchService, type SearchResult } from './search.service';

@Component({
  selector: 'kj-search',
  standalone: true,
  imports: [KjCommandPaletteComponent, KjCommandItemComponent, KjCommandPaletteItemTemplate],
  templateUrl: './search.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './search.component.css',
})
export class SearchComponent {
  protected readonly svc = inject(SearchService);

  protected onQueryChange(q: string): void {
    this.svc.search(q);
  }

  protected onResultClick(result: SearchResult): void {
    this.svc.navigate(result);
  }

  protected onActivate(event: { value: unknown }): void {
    const value = event.value;
    if (typeof value !== 'string') return;
    const match = this.svc.results().find((r) => r.slug + ':' + r.matchLabel === value);
    if (match) this.svc.navigate(match);
  }
}
