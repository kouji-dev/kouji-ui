import { Component, ChangeDetectionStrategy, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, startWith } from 'rxjs/operators';
import { DocsService, SidebarNode } from '../../services/docs.service';

export type DocsSection = 'getting-started' | 'headless' | 'components' | null;

interface ColARow {
  id: Exclude<DocsSection, null>;
  label: string;
  href: string;
  hasChildren: boolean;
}

@Component({
  selector: 'kj-docs-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './docs-sidebar.html',
  styleUrl: './docs-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsSidebarComponent {
  private readonly router = inject(Router);
  private readonly docs = inject(DocsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = signal<string>(this.router.url);

  protected readonly rows: ColARow[] = [
    { id: 'getting-started', label: 'Getting Started', href: '/docs/getting-started', hasChildren: false },
    { id: 'headless',        label: 'Headless',        href: '/docs/headless',        hasChildren: true  },
    { id: 'components',      label: 'Components',      href: '/docs/components',      hasChildren: true  },
  ];

  protected readonly activeSection = computed<DocsSection>(() => {
    const u = this.url();
    if (u.startsWith('/docs/getting-started')) return 'getting-started';
    if (u.startsWith('/docs/headless')) return 'headless';
    if (u.startsWith('/docs/components')) return 'components';
    return null;
  });

  /** Column B is rendered when an active section has children. (Markup added in Task 4.) */
  protected readonly colBOpen = computed(() => {
    const s = this.activeSection();
    return s === 'headless' || s === 'components';
  });

  protected readonly colBTree = computed<SidebarNode[]>(() => {
    const s = this.activeSection();
    if (s !== 'headless' && s !== 'components') return [];
    const track = this.docs.getTracks().find(t => t.id === s);
    return track?.tree ?? [];
  });

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.url.set(this.router.url));
    this.docs.loadManifest().subscribe();
  }
}
