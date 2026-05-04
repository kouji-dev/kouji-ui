import { Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { SearchService } from './search.service';

@Component({
  selector: 'kj-search',
  standalone: true,
  imports: [],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent {
  protected readonly svc = inject(SearchService);
  protected readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    afterNextRender(() => {
      const handler = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          this.svc.toggle();
          if (this.svc.isOpen()) {
            setTimeout(() => this.searchInput()?.nativeElement.focus(), 50);
          }
        }
        if (e.key === 'Escape' && this.svc.isOpen()) {
          this.svc.close();
        }
        if (this.svc.isOpen()) {
          if (e.key === 'ArrowDown') { e.preventDefault(); this.svc.moveDown(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); this.svc.moveUp(); }
          if (e.key === 'Enter') { e.preventDefault(); this.svc.selectActive(); }
        }
      };
      document.addEventListener('keydown', handler);
    });
  }

  protected onInput(e: Event): void {
    this.svc.search((e.target as HTMLInputElement).value);
  }

  protected onResultClick(i: number): void {
    const r = this.svc.results()[i];
    if (r) this.svc.navigate(r);
  }

  protected onBackdropClick(): void {
    this.svc.close();
  }
}
