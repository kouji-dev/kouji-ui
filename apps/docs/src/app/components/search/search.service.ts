import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DocsService } from '../../services/docs.service';

export interface SearchResult {
  slug: string;
  componentName: string;
  categoryPath: string[];
  matchLabel: string;
  matchType: 'component' | 'directive' | 'input' | 'selector';
  score: number;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly docs = inject(DocsService);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);
  readonly query = signal('');
  readonly results = signal<SearchResult[]>([]);
  readonly activeIndex = signal(0);

  open(): void { this.isOpen.set(true); this.query.set(''); this.results.set([]); }
  close(): void { this.isOpen.set(false); this.query.set(''); this.activeIndex.set(0); }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  search(q: string): void {
    this.query.set(q);
    this.activeIndex.set(0);

    if (!q.trim()) { this.results.set([]); return; }

    const term = q.toLowerCase().trim();
    const pages = this.docs.pages();
    const found: SearchResult[] = [];

    for (const page of pages) {
      const compName = page.title.toLowerCase();
      const slug = page.name;
      const catPath = page.categoryPath;

      // Page title match
      if (compName.includes(term)) {
        found.push({
          slug, componentName: page.title, categoryPath: catPath,
          matchLabel: page.title, matchType: 'component',
          score: compName.startsWith(term) ? 100 : 80,
        });
      }

      for (const item of page.definitions) {
        if (item.kind !== 'directive') continue;
        const dir = item.directive;
        if (!dir) continue;

        // Directive class name
        if (item.symbol.toLowerCase().includes(term)) {
          found.push({
            slug, componentName: page.title, categoryPath: catPath,
            matchLabel: item.symbol, matchType: 'directive',
            score: item.symbol.toLowerCase().startsWith(term) ? 70 : 60,
          });
        }

        // Selector match
        if (dir.selector.toLowerCase().includes(term)) {
          found.push({
            slug, componentName: page.title, categoryPath: catPath,
            matchLabel: dir.selector, matchType: 'selector',
            score: 65,
          });
        }

        // Input name match
        for (const input of dir.inputs) {
          if (input.name.toLowerCase().includes(term)) {
            found.push({
              slug, componentName: page.title, categoryPath: catPath,
              matchLabel: `${dir.selector} → ${input.name}`, matchType: 'input',
              score: 50,
            });
          }
        }
      }
    }

    // Sort by score desc, dedupe by slug+matchLabel
    const seen = new Set<string>();
    const deduped = found
      .sort((a, b) => b.score - a.score)
      .filter(r => {
        const key = r.slug + r.matchLabel;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 12); // max 12 results

    this.results.set(deduped);
  }

  navigate(result: SearchResult): void {
    this.router.navigate(['/docs/components', result.slug]);
    this.close();
  }

  moveUp(): void {
    const n = this.results().length;
    if (!n) return;
    this.activeIndex.set((this.activeIndex() - 1 + n) % n);
  }

  moveDown(): void {
    const n = this.results().length;
    if (!n) return;
    this.activeIndex.set((this.activeIndex() + 1) % n);
  }

  selectActive(): void {
    const r = this.results()[this.activeIndex()];
    if (r) this.navigate(r);
  }
}
