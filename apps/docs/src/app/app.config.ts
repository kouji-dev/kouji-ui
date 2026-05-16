import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideLucideIcons } from '@kouji-ui/components';
import { routes } from './app.routes';
import { DocsManifestProvider } from './services/docs-manifest.provider';
import { BrowserDocsManifestProvider } from './services/docs-manifest.browser';
import { RoadmapDataProvider } from './services/roadmap-data.provider';
import { BrowserRoadmapDataProvider } from './services/roadmap-data.browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideLucideIcons(),
    { provide: DocsManifestProvider, useClass: BrowserDocsManifestProvider },
    { provide: RoadmapDataProvider, useClass: BrowserRoadmapDataProvider },
  ],
};
