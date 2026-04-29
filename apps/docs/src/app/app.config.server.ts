import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DOCS_MANIFEST_TOKEN } from './docs.tokens';
import type { DocsManifest } from './services/docs.service';

function readManifest(): DocsManifest | null {
  // Try source path (ng serve / prerender) then dist path (production server)
  const candidates = [
    resolve(process.cwd(), 'apps/docs/src/assets/docs-manifest.json'),
    resolve(process.cwd(), 'dist/docs/browser/assets/docs-manifest.json'),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, 'utf-8')) as DocsManifest;
    } catch {
      // try next
    }
  }
  return null;
}

const serverManifest = readManifest();

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    ...(serverManifest ? [{ provide: DOCS_MANIFEST_TOKEN, useValue: serverManifest }] : []),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
