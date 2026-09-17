import {
  Directive,
  Signal,
  computed,
  inject,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KJ_BREADCRUMB } from './breadcrumb.context';
import { KJ_BREADCRUMB_CONFIG } from './config';
import { injectKjBreadcrumbLabels } from './labels';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Overflow indicator rendered in place of truncated middle crumbs.
 *
 * - In `'truncate'` overflow mode: behaves like a static glyph,
 *   `aria-hidden="true"`.
 * - In `'menu'` overflow mode: an interactive cell with
 *   `aria-haspopup="true"`. Consumers wire a `KjDropdownMenu` to the host
 *   to expose the hidden crumbs as menu items.
 *
 * Visible only when there are hidden crumbs (`ctx.hiddenIndices().length > 0`).
 * The host wrapper component conditionally renders the directive based on
 * this signal.
 *
 * @example
 * ```html
 * <li kjBreadcrumbItem><span kjBreadcrumbEllipsis>…</span></li>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Directive({
  selector: '[kjBreadcrumbEllipsis]',
  standalone: true,
  hostDirectives: [KjFocusRing, { directive: KjDisabled, inputs: ['kjDisabled'] }],
  host: {
    '[attr.aria-hidden]': 'isAriaHidden() ? "true" : null',
    '[attr.aria-label]': 'computedAriaLabel()',
    '[attr.aria-haspopup]': 'isMenu() ? "true" : null',
    '[attr.data-overflow]': 'ctx.overflow()',
    '[attr.data-hidden-count]': 'hiddenCount()',
  },
})
export class KjBreadcrumbEllipsis {
  /** @internal */
  readonly ctx = injectParent(KJ_BREADCRUMB, { child: 'KjBreadcrumbEllipsis', parent: '[kjBreadcrumb]' });
  private readonly config = inject(KJ_BREADCRUMB_CONFIG);

  /**
   * Resolved label set: a `provideKjBreadcrumb(…)` override when one is set,
   * otherwise the active i18n catalog. Locale-reactive.
   */
  private readonly labels = injectKjBreadcrumbLabels();

  /**
   * Disabled posture, owned by the composed {@link KjDisabled} primitive —
   * one owner for the `kjDisabled` public name, one `booleanAttribute`
   * transform, and one writer of `aria-disabled` / `data-disabled`. Read it
   * here (`ellipsis.kjDisabled()`) or bind it as `kjDisabled` on the host.
   * Default `false`.
   */
  readonly kjDisabled: Signal<boolean> = inject(KjDisabled).disabled;

  /** Number of hidden crumbs the ellipsis represents. */
  readonly hiddenCount = computed(() => this.ctx.hiddenIndices().length);

  /** Whether the ellipsis is in menu (interactive) mode. */
  readonly isMenu = computed(() => this.ctx.overflow() === 'menu');

  /** Whether the ellipsis is purely decorative (truncate mode). */
  readonly isAriaHidden = computed(() => !this.isMenu());

  /** `aria-label` value — null in truncate mode (the cell is decorative). */
  readonly computedAriaLabel = computed(() =>
    this.isMenu() ? this.labels.ellipsis(this.hiddenCount()) : null,
  );
}
