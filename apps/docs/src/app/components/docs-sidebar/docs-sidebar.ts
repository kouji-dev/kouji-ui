import {
  Component,
  ChangeDetectionStrategy,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, startWith } from 'rxjs/operators';
import { DocsService, type DocsTrack, type SidebarNode } from '../../services/docs.service';
import { SearchService } from '../search/search.service';
import { SidebarToggleService } from '../../services/sidebar-toggle.service';

/**
 * One layer entry in the sidebar tray. Each track from `DocsService.getTracks()`
 * becomes a collapsible layer with its own color-coded mark and category groups.
 */
interface LayerView {
  id: string;
  /** Single uppercase letter shown in `.layer-mark`. */
  mark: string;
  label: string;
  sub: string;
  groups: SidebarNode[];
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
  private readonly location = inject(Location);
  private readonly docs = inject(DocsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search = inject(SearchService);
  private readonly url = signal<string>(this.router.url);
  protected readonly toggleService = inject(SidebarToggleService);

  /** Opens the global command palette mounted by `<kj-search>` in `app.ts`. */
  protected openSearch(): void {
    this.search.open();
  }

  protected readonly gettingStartedActive = computed(() =>
    this.url().startsWith('/docs/getting-started'),
  );

  /** Track-derived layers; rebuilt when the manifest pages change. */
  protected readonly layers = computed<LayerView[]>(() => {
    // Read `pages()` to register the signal dependency — getTracks() is a
    // plain method that reads the manifest cache, so we need the signal
    // touch here to recompute once the manifest finishes loading.
    this.docs.pages();
    return this.buildLayers(this.docs.getTracks());
  });

  /** Which layers are currently expanded. Both default-open like the design. */
  protected readonly openLayers = signal<ReadonlySet<string>>(new Set(['headless', 'components']));

  /** URL segment that identifies the active track (`headless` | `components` | null). */
  protected readonly activeTrack = computed<string | null>(() => {
    const m = this.url().match(/^\/docs\/(headless|components)(?:\/|$)/);
    return m ? m[1] : null;
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
        this.expandActiveLayer();
      });
    this.docs.loadManifest().subscribe(() => this.expandActiveLayer());
  }

  protected toggleLayer(id: string): void {
    this.openLayers.update(cur => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected isLayerOpen(id: string): boolean {
    return this.openLayers().has(id);
  }

  /** Builds the route segment for one track ('headless' | 'components'). */
  protected pageLink(trackId: string, slug: string): string[] {
    return ['/docs', trackId, slug];
  }

  /**
   * Returns true when the given route is the active doc URL. Mirrors
   * `routerLinkActive` for `aria-selected` on tree leaves (required with
   * `role="treeitem"`). Uses `Location` + `serializeUrl` so SSR/prerender
   * stays stable.
   */
  protected leafSelected(routerLink: string[]): boolean {
    // Read url() so this method recomputes after each navigation.
    this.url();
    const current = this.location.path().split(/[?#]/)[0] ?? '';
    const target = this.router.serializeUrl(this.router.createUrlTree(routerLink));
    return current === target;
  }

  /** Ensures the layer containing the active page stays expanded. */
  private expandActiveLayer(): void {
    const track = this.activeTrack();
    if (!track) return;
    this.openLayers.update(cur => {
      if (cur.has(track)) return cur;
      const next = new Set(cur);
      next.add(track);
      return next;
    });
  }

  private buildLayers(tracks: DocsTrack[]): LayerView[] {
    return tracks.map(t => ({
      id: t.id,
      mark: t.id.charAt(0).toUpperCase(),
      label: t.id === 'headless' ? 'headless' : 'components',
      sub: t.id === 'headless' ? 'directives + services' : 'ready to use',
      groups: t.tree,
    }));
  }
}
