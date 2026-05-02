import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DOCS_MANIFEST_TOKEN } from './docs.tokens';
import { getManifest } from '../lib/manifest';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: DOCS_MANIFEST_TOKEN, useFactory: getManifest },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
