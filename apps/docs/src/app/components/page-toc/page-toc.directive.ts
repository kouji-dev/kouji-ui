import {
  Directive,
  ElementRef,
  InjectionToken,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { DestroyRef } from '@angular/core';

export interface TocEntry {
  id: string;
  label: string;
  level: number;
}

export const PAGE_TOC = new InjectionToken<PageTocDirective>('PageToc');

/**
 * Attach to the scrollable content container. Scans for headings (h2, h3) and
 * registers them as TOC entries. Tracks the active heading via IntersectionObserver.
 *
 * @example
 * ```html
 * <main kjPageToc #toc="kjPageToc">
 *   <h2 id="overview">Overview</h2>
 * </main>
 * ```
 * @category Core/Utilities/PageToc
 */
@Directive({
  selector: '[kjPageToc]',
  standalone: true,
  providers: [{ provide: PAGE_TOC, useExisting: PageTocDirective }],
  exportAs: 'kjPageToc',
})
export class PageTocDirective {
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly entries = signal<TocEntry[]>([]);
  readonly activeId = signal<string>('');

  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      this.refresh();
      const hashId = location.hash.slice(1);
      if (hashId) {
        this.activeId.set(hashId);
        document.getElementById(hashId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /** Re-scan headings and restart observer — called when route content has fully rendered. */
  refresh(): void {
    this.observer?.disconnect();
    this.scanHeadings();
    this.observeHeadings();
  }

  private scanHeadings(): void {
    const container = this.el.nativeElement as HTMLElement;
    // Scan standard headings AND elements with data-toc-entry (e.g. directive sections)
    const els = Array.from(
      container.querySelectorAll('h2[id], h3[id], [data-toc-entry]')
    ) as HTMLElement[];
    const found: TocEntry[] = [];
    for (const el of els) {
      const id = el.id;
      if (!id) continue;
      const label = el.getAttribute('data-toc-entry') ?? el.textContent?.trim() ?? '';
      const tagLevel = el.tagName.match(/^H(\d)$/)?.[1];
      const level = tagLevel
        ? parseInt(tagLevel, 10)
        : parseInt(el.getAttribute('data-toc-level') ?? '2', 10);
      found.push({ id, label, level });
    }
    this.entries.set(found);
    if (found.length) this.activeId.set(found[0].id);
  }

  private observeHeadings(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    const container = this.el.nativeElement as HTMLElement;
    const headings = Array.from(
      container.querySelectorAll('h2[id], h3[id], [data-toc-entry]')
    ) as HTMLElement[];
    if (!headings.length) return;

    this.observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length) {
          const id = visible[0].target.id;
          this.activeId.set(id);
          history.replaceState(null, '', `${location.pathname}#${id}`);
        }
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 }
    );

    for (const h of headings) {
      this.observer.observe(h);
    }
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }
}
