import {
  DOCUMENT,
  DestroyRef,
  type EnvironmentProviders,
  PLATFORM_ID,
  effect,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjLocale } from './locale';
import { kjDevMode, kjDevWarn } from '../primitives/diagnostics/dev-mode';

/**
 * Reflects {@link KjLocale}'s resolved logical direction onto the document's
 * `<html dir>` attribute, keeping the whole page (and every assistive
 * technology) in sync whenever the direction changes at runtime.
 *
 * ## Single-writer contract
 *
 * `<html dir>` is a **document-global** slot, and this provider claims it.
 * Register it **once**, at the application scope, and let nothing else write
 * the attribute:
 *
 * - Not a second `provideKjDocumentDirection()` — two of them install two
 *   effects on two `KjLocale` instances (possible only if a route also
 *   provides `KjLocale`), and the last write wins non-deterministically.
 * - Not app code calling `document.documentElement.setAttribute('dir', …)`.
 *   Call `KjLocale.setDirection(…)` instead; this effect propagates it.
 * - Not a second independently bootstrapped Angular app on the same page.
 *   Running two kouji-ui apps in one document is an explicit **non-goal**:
 *   they cannot agree on one `<html dir>`, and neither can see the other's
 *   `KjLocale`. Mount the second app's root with its own `dir` attribute and
 *   give it a scoped {@link KjDirectionality} (`providers: [KjDirectionality]`
 *   on its root component) instead of this provider.
 *
 * In dev mode the provider watches the attribute and warns once if something
 * else changes it to a value it did not write — the symptom is otherwise a
 * layout that silently flips back on the next unrelated locale change.
 *
 * {@link KjDirectionality} stays the *reader* that feeds `KjLocale`'s `'auto'`
 * derivation. The write is idempotent (skipped when the attribute already
 * matches), and it is **SSR-safe** — on the server no DOM APIs are touched and
 * the attribute is left to the app's own template.
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
      const html = doc.documentElement;

      // Last value this writer put on the attribute. `null` until the first
      // write, so a `dir` the app's own template rendered is not mistaken for
      // a competing runtime writer.
      let ours: string | null = null;

      effect(() => {
        const dir = locale.direction();
        ours = dir;
        if (html.getAttribute('dir') !== dir) {
          html.setAttribute('dir', dir);
        }
      });

      if (kjDevMode() && typeof MutationObserver !== 'undefined') {
        let warned = false;
        const observer = new MutationObserver(() => {
          if (warned || ours === null) return;
          const current = html.getAttribute('dir');
          // `null` means the attribute was removed — teardown, or an app
          // handing the slot back. Only a competing *value* is a conflict.
          if (current === null || current === ours) return;
          warned = true;
          kjDevWarn(
            'kj-locale',
            `<html dir> was changed to "${current}" by something other than ` +
              `provideKjDocumentDirection() (which last wrote "${ours}"). ` +
              '`<html dir>` has a single writer: route direction changes through ' +
              'KjLocale.setDirection(…), and scope a sub-tree with a component-level ' +
              'KjDirectionality instead of a second document writer.',
          );
        });
        observer.observe(html, { attributes: true, attributeFilter: ['dir'] });
        inject(DestroyRef).onDestroy(() => observer.disconnect());
      }
    }),
  ]);
}
