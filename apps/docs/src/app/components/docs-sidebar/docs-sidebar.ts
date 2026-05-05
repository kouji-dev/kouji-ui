import { Component, afterNextRender, computed, DestroyRef, effect, HostListener, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DocsService, SidebarNode } from '../../services/docs.service';
import { SearchService } from '../search/search.service';
import { ThemeService, AVAILABLE_THEMES, Theme } from '../../services/theme.service';

export type DocsTrack = 'headless' | 'components';
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

  /** Headless directives — populated from the core manifest after load. */
  protected readonly headlessTree = signal<SidebarNode[]>([]);
  /** Styled components — hardcoded list from DocsService. */
  protected readonly componentsTree = signal<SidebarNode[]>([]);
  protected readonly isDark = computed(() => this.themeService.isDark());

  /** Active sidebar track. Drives which tree is shown under the selector. */
  protected readonly activeTrack = signal<DocsTrack>('headless');
  /** Active tree derived from the selected track. */
  protected readonly activeTree = computed(() =>
    this.activeTrack() === 'headless' ? this.headlessTree() : this.componentsTree(),
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

    // Init the active track from URL → localStorage → default. Always runs in
    // the browser; afterNextRender ensures we read window safely under SSR.
    afterNextRender(() => {
      const fromUrl = this.trackFromUrl(this.router.url);
      if (fromUrl) {
        this.activeTrack.set(fromUrl);
      } else {
        const stored = localStorage.getItem(TRACK_STORAGE_KEY) as DocsTrack | null;
        if (stored === 'headless' || stored === 'components') {
          this.activeTrack.set(stored);
        }
      }

      // Keep the selector in sync with the URL when the user navigates.
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => {
          const t = this.trackFromUrl(e.urlAfterRedirects);
          if (t && t !== this.activeTrack()) this.activeTrack.set(t);
        });
    });

    // Persist the active track whenever it changes.
    effect(() => {
      const t = this.activeTrack();
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(TRACK_STORAGE_KEY, t);
      }
    });
  }

  ngOnInit(): void {
    this.docs.loadManifest().subscribe(() => {
      this.headlessTree.set(this.docs.getSidebarTree());
      this.componentsTree.set(this.docs.getStyledComponentsTree());
    });
  }

  protected setTrack(t: DocsTrack): void { this.activeTrack.set(t); }

  /** Total items across all categories of a tree — shown in the selector tab. */
  protected totalItems(tree: SidebarNode[]): number {
    return tree.reduce((acc, cat) => acc + cat.children.length, 0);
  }

  private trackFromUrl(url: string): DocsTrack | null {
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
}
