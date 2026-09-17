import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { KJ_MONACO_CONFIG } from './editor.tokens';
import { KJ_MONACO_LANGUAGE_LOADERS, normalizeLanguage } from './editor.languages';
import type { KjMonaco, KjMonacoLanguageLoader } from './editor.types';

/** Marks a document whose global Monaco this library already initialised. */
const KJ_MONACO_MARKER_ATTR = 'data-kj-monaco';

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
 * **The memo is the page, not this instance.** `@monaco-editor/loader` works
 * by injecting a `<script>` for `vs/loader.js` and driving the page-global AMD
 * `require`; a second root injector (or a second copy of this module) would
 * believe Monaco is uninitialised and call `loader.init()` again, and a second
 * `loader.config({ paths: { vs } })` with a different `vsPath` is last-write-wins
 * on a single global. So the "already loaded" answer is read off
 * `<html data-kj-monaco>` and from `window.monaco`, which are page-scoped like
 * the thing they describe. Note that two *copies* of `@kouji-ui/core` on one
 * page remain unsupported (see `rules/architecture.md`); this only keeps the
 * shared global from being initialised twice.
 *
 * @doc
 * @doc-name editor
 * @doc-description Loads and memoises Monaco for the code editor; source is configurable via provideMonaco.
 */
@Injectable({ providedIn: 'root' })
export class KjEditorLoader {
  private readonly config = inject(KJ_MONACO_CONFIG);
  private readonly languageLoaders = inject(KJ_MONACO_LANGUAGE_LOADERS);
  private readonly document = inject(DOCUMENT, { optional: true });
  private promise: Promise<KjMonaco> | null = null;
  private readonly loadedLanguages = new Map<string, Promise<void>>();

  /** Resolve Monaco (cached after the first call, and across the page). */
  load(): Promise<KjMonaco> {
    if (!this.promise) {
      const shared = this.sharedMonaco();
      this.promise = shared
        ? Promise.resolve(shared)
        : (this.config.loader ? this.config.loader() : this.loadFromCdn());
      this.promise.then(
        (monaco) => this.markLoaded(monaco),
        () => { this.promise = null; },
      );
    }
    return this.promise;
  }

  /**
   * Monaco another loader on this page already initialised, or `null`.
   * `window.monaco` is the AMD loader's own output, so it is the truth for
   * "is the global already set up"; the marker attribute records that *we*
   * were the ones who put it there, which keeps an app that hand-loads Monaco
   * from silently capturing our config.
   */
  private sharedMonaco(): KjMonaco | null {
    const html = this.document?.documentElement;
    if (!html?.hasAttribute(KJ_MONACO_MARKER_ATTR)) return null;
    return (this.document?.defaultView as { monaco?: KjMonaco } | null)?.monaco ?? null;
  }

  private markLoaded(monaco: KjMonaco): void {
    const html = this.document?.documentElement;
    const view = this.document?.defaultView as { monaco?: KjMonaco } | null;
    if (!html || !view?.monaco || view.monaco !== monaco) return;
    html.setAttribute(KJ_MONACO_MARKER_ATTR, '');
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
