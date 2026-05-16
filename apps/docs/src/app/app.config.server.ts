import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DocsManifestProvider } from './services/docs-manifest.provider';
import { ServerDocsManifestProvider } from './services/docs-manifest.server';
import { RoadmapDataProvider } from './services/roadmap-data.provider';
import { ServerRoadmapDataProvider } from './services/roadmap-data.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: DocsManifestProvider, useClass: ServerDocsManifestProvider },
    { provide: RoadmapDataProvider, useClass: ServerRoadmapDataProvider },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
