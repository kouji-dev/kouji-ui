import {
  Component,
  ChangeDetectionStrategy,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, startWith } from 'rxjs/operators';
import { folderIdsForPage } from '../../lib/build-docs-nav-tree';
import { DocsService } from '../../services/docs.service';
import { SidebarToggleService } from '../../services/sidebar-toggle.service';
import { DocsNavTreeComponent } from '../docs-nav-tree/docs-nav-tree';

@Component({
  selector: 'kj-docs-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DocsNavTreeComponent],
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

  /** Folder ids the user has expanded (plus ancestors of the active doc). */
  protected readonly expandedFolderIds = signal<ReadonlySet<string>>(new Set());

  protected readonly navTree = computed(() => this.docs.unifiedNavTree());

  protected readonly gettingStartedActive = computed(() =>
    this.url().startsWith('/docs/getting-started'),
  );

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
        this.expandAncestorsForCurrentUrl();
      });
    this.docs.loadManifest().subscribe(() => this.expandAncestorsForCurrentUrl());
  }

  protected onToggleFolder(id: string): void {
    this.expandedFolderIds.update(cur => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Ensures category folders leading to the active doc page stay expanded. */
  private expandAncestorsForCurrentUrl(): void {
    const page = this.docs.getPageFromDocUrl(this.router.url);
    const needed = folderIdsForPage(page);
    this.expandedFolderIds.update(cur => {
      const next = new Set(cur);
      for (const id of needed) next.add(id);
      return next;
    });
  }
}
