import { Injectable, inject } from '@angular/core';
import { KJ_MONACO_CONFIG } from './editor.tokens';
import { KJ_MONACO_LANGUAGE_LOADERS, normalizeLanguage } from './editor.languages';
import type { KjMonaco, KjMonacoLanguageLoader } from './editor.types';

/**
 * Resolves the Monaco namespace **once** and memoises the promise, so every
 * `KjEditor` on the page shares a single Monaco instance.
 *
 * Resolution strategy (see {@link KjMonacoConfig}):
 * 1. A consumer-supplied `loader` wins — self-hosted / bundled Monaco.
 * 2. Otherwise dynamically `import('@monaco-editor/loader')` and `init()` it,
 *    applying `vsPath` when provided. The dynamic import keeps both Monaco and
 *    the loader out of the base bundle (their own lazy chunk).
 *
 * Browser-only: callers must gate `load()` behind `afterNextRender` /
 * `isPlatformBrowser`. Naming keeps the `Loader` suffix because `KjEditor`
 * already names the directive.
 *
 * @doc
 * @doc-name editor
 * @doc-description Loads and memoises Monaco for the code editor; source is configurable via provideMonaco.
 */
@Injectable({ providedIn: 'root' })
export class KjEditorLoader {
  private readonly config = inject(KJ_MONACO_CONFIG);
  private readonly languageLoaders = inject(KJ_MONACO_LANGUAGE_LOADERS);
  private promise: Promise<KjMonaco> | null = null;
  private readonly loadedLanguages = new Map<string, Promise<void>>();

  /** Resolve Monaco (cached after the first call). */
  load(): Promise<KjMonaco> {
    if (!this.promise) {
      this.promise = this.config.loader ? this.config.loader() : this.loadFromCdn();
    }
    return this.promise;
  }

  /**
   * Ensure a language's contribution is loaded before it's used. Runs the loader
   * registered via {@link provideMonacoLanguages} for this id (once, memoised).
   * No-ops when no loader is registered — the default CDN Monaco already ships
   * every language, so this only does work for lean/self-hosted setups.
   */
  ensureLanguage(language: string): Promise<void> {
    const id = normalizeLanguage(language);
    const existing = this.loadedLanguages.get(id);
    if (existing) return existing;

    let loader: KjMonacoLanguageLoader | undefined;
    for (const map of this.languageLoaders) {
      if (map[id]) loader = map[id];
    }
    const done = loader ? loader().then(() => undefined) : Promise.resolve();
    this.loadedLanguages.set(id, done);
    return done;
  }

  private async loadFromCdn(): Promise<KjMonaco> {
    // Dynamic import → separate lazy chunk. `@monaco-editor/loader` injects
    // Monaco (and its language workers) from a CDN at runtime, sidestepping the
    // esbuild worker-URL setup entirely.
    const mod = await import('@monaco-editor/loader');
    const loader = mod.default;
    if (this.config.vsPath) {
      loader.config({ paths: { vs: this.config.vsPath } });
    }
    return loader.init() as Promise<KjMonaco>;
  }
}
