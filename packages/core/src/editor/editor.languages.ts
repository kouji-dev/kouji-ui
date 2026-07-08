import { type EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { KjMonacoLanguageLoader } from './editor.types';

/**
 * Registered per-language lazy loaders, keyed by (normalised) language id.
 * `multi` so several `provideMonacoLanguages` calls compose; later
 * registrations win on key collision. Consumed by `KjEditorLoader.ensureLanguage`.
 */
export const KJ_MONACO_LANGUAGE_LOADERS = new InjectionToken<
  Record<string, KjMonacoLanguageLoader>[]
>('KJ_MONACO_LANGUAGE_LOADERS', { providedIn: 'root', factory: () => [] });

/**
 * Register lazy loaders for individual Monaco languages so only the languages an
 * editor actually uses are downloaded, and only when first used. This keeps the
 * base editor lean when you bundle a **minimal** Monaco (the `provideMonaco({ loader })`
 * path); with the default CDN loader every language is already bundled, so
 * registering loaders is optional (a missing id simply falls back to the
 * built-in language).
 *
 * @example
 * provideMonacoLanguages({
 *   python: () => import('monaco-editor/esm/vs/basic-languages/python/python.contribution'),
 *   rust:   () => import('monaco-editor/esm/vs/basic-languages/rust/rust.contribution'),
 * })
 *
 * @doc
 * @doc-name editor
 * @doc-order 2
 */
export function provideMonacoLanguages(
  loaders: Record<string, KjMonacoLanguageLoader>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: KJ_MONACO_LANGUAGE_LOADERS, useValue: loaders, multi: true },
  ]);
}

/** Short aliases → canonical Monaco language ids. */
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  tsx: 'typescript',
  md: 'markdown',
  yml: 'yaml',
  sh: 'shell',
  bash: 'shell',
  py: 'python',
  rb: 'ruby',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  htm: 'html',
  text: 'plaintext',
  '': 'plaintext',
};

/** Map a friendly/alias language name to the canonical Monaco language id. */
export function normalizeLanguage(lang: string | undefined | null): string {
  if (!lang) return 'plaintext';
  const lower = lang.toLowerCase();
  return LANGUAGE_ALIASES[lower] ?? lower;
}
