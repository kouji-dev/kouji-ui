import { Directive, computed, input } from '@angular/core';
import { getIconMode } from './icon.mode';
import { injectKjIconResolver } from './icon.resolver';
import type { KjIconColor, KjIconSize } from './icon.types';

/**
 * Renders an icon on its host element via CSS custom properties. Owns icon
 * accessibility (decorative by default; meaningful when `kjIconLabel` is set).
 *
 * @example
 * ```html
 * <span [kjIcon]="'settings'"></span>
 * <span [kjIcon]="'alert-triangle'" [kjIconLabel]="'Warning'"></span>
 * <span [kjIcon]="'check'" [kjIconColor]="'success'" [kjIconSize]="'lg'"></span>
 * ```
 *
 * @category Core/Icon
 */
@Directive({
  selector: 'span[kjIcon], i[kjIcon]',
  standalone: true,
  host: {
    class: 'kj-icon',
    '[style.--kj-icon]': 'iconValue()',
    '[style.color]': 'colorVar()',
    '[style.font-size]': 'sizeVar()',
    '[attr.data-kj-icon-mode]': 'mode()',
    '[attr.aria-hidden]': 'ariaHidden()',
    '[attr.role]': 'roleAttr()',
    '[attr.aria-label]': 'ariaLabelAttr()',
  },
})
export class KjIconDirective {
  private readonly resolve = injectKjIconResolver();

  /** Icon name. Names starting with `@font.` use font mode. */
  readonly kjIcon = input.required<string>();

  /**
   * Accessible name. When set, the icon is treated as meaningful:
   * `role="img"`, `aria-label` set, `aria-hidden` removed. When unset
   * (the default), the icon is decorative and `aria-hidden="true"`.
   */
  readonly kjIconLabel = input<string | null>(null);

  /** Semantic color token. Default `null` means inherit (CSS `currentColor`). */
  readonly kjIconColor = input<KjIconColor | null>(null);

  /** Size token. Default `null` means inherit from surrounding text. */
  readonly kjIconSize = input<KjIconSize | null>(null);

  protected readonly mode = computed(() => getIconMode(this.kjIcon()));
  protected readonly iconValue = computed(() => this.resolve(this.kjIcon()));

  protected readonly ariaHidden = computed(() =>
    this.kjIconLabel() ? null : 'true',
  );
  protected readonly roleAttr = computed(() =>
    this.kjIconLabel() ? 'img' : null,
  );
  protected readonly ariaLabelAttr = computed(() => this.kjIconLabel());

  protected readonly colorVar = computed(() => {
    const c = this.kjIconColor();
    return c && c !== 'inherit' ? `var(--kj-color-icon-${c})` : null;
  });
  protected readonly sizeVar = computed(() => {
    const s = this.kjIconSize();
    return s ? `var(--kj-icon-size-${s})` : null;
  });
}
