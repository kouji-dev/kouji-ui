import { Component, computed, DestroyRef, effect, HostListener, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DocsService, SidebarNode } from '../../services/docs.service';
import { SearchService } from '../search/search.service';
import { ThemeService, AVAILABLE_THEMES, Theme } from '../../services/theme.service';

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

  protected readonly tree = signal<SidebarNode[]>([]);
  protected readonly isDark = computed(() => this.themeService.isDark());
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
  }

  ngOnInit(): void {
    this.docs.loadManifest().subscribe(() => {
      this.tree.set(this.docs.getSidebarTree());
    });
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
