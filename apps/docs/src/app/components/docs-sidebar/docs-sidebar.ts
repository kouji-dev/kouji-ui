import { Component, ChangeDetectionStrategy, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, startWith } from 'rxjs/operators';
import { DocsService, SidebarNode } from '../../services/docs.service';
import { SidebarToggleService } from '../../services/sidebar-toggle.service';

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
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './docs-sidebar.html',
  styleUrl: './docs-sidebar.css',
  host: { '[class.open]': 'toggleService.open()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsSidebarComponent {
  private readonly router = inject(Router);
  private readonly docs = inject(DocsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = signal<string>(this.router.url);
  protected readonly toggleService = inject(SidebarToggleService);

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
    // Touch the components signal so this computed re-runs once the manifest
    // finishes loading on a deep-link first paint (dev / non-prerendered).
    // `getTracks()` reads from a plain field on the service, not a signal.
    this.docs.components();
    const track = this.docs.getTracks().find(t => t.id === s);
    return track?.tree ?? [];
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.url.set(this.router.url);
        this.toggleService.close();
      });
    this.docs.loadManifest().subscribe();
  }
}
