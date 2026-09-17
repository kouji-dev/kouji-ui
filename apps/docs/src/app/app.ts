import { Component, PLATFORM_ID, inject, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LoadingScreenComponent } from './components/loading-screen/loading-screen';
import { LoadingService } from './services/loading.service';
import { SearchComponent } from './components/search/search.component';
import { ThemeService } from './services/theme.service';
import { ProgressBarComponent } from './components/progress-bar/progress-bar';

/**
 * Root shell.
 *
 * The splash is deliberately **not** part of the prerendered output. Every
 * route is prerendered (`outputMode: "static"`), so the real content is in the
 * HTML from the first byte; rendering `<kj-loading-screen>` server-side —
 * `position: fixed; inset: 0; z-index: 9999` — plus `visibility: hidden` on
 * the shell would occlude it until hydration finished, and would occlude it
 * *forever* on a client whose JS never runs. The `@defer (when isBrowser)`
 * block keeps the splash available for client-side transitions
 * (`LoadingService.show()`) while leaving the server render untouched, and
 * keeps its chunk out of the initial bundle.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingScreenComponent, SearchComponent, ProgressBarComponent],
  template: `
    @defer (when isBrowser) {
      @if (loading.isLoading()) {
        <kj-loading-screen />
      }
    }
    <div class="app-shell" [class.content-hidden]="loading.isLoading()">
      <router-outlet />
    </div>
    @defer (when isBrowser) {
      <kj-progress-bar />
    }
    <kj-search />
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: block;
        height: 100dvh;
        overflow: hidden;
      }
      .content-hidden {
        visibility: hidden;
      }
      .app-shell {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      }
      .app-shell > router-outlet {
        display: contents;
      }
    `,
  ],
})
export class App {
  protected readonly loading = inject(LoadingService);
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Inject the ThemeService here so it bootstraps on app start (not just when
  // a child component happens to inject it). Without this the landing page
  // never sets data-theme on <html>, leaving every --kj-color-* unresolved
  // until the user visits a route that mounts the sidebar.
  private readonly themeService = inject(ThemeService);
}
