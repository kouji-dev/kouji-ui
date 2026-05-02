import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DOCS_MANIFEST_TOKEN } from './docs.tokens';
import { DocsApiService } from './services/docs-api.service';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: DOCS_MANIFEST_TOKEN,
      useFactory: () => new DocsApiService().getManifest(),
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
