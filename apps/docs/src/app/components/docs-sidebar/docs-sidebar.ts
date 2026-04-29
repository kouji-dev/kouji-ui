import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DocsService, SidebarNode } from '../../services/docs.service';
import { SearchService } from '../search/search.service';
import { ThemeService } from '../../services/theme.service';

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
  protected readonly tree = signal<SidebarNode[]>([]);
  protected readonly isDark = computed(() => this.themeService.theme() === 'dark');

  ngOnInit(): void {
    this.docs.loadManifest().subscribe(() => {
      this.tree.set(this.docs.getSidebarTree());
    });
  }

  protected openSearch(): void { this.search.open(); }
  protected toggleTheme(): void { this.themeService.toggle(); }
}
