import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DocsManifestProvider } from './services/docs-manifest.provider';
import { ServerDocsManifestProvider } from './services/docs-manifest.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: DocsManifestProvider, useClass: ServerDocsManifestProvider },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
