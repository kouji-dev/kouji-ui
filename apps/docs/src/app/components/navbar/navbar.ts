import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SearchService } from '../search/search.service';
import { ThemeService, AVAILABLE_THEMES, Theme } from '../../services/theme.service';
import corePackage from '../../../../../../packages/core/package.json';

@Component({
  selector: 'kj-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly search = inject(SearchService);
  private readonly themeService = inject(ThemeService);

  protected readonly themes = AVAILABLE_THEMES;
  protected readonly currentTheme = this.themeService.theme;
  protected readonly pickerOpen = signal(false);

  protected readonly version = corePackage.version;
  protected readonly githubUrl = 'https://github.com/kouji-dev/kouji-ui';
  protected readonly npmUrl = 'https://www.npmjs.com/package/@kouji-ui/core';

  protected openSearch(): void { this.search.open(); }
  protected togglePicker(): void { this.pickerOpen.update(v => !v); }
  private closePicker(): void { this.pickerOpen.set(false); }
  protected selectTheme(t: Theme): void { this.themeService.set(t); this.closePicker(); }
}
