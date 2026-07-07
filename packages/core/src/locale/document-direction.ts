import {
  DOCUMENT,
  type EnvironmentProviders,
  PLATFORM_ID,
  effect,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjLocale } from './locale';

/**
 * Reflects {@link KjLocale}'s resolved logical direction onto the document's
 * `<html dir>` attribute, keeping the whole page (and every assistive
 * technology) in sync whenever the direction changes at runtime.
 *
 * This is the single writer of `<html dir>`; {@link KjDirectionality} stays the
 * *reader* that feeds `KjLocale`'s `'auto'` derivation. The write is idempotent
 * (skipped when the attribute already matches), so it never fights an app that
 * sets `dir` itself, and it is **SSR-safe** — on the server no DOM APIs are
 * touched and the attribute is left to the app's own template.
 *
 * Register once at the application scope. It is the piece the visible RTL
 * toggle (`KjDirectionToggle`) relies on to actually flip the layout: the toggle
 * calls `KjLocale.setDirection(...)`, this effect propagates it to `<html dir>`.
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [
 *     provideKjLocale({ direction: 'auto' }),
 *     provideKjDocumentDirection(),
 *   ],
 * });
 * ```
 * @doc
 * @doc-name locale
 * @doc-order 2
 */
export function provideKjDocumentDirection(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const platformId = inject(PLATFORM_ID);
      const doc = inject(DOCUMENT, { optional: true }) as Document | null;
      // SSR / no-DOM: leave `<html dir>` to the app's template.
      if (!isPlatformBrowser(platformId) || !doc) return;

      const locale = inject(KjLocale);
      effect(() => {
        const dir = locale.direction();
        const html = doc.documentElement;
        if (html.getAttribute('dir') !== dir) {
          html.setAttribute('dir', dir);
        }
      });
    }),
  ]);
}
