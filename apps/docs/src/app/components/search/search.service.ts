import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../services/analytics.service';
import { DocsService } from '../../services/docs.service';

/** Docs track a result belongs to — mirrors the two routes under /docs. */
export type SearchTrack = 'headless' | 'components';

export interface SearchResult {
  slug: string;
  /** Source package — decides the docs track (`core` → headless, `components`). */
  pkg: 'core' | 'components';
  /** Track badge shown on the row. */
  track: SearchTrack;
  /** Page the symbol is documented on. */
  componentName: string;
  categoryPath: string[];
  /**
   * The thing the row represents — a class, service, provider function, token.
   * Never a selector and never an input: those are how a row is *found*, not
   * what it is, so they are reported in {@link via} instead of becoming rows of
   * their own. One row per symbol, so a directive that matches on its name, its
   * selector and three of its inputs is still one result.
   */
  symbol: string;
  /** What the symbol is: `directive`, `service`, `token`, … */
  kind: string;
  /** What matched, when it was not the symbol's own name (a selector, an input). */
  via?: string;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly docs = inject(DocsService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);

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
    this.analytics.trackSearch(q);

    if (!q.trim()) { this.results.set([]); return; }

    const term = q.toLowerCase().trim();
    // One entry per symbol. A symbol that matches several ways (its own name,
    // its selector, one of its inputs) keeps only its strongest match, so the
    // list never repeats the same thing under a different label.
    const best = new Map<string, SearchResult>();

    const offer = (r: SearchResult): void => {
      const key = r.slug + ':' + r.symbol;
      const existing = best.get(key);
      if (!existing || r.score > existing.score) best.set(key, r);
    };

    for (const page of this.docs.pages()) {
      const track: SearchTrack = page.pkg === 'core' ? 'headless' : 'components';
      const base = {
        slug: page.name,
        pkg: page.pkg,
        track,
        componentName: page.title,
        categoryPath: page.categoryPath,
      };
      const main = page.definitions.find((d) => d.isMain);

      // A page-title hit is reported against the page's main symbol, so
      // searching "button" yields one row rather than the page AND its class.
      if (page.title.toLowerCase().includes(term)) {
        offer({
          ...base,
          symbol: main?.symbol ?? page.title,
          kind: main?.kind ?? 'page',
          score: page.title.toLowerCase().startsWith(term) ? 100 : 80,
        });
      }

      for (const item of page.definitions) {
        const symbol = item.symbol;
        const lower = symbol.toLowerCase();

        if (lower.includes(term)) {
          offer({ ...base, symbol, kind: item.kind, score: lower.startsWith(term) ? 75 : 65 });
          continue;
        }

        const dir = item.kind === 'directive' ? item.directive : null;
        if (!dir) continue;

        if (dir.selector.toLowerCase().includes(term)) {
          offer({ ...base, symbol, kind: item.kind, via: dir.selector, score: 60 });
          continue;
        }

        const input = dir.inputs.find((i) => i.name.toLowerCase().includes(term));
        if (input) {
          offer({ ...base, symbol, kind: item.kind, via: input.name, score: 45 });
        }
      }
    }

    this.results.set([...best.values()].sort((a, b) => b.score - a.score).slice(0, 12));
  }

  navigate(result: SearchResult): void {
    const track = result.pkg === 'core' ? 'headless' : 'components';
    this.analytics.track('select_content', { content_type: 'component_doc', item_id: result.slug });
    this.router.navigate(['/docs', track, result.slug]);
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
