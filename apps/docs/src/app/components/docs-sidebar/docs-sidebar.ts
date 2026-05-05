import { Component, afterNextRender, computed, DestroyRef, effect, HostListener, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DocsService, DocsTrack as DocsTrackInfo, SidebarNode } from '../../services/docs.service';
import { SearchService } from '../search/search.service';
import { ThemeService, AVAILABLE_THEMES, Theme } from '../../services/theme.service';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { BUILT_IN_NAMES, type BuiltInName } from '../../lib/theme/built-in-themes';

/**
 * Sidebar UI state — drill-in navbar with three logical levels:
 *   - 'top'        : top-level menu showing [Docs] / [Theme Generator] as drill rows
 *   - 'docs'       : inside Docs section — getting-started + per-track drill rows
 *   - 'generator'  : inside Theme Generator section — built-in + my themes
 *   - <track-id>   : drilled into a specific Docs track ('headless', 'components')
 */
export type SidebarView = 'top' | 'docs' | 'generator' | string;
const VIEW_STORAGE_KEY = 'kj-sidebar-view';

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
  private readonly draftService = inject(ThemeDraftService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly router = inject(Router);

  /** All available tracks — populated from DocsService after manifest load. */
  protected readonly tracks = signal<DocsTrackInfo[]>([]);
  protected readonly isDark = computed(() => this.themeService.isDark());

  /** Sidebar UI state — drives which level renders. */
  protected readonly view = signal<SidebarView>('top');

  /** Active track when drilled into one; null otherwise. */
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

  /** Built-in theme names for the theme generator section. */
  protected readonly builtInThemes = BUILT_IN_NAMES;
  /** Saved user themes — read from ThemeDraftService.list() at render time. */
  protected readonly myThemes = computed(() => this.draftService.list().map(t => t.name));

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

    // Init view from URL → localStorage → 'top'. Runs in the browser only.
    afterNextRender(() => {
      const fromUrl = this.viewFromUrl(this.router.url);
      if (fromUrl) {
        this.view.set(fromUrl);
      } else {
        const stored = localStorage.getItem(VIEW_STORAGE_KEY) as SidebarView | null;
        if (stored && this.isKnownView(stored)) this.view.set(stored);
      }

      // Auto-sync view with the URL on every navigation.
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => {
          const v = this.viewFromUrl(e.urlAfterRedirects);
          if (v && v !== this.view()) this.view.set(v);
        });
    });

    // Persist the view whenever it changes.
    effect(() => {
      const v = this.view();
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(VIEW_STORAGE_KEY, v);
      }
    });
  }

  ngOnInit(): void {
    this.docs.loadManifest().subscribe(() => {
      this.tracks.set(this.docs.getTracks());
    });
  }

  protected setView(v: SidebarView): void { this.view.set(v); }

  /** "Back" target for the current view. Drives the back row visibility + label. */
  protected backTarget(): { view: SidebarView; label: string } | null {
    const v = this.view();
    if (v === 'top') return null;
    if (v === 'docs') return { view: 'top', label: 'Menu' };
    if (v === 'generator') return { view: 'top', label: 'Menu' };
    // Drilled into a track — back goes to the docs section top.
    return { view: 'docs', label: 'Docs' };
  }

  /** Click handler for the drill row — closes mobile drawer; routerLink handles nav. */
  protected onDrill(_trackId: string): void { this.close(); }

  /** Total items across all categories of a tree — shown in the drill-row count chip. */
  protected totalItems(tree: SidebarNode[]): number {
    return tree.reduce((acc, cat) => acc + cat.children.length, 0);
  }

  /** Map a URL to the sidebar view that should be active for it. */
  private viewFromUrl(url: string): SidebarView | null {
    if (url.startsWith('/theme-generator')) return 'generator';
    // Track URLs win over the generic /docs match below.
    for (const t of this.tracks()) {
      if (url.startsWith('/docs/' + t.id)) return t.id;
    }
    if (url.startsWith('/docs/headless')) return 'headless';
    if (url.startsWith('/docs/components')) return 'components';
    if (url.startsWith('/docs')) return 'docs';
    return null;
  }

  private isKnownView(v: string): boolean {
    return v === 'top' || v === 'docs' || v === 'generator'
        || v === 'headless' || v === 'components';
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

  protected onForkBuiltIn(name: BuiltInName): void {
    this.draftService.loadFork(name);
    this.close();
  }
  protected onLoadSaved(name: string): void {
    this.draftService.loadSaved(name);
    this.close();
  }
  protected onNewTheme(): void {
    this.draftService.loadFork('light');
    this.draftService.setName('');
    this.close();
  }

  protected onImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const result = this.draftService.importJson(text);
      if (!result.ok) console.warn('[theme-import]', result.reason);
      input.value = '';      // allow re-import of the same file
      this.router.navigateByUrl('/theme-generator');
    });
    this.close();
  }
}
