import { type Signal, computed, inject } from '@angular/core';
import { KjTranslateService } from '../i18n/translate.service';
import { KJ_BREADCRUMB_CONFIG } from './config';

/**
 * Every user-visible / assistive string the Breadcrumb family renders,
 * already resolved: a `provideKjBreadcrumb(…)` override when one is set,
 * otherwise the active {@link KjTranslateService} catalog entry.
 */
export interface KjBreadcrumbLabels {
  /** `aria-label` on the root `<nav>`. Catalog key `breadcrumb.nav`. */
  readonly nav: Signal<string>;
  /**
   * `aria-label` on the `<nav>` when items are truncated. Catalog keys
   * `breadcrumb.truncatedOne` / `breadcrumb.truncated` (`{hidden}`).
   */
  truncatedNav(visible: number, hidden: number): string;
  /**
   * `aria-label` on the ellipsis trigger in menu mode. Catalog keys
   * `breadcrumb.showHiddenOne` / `breadcrumb.showHidden` (`{hidden}`).
   */
  ellipsis(hidden: number): string;
}

/**
 * Resolves the Breadcrumb label set for the current injector.
 *
 * Precedence, per string: the matching `KJ_BREADCRUMB_CONFIG` field (set by
 * `provideKjBreadcrumb(…)`) → the {@link KjTranslateService} catalog → the
 * English source catalog. The catalog is the source of truth; the config
 * fields exist so an app can override **one** string without shipping a whole
 * locale.
 *
 * Both count-sensitive strings pick a singular or plural catalog key, which
 * is why they are functions rather than signals — a locale with more than two
 * plural forms overrides the config field instead.
 *
 * Must be called from an injection context.
 */
export function injectKjBreadcrumbLabels(): KjBreadcrumbLabels {
  const config = inject(KJ_BREADCRUMB_CONFIG);
  const i18n = inject(KjTranslateService);

  return {
    nav: computed(() => config.defaults.ariaLabel ?? i18n.translate('breadcrumb.nav')),
    truncatedNav: (visible, hidden) =>
      config.truncatedAriaLabel?.(visible, hidden) ??
      (hidden === 1
        ? i18n.translate('breadcrumb.truncatedOne')
        : i18n.translate('breadcrumb.truncated', { hidden })),
    ellipsis: (hidden) =>
      config.ellipsisLabel?.(hidden) ??
      (hidden === 1
        ? i18n.translate('breadcrumb.showHiddenOne')
        : i18n.translate('breadcrumb.showHidden', { hidden })),
  };
}
