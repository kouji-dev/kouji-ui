import {
  Directive,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KJ_BREADCRUMB } from './breadcrumb.context';
import { KJ_BREADCRUMB_CONFIG } from './config';

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
 * @category Core/Navigation
 */
@Directive({
  selector: '[kjBreadcrumbEllipsis]',
  standalone: true,
  hostDirectives: [KjFocusRing],
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
  readonly ctx = inject(KJ_BREADCRUMB);
  private readonly config = inject(KJ_BREADCRUMB_CONFIG);

  /**
   * Mirrors a disabled bundle (currently advisory — the ellipsis menu
   * trigger composes `KjDropdownMenu` separately when wired by the
   * consumer).
   */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Number of hidden crumbs the ellipsis represents. */
  readonly hiddenCount = computed(() => this.ctx.hiddenIndices().length);

  /** Whether the ellipsis is in menu (interactive) mode. */
  readonly isMenu = computed(() => this.ctx.overflow() === 'menu');

  /** Whether the ellipsis is purely decorative (truncate mode). */
  readonly isAriaHidden = computed(() => !this.isMenu());

  /** `aria-label` value — null in truncate mode (the cell is decorative). */
  readonly computedAriaLabel = computed(() =>
    this.isMenu() ? this.config.ellipsisLabel(this.hiddenCount()) : null,
  );
}
