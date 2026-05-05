import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingScreenComponent } from './components/loading-screen/loading-screen';
import { LoadingService } from './services/loading.service';
import { SearchComponent } from './components/search/search.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingScreenComponent, SearchComponent],
  template: `
    @if (loading.isLoading()) {
      <kj-loading-screen />
    }
    <div [class.content-hidden]="loading.isLoading()">
      <router-outlet />
    </div>
    <kj-search />
  `,
  styles: [`
    .content-hidden { visibility: hidden; }
  `],
})
export class App implements OnInit {
  protected readonly loading = inject(LoadingService);
  // Inject the ThemeService here so it bootstraps on app start (not just when
  // a child component happens to inject it). Without this the landing page
  // never sets data-theme on <html>, leaving every --kj-color-* unresolved
  // until the user visits a route that mounts the sidebar.
  private readonly themeService = inject(ThemeService);

  ngOnInit(): void {
    // Hide loading screen after a short delay to let the animation play
    // In production, this would be after critical data is loaded
    setTimeout(() => this.loading.hide(), 1600);
  }
}
