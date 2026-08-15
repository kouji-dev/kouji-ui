import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
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
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
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
