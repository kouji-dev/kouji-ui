import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { KJ_MONACO_CONFIG, type KjMonacoConfig } from './editor.tokens';

/**
 * Configure the Monaco source for `KjEditor` / `<kj-editor>`. Call once at the
 * app (or route) level. With no arguments the editor loads Monaco from the
 * default CDN via `@monaco-editor/loader`.
 *
 * @example
 * // Default CDN loader (nothing to install beyond the peer deps):
 * provideMonaco()
 *
 * @example
 * // Self-hosted Monaco assets:
 * provideMonaco({ vsPath: '/assets/monaco/vs' })
 *
 * @example
 * // Fully custom / bundled Monaco (you own the worker setup):
 * provideMonaco({ loader: () => import('monaco-editor') })
 *
 * @doc
 * @doc-name editor
 * @doc-order 1
 */
export function provideMonaco(config: KjMonacoConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: KJ_MONACO_CONFIG, useValue: config }]);
}
