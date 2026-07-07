import { Injectable, inject } from '@angular/core';
import { KJ_MONACO_CONFIG } from './editor.tokens';
import type { KjMonaco } from './editor.types';

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
  private promise: Promise<KjMonaco> | null = null;

  /** Resolve Monaco (cached after the first call). */
  load(): Promise<KjMonaco> {
    if (!this.promise) {
      this.promise = this.config.loader ? this.config.loader() : this.loadFromCdn();
    }
    return this.promise;
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
