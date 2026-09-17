import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideLucideIcons } from '@kouji-ui/components';
import { provideKjLocale, provideKjDocumentDirection } from '@kouji-ui/core';
import { routes } from './app.routes';
import { DocsManifestProvider } from './services/docs-manifest.provider';
import { BrowserDocsManifestProvider } from './services/docs-manifest.browser';
import { RoadmapDataProvider } from './services/roadmap-data.provider';
import { BrowserRoadmapDataProvider } from './services/roadmap-data.browser';
import { RoadmapService } from './services/roadmap.service';
import { AnalyticsService, AnalyticsTitleStrategy } from './services/analytics.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless is Angular's default since v21, but the library's supported
    // change-detection mode is a contract worth stating: no zone.js polyfill,
    // signals drive every render. Core's `zoneless.spec.ts` pins it in tests.
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Incremental hydration is on (the v22 default — `withNoIncrementalHydration()`
    // used to be passed here and has been removed). The heavy, below-the-fold
    // regions on every docs page — the Monaco code blocks — are wrapped in
    // `@defer (hydrate on viewport)`, so the server still renders them (the
    // `<kj-editor>` shell is in the prerendered HTML, carrying its `ngh`
    // annotation) while the client-side bootstrap, and the Monaco chunk it
    // needs, wait until the reader scrolls to them.
    //
    // What this does NOT do is put the example source into the crawlable
    // markup: Monaco paints into an empty host in the browser, deferred or
    // not, so the code text has never been in the HTML. The crawlable copy of
    // an example is the `<pre class="code-block">` import snippet next to it.
    // Verified against `dist/docs/browser/docs/components/button/index.html`.
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideLucideIcons(),
    // Locale + RTL wiring: KjLocale is the direction source of truth;
    // provideKjDocumentDirection reflects it onto <html dir> so the visible
    // KjDirectionToggle flips the whole page (SSR-safe).
    provideKjLocale(),
    provideKjDocumentDirection(),
    { provide: DocsManifestProvider, useClass: BrowserDocsManifestProvider },
    { provide: RoadmapDataProvider, useClass: BrowserRoadmapDataProvider },
    // Eagerly construct RoadmapService on every page. During prerender this
    // seeds the roadmap items into TransferState for *every* route (not only
    // `/roadmap`), so reaching the board via client-side navigation finds the
    // data. The static Vercel deploy has no `/api/roadmap` server fallback, so
    // without this the board is empty unless `/roadmap` is loaded directly.
    provideAppInitializer(() => {
      inject(RoadmapService);
    }),
    // GA4: page_view per navigation with the title already applied (the
    // strategy runs after the router sets it), plus delegated outbound-click
    // tracking. Both are browser-only no-ops during SSR/prerender.
    { provide: TitleStrategy, useClass: AnalyticsTitleStrategy },
    provideAppInitializer(() => {
      inject(AnalyticsService).initOutboundClicks();
    }),
  ],
};
