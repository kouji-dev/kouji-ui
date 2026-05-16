import { ApplicationRef, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { filter, first } from 'rxjs/operators';
import { LoadingScreenComponent } from './components/loading-screen/loading-screen';
import { LoadingService } from './services/loading.service';
import { SearchComponent } from './components/search/search.component';
import { ThemeService } from './services/theme.service';
import { ProgressBarComponent } from './components/progress-bar/progress-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingScreenComponent, SearchComponent, ProgressBarComponent],
  template: `
    @if (loading.isLoading()) {
      <kj-loading-screen />
    }
    <div class="app-shell" [class.content-hidden]="loading.isLoading()">
      <router-outlet />
    </div>
    @defer (when isBrowser) {
      <kj-progress-bar />
    }
    <kj-search />
  `,
  styles: [`
    :host { display: block; height: 100dvh; overflow: hidden; }
    .content-hidden { visibility: hidden; }
    .app-shell { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .app-shell > router-outlet { display: contents; }
  `],
})
export class App implements OnInit {
  protected readonly loading = inject(LoadingService);
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Inject the ThemeService here so it bootstraps on app start (not just when
  // a child component happens to inject it). Without this the landing page
  // never sets data-theme on <html>, leaving every --kj-color-* unresolved
  // until the user visits a route that mounts the sidebar.
  private readonly themeService = inject(ThemeService);
  private readonly appRef = inject(ApplicationRef);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (!this.isBrowser) return;
    // Hide the splash once Angular reports the app is stable — i.e. hydration
    // is done and there are no pending async tasks. Replaces the prior fixed
    // 1600ms timer that kept the splash up regardless of actual readiness.
    this.appRef.isStable
      .pipe(filter(stable => stable), first(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loading.hide());
  }
}
