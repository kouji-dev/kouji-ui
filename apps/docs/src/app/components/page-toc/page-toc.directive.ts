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
      this.scanHeadings();
      this.observeHeadings();
    });
  }

  private scanHeadings(): void {
    const container = this.el.nativeElement as HTMLElement;
    const headings = Array.from(
      container.querySelectorAll('h2[id], h3[id]')
    ) as HTMLElement[];
    const found: TocEntry[] = [];
    for (const h of headings) {
      found.push({
        id: h.id,
        label: h.textContent?.trim() ?? '',
        level: parseInt(h.tagName[1], 10),
      });
    }
    this.entries.set(found);
    if (found.length) this.activeId.set(found[0].id);
  }

  private observeHeadings(): void {
    const container = this.el.nativeElement as HTMLElement;
    const headings = Array.from(
      container.querySelectorAll('h2[id], h3[id]')
    ) as HTMLElement[];
    if (!headings.length) return;

    this.observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length) {
          this.activeId.set(visible[0].target.id);
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
