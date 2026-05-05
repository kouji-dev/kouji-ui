import { Component, afterNextRender, computed, DestroyRef, effect, HostListener, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DocsService, DocsTrack as DocsTrackInfo, SidebarNode } from '../../services/docs.service';
import { SearchService } from '../search/search.service';
import { ThemeService, AVAILABLE_THEMES, Theme } from '../../services/theme.service';

// TEMPORARY — replaced in Phase B Task B6 by `import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';`
const BUILT_IN_THEME_NAMES = ['kouji', 'dark', 'light', 'retro', 'cyberpunk', 'corporate'] as const;
type BuiltInName = typeof BUILT_IN_THEME_NAMES[number];

/** Top-level section: docs or theme generator. */
export type TopSection = 'docs' | 'generator';
/** Sidebar UI state — top-level menu, or the id of a drilled-into track. */
export type SidebarView = 'menu' | string;     // unchanged: 'menu' | trackId
const TRACK_STORAGE_KEY = 'kj-track';

@Component({
  selector: 'kj-docs-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './docs-sidebar.html',
  styleUrl: './docs-sidebar.css',
})
export class DocsSidebarComponent implements OnInit {
  private readonly docs = inject(DocsService);
  private readonly search = inject(SearchService);
  private readonly themeService = inject(ThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly router = inject(Router);

  /** All available tracks — populated from DocsService after manifest load. */
  protected readonly tracks = signal<DocsTrackInfo[]>([]);
  protected readonly isDark = computed(() => this.themeService.isDark());

  /** Sidebar UI state: 'menu' (top level) or a track id (drilled in). */
  protected readonly view = signal<SidebarView>('menu');
  /** True when drilled into a track's items panel. */
  protected readonly isDrilled = computed(() => this.view() !== 'menu');
  /** Active top section: docs or generator, based on current URL. */
  protected readonly topSection = computed<TopSection>(() =>
    this.router.url.startsWith('/theme-generator') ? 'generator' : 'docs'
  );
  /** Active track when drilled in; null otherwise. */
  protected readonly activeTrack = computed(() =>
    this.tracks().find(t => t.id === this.view()) ?? null,
  );
  readonly open = signal(false);

  /** Set of category labels that are currently collapsed. All expanded by default. */
  protected readonly collapsed = signal<Set<string>>(new Set());

  /** All available themes for the picker. */
  protected readonly themes = AVAILABLE_THEMES;

  /** Currently active theme name. */
  protected readonly currentTheme = computed(() => this.themeService.theme());

  /** Controls picker open/closed state. */
  protected readonly pickerOpen = signal(false);

  /** Built-in theme names for theme generator. */
  protected readonly builtInThemes = BUILT_IN_THEME_NAMES;
  /** Saved user themes for theme generator; stub for now; wired to ThemeDraftService in Phase B Task B6. */
  protected readonly myThemes = signal<string[]>([]);

  protected isCategoryCollapsed(label: string): boolean {
    return this.collapsed().has(label);
  }

  protected toggleCategory(label: string): void {
    this.collapsed.update(set => {
      const next = new Set(set);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.document.body.style.overflow = this.open() ? 'hidden' : '';
      }
    });
    destroyRef.onDestroy(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.document.body.style.overflow = '';
      }
    });

    // Init view from URL → localStorage → 'menu'. Runs in the browser only.
    afterNextRender(() => {
      const fromUrl = this.trackFromUrl(this.router.url);
      if (fromUrl) {
        this.view.set(fromUrl);
      } else {
        const stored = localStorage.getItem(TRACK_STORAGE_KEY) as SidebarView | null;
        if (stored === 'headless' || stored === 'components' || stored === 'menu') {
          this.view.set(stored);
        }
      }

      // Auto-drill into the matching track when the URL changes.
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => {
          const t = this.trackFromUrl(e.urlAfterRedirects);
          if (t && t !== this.view()) this.view.set(t);
        });
    });

    // Persist the view whenever it changes.
    effect(() => {
      const v = this.view();
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(TRACK_STORAGE_KEY, v);
      }
    });
  }

  ngOnInit(): void {
    this.docs.loadManifest().subscribe(() => {
      this.tracks.set(this.docs.getTracks());
    });
  }

  protected setView(v: SidebarView): void { this.view.set(v); }

  /** Click handler for the drill row — closes mobile drawer and lets the
   *  routerLink navigate. The view auto-syncs via the NavigationEnd listener. */
  protected onDrill(_trackId: string): void { this.close(); }

  /** Total items across all categories of a tree — shown in the drill-row count chip. */
  protected totalItems(tree: SidebarNode[]): number {
    return tree.reduce((acc, cat) => acc + cat.children.length, 0);
  }

  /** Return the track id whose URL prefix matches, if any. */
  private trackFromUrl(url: string): string | null {
    for (const t of this.tracks()) {
      if (url.startsWith('/docs/' + t.id)) return t.id;
    }
    // Manifest may not have loaded yet — fall back to the known route segments.
    if (url.startsWith('/docs/headless')) return 'headless';
    if (url.startsWith('/docs/components')) return 'components';
    return null;
  }

  toggle(): void { this.open.update(v => !v); }
  close(): void { this.open.set(false); }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.open()) this.close(); }

  protected openSearch(): void { this.search.open(); }

  /** @deprecated Use togglePicker / selectTheme for the new picker. */
  protected toggleTheme(): void { this.themeService.cycle(); }

  protected togglePicker(): void { this.pickerOpen.update(v => !v); }
  protected closePicker(): void { this.pickerOpen.set(false); }
  protected selectTheme(t: Theme): void { this.themeService.set(t); }

  protected onForkBuiltIn(_name: BuiltInName): void { this.close(); }
  protected onLoadSaved(_name: string): void { this.close(); }
  protected onNewTheme(): void { this.close(); }
}
