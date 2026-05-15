import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  PLATFORM_ID,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location, isPlatformBrowser } from '@angular/common';
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
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly url = signal<string>(this.router.url);
  protected readonly toggleService = inject(SidebarToggleService);

  /**
   * Whether we've already scrolled the active leaf into view. Flips on the
   * first reveal so subsequent in-app navigations (user clicking a sidebar
   * link) don't yank the scrollbar — the user is already looking at it.
   */
  private initialScrollDone = false;

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
        this.scrollActiveIntoViewOnce();
      });
    this.docs.loadManifest().subscribe(() => {
      this.expandActiveLayer();
      this.scrollActiveIntoViewOnce();
    });
  }

  /**
   * On the first hand-off (manifest loads or first navigation), scroll the
   * active leaf into view so deep-linked URLs don't leave the user staring
   * at a sidebar scrolled to the top. After that single reveal, in-app
   * clicks rely on the user's own scroll position — they already see the
   * item they just clicked.
   *
   * Uses `block: 'nearest'` so the scroll is the minimum needed to bring the
   * item into the viewport (no centering jump). Deferred via `setTimeout`
   * so it runs after Angular commits the routerLinkActive class.
   */
  private scrollActiveIntoViewOnce(): void {
    if (this.initialScrollDone) return;
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      if (this.initialScrollDone) return;
      const active = this.host.nativeElement.querySelector<HTMLElement>(
        '.kj-docs-sidebar__nav-item--active',
      );
      if (!active) return;
      active.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      this.initialScrollDone = true;
    }, 0);
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
    // Stable order, components first. Most visitors land here for the
    // themed library; headless directives are a secondary track.
    const order: Record<string, number> = { components: 0, headless: 1 };
    return [...tracks]
      .sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99))
      .map(t => ({
        id: t.id,
        mark: t.id.charAt(0).toUpperCase(),
        label: t.id === 'headless' ? 'headless' : 'components',
        groups: t.tree,
      }));
  }
}
