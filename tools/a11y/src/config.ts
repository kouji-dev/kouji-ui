import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PageDef, Theme } from './types.js';

export const THEMES: readonly Theme[] = [
  'kouji', 'dark', 'light', 'retro', 'cyberpunk', 'corporate',
] as const;

export const PAGES: readonly PageDef[] = [
  { path: '/',                slug: 'home' },
  { path: '/getting-started', slug: 'getting-started' },
  { path: '/docs/button',     slug: 'docs-button' },
  { path: '/docs/list',       slug: 'docs-list' },
  { path: '/docs/badge',      slug: 'docs-badge' },
  { path: '/theme-generator', slug: 'theme-generator' },
] as const;

const here = fileURLToPath(new URL('.', import.meta.url));
export const REPO_ROOT = resolve(here, '..', '..', '..');
export const OUTPUT_DIR = resolve(REPO_ROOT, 'reports', 'a11y');

export const BASE_URL = 'http://localhost:4200';
export const FONT_SELECTORS = [
  'body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'button', 'a', 'code', 'p', '.kj-caption', '[role="status"]',
] as const;

export function validateThemeFilter(filter: string | undefined): readonly Theme[] {
  if (filter === undefined) return THEMES;
  if ((THEMES as readonly string[]).includes(filter)) return [filter as Theme];
  throw new Error(`Unknown theme '${filter}'. Valid themes: ${THEMES.join(', ')}`);
}

export function validatePageFilter(filter: string | undefined): readonly PageDef[] {
  if (filter === undefined) return PAGES;
  const match = PAGES.find((p) => p.path === filter);
  if (match) return [match];
  throw new Error(
    `Unknown page '${filter}'. Valid pages: ${PAGES.map((p) => p.path).join(', ')}`,
  );
}
