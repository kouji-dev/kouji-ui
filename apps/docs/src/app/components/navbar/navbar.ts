import { Component, ChangeDetectionStrategy, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, startWith } from 'rxjs/operators';
import {
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuTrigger,
} from '@kouji-ui/core';
import { KjButtonComponent } from '@kouji-ui/components';
import { SearchService } from '../search/search.service';
import { ThemeService, AVAILABLE_THEMES, Theme } from '../../services/theme.service';
import { SidebarToggleService } from '../../services/sidebar-toggle.service';
import corePackage from '../../../../../../packages/core/package.json';

@Component({
  selector: 'kj-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    KjButtonComponent,
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly search = inject(SearchService);
  private readonly themeService = inject(ThemeService);
  private readonly sidebarToggle = inject(SidebarToggleService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = signal<string>(this.router.url);

  protected readonly themes = AVAILABLE_THEMES;
  protected readonly currentTheme = this.themeService.theme;

  protected readonly version = corePackage.version;
  protected readonly githubUrl = 'https://github.com/kouji-dev/kouji-ui';
  protected readonly npmUrl = 'https://www.npmjs.com/package/@kouji-ui/core';

  protected readonly hasSidebar = computed(() => {
    const u = this.url();
    return u.startsWith('/docs') || u.startsWith('/theme-generator');
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.url.set(this.router.url));
  }

  protected openSearch(): void {
    this.search.open();
  }
  protected selectTheme(t: Theme): void {
    this.themeService.set(t);
  }
  protected toggleSidebar(): void {
    this.sidebarToggle.toggle();
  }
}
