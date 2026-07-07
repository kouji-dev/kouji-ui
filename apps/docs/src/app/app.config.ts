import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
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
  ],
};
