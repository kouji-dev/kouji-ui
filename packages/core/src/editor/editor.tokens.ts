import { InjectionToken } from '@angular/core';
import type { KjMonacoLoaderFn } from './editor.types';

/**
 * Configures where the code editor gets Monaco from. Provide via
 * {@link provideMonaco}. Left unset, the library dynamically imports
 * `@monaco-editor/loader` and initialises Monaco from its default CDN — no
 * esbuild worker wiring, and Monaco stays out of the base bundle.
 */
export interface KjMonacoConfig {
  /**
   * Custom loader returning a ready Monaco namespace. Wins over `vsPath`.
   * Use this to point at a **self-hosted or bundled** Monaco instead of a CDN
   * (e.g. `() => import('monaco-editor')` once you've wired MonacoEnvironment
   * workers yourself). A library must never hard-lock consumers to a CDN.
   */
  loader?: KjMonacoLoaderFn;

  /**
   * Override the AMD `vs` base URL used by the default `@monaco-editor/loader`
   * path — e.g. `'/assets/monaco/vs'` to serve Monaco from your own origin.
   * Ignored when `loader` is set.
   */
  vsPath?: string;
}

/** DI token holding the resolved {@link KjMonacoConfig}. Defaults to `{}`. */
export const KJ_MONACO_CONFIG = new InjectionToken<KjMonacoConfig>('KJ_MONACO_CONFIG', {
  providedIn: 'root',
  factory: () => ({}),
});
