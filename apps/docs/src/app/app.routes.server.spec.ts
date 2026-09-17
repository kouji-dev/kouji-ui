import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrerenderFallback, RenderMode } from '@angular/ssr';
import { describe, expect, test } from 'vitest';
import { serverRoutes } from './app.routes.server';

/**
 * One output mode, one story (SSR review F-5 + F-11).
 *
 * The docs build is `outputMode: "static"`: `@angular/build:application` only
 * emits a Node server entry when `ssr.entry` is configured, and the deploy is
 * a pure static one. So there is nothing for `PrerenderFallback.Server` to
 * fall back *to*, and a dead Express app plus a second unreferenced static
 * server used to sit in the tree stating otherwise.
 */
const REPO_ROOT = resolve(__dirname, '../../../..');

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, rel), 'utf8')) as T;
}

describe('docs server routes', () => {
  // These two used to assert the opposite — that no route falls back to a
  // server render — on the reasoning that a static deploy has no runtime server
  // to fall back TO. That reasoning was right about production and wrong about
  // what the setting governs. `fallback` decides what happens for a path that
  // was NOT prerendered, and prerendering is a build-time step, so under
  // `ng serve` every request to a `:slug` route takes it. With `Client` the dev
  // server returns the bare CSR shell, TransferState is empty, and
  // `DocsService.loadManifest()` falls back to an HTTP fetch nothing answers —
  // every doc page then hung on "Loading…" forever. `Server` is also Angular's
  // documented default when `fallback` is omitted.
  test('every prerendered slug route falls back to a server render', () => {
    const slugRoutes = serverRoutes.filter(r => r.path.includes(':slug'));
    expect(slugRoutes.length).toBeGreaterThan(0);
    for (const route of slugRoutes) {
      expect(route.renderMode).toBe(RenderMode.Prerender);
      expect('fallback' in route && route.fallback).toBe(PrerenderFallback.Server);
    }
  });

  test('the fallback is unreachable in production because every slug is enumerated', () => {
    // The deployed site is `outputMode: "static"` and every slug comes from
    // `getPrerenderParams()`, so the fallback is never consulted there; the
    // static host resolves unknown paths itself. It is load-bearing in dev only.
    const slugRoutes = serverRoutes.filter(r => r.path.includes(':slug'));
    for (const route of slugRoutes) {
      expect(typeof (route as { getPrerenderParams?: unknown }).getPrerenderParams).toBe('function');
    }
  });

  test('the build is static and declares no SSR entry', () => {
    const angular = readJson<{
      projects: Record<string, { architect: Record<string, { options: Record<string, unknown> }> }>;
    }>('angular.json');
    const build = angular.projects['docs'].architect['build'].options;
    expect(build['outputMode']).toBe('static');
    expect(build['ssr']).toBeUndefined();
  });

  test('the deploy serves the prerendered browser output', () => {
    const vercel = readJson<{ outputDirectory: string }>('vercel.json');
    expect(vercel.outputDirectory).toBe('dist/docs/browser');
  });

  test('the dead Express app and its duplicate static server are gone', () => {
    expect(existsSync(resolve(REPO_ROOT, 'apps/docs/src/server.ts'))).toBe(false);
    expect(existsSync(resolve(REPO_ROOT, 'apps/docs/src/serve-static.mjs'))).toBe(false);
  });

  /**
   * The other half of SSR review F-5: three hand-written static servers, each
   * with its own MIME table, directory-index rule and SPA fallback, so a
   * prerendered route could resolve under one Playwright config and 404 under
   * another. There is one now.
   */
  describe('one static server', () => {
    const CANONICAL = 'scripts/serve-docs-dist.mjs';

    test('the per-suite copies are deleted', () => {
      expect(existsSync(resolve(REPO_ROOT, CANONICAL))).toBe(true);
      expect(existsSync(resolve(REPO_ROOT, 'apps/docs/e2e/static-server.mjs'))).toBe(false);
      expect(existsSync(resolve(REPO_ROOT, 'apps/docs/e2e-static/static-server.mjs'))).toBe(false);
    });

    test.each(['playwright.prod.config.ts', 'playwright.i18n.config.ts', 'playwright.static.config.ts'])(
      '%s starts the canonical server',
      (config) => {
        const src = readFileSync(resolve(REPO_ROOT, config), 'utf8');
        expect(src).toContain(CANONICAL);
        expect(src).not.toContain('static-server.mjs');
      },
    );
  });
});
