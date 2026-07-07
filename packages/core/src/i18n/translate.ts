import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import type {
  KjTranslationKey,
  KjTranslationParams,
} from './catalogs/en';
import { KjTranslateService } from './translate.service';

/**
 * Writes a localized string into its host — either the element's text content
 * or a named attribute (for `aria-label`, `title`, …). Fully reactive: the host
 * re-renders when the active locale (`KjLocale.locale()`) or the interpolation
 * params change, with no change-detection cost between changes (signals +
 * `effect`, no pipe).
 *
 * The key is compile-checked against the {@link KjTranslationKey} union, so a
 * typo fails `tsc`. Values may contain `{name}` placeholders filled from
 * `kjTranslateParams`.
 *
 * @example
 * ```html
 * <!-- visible text -->
 * <span [kjTranslate]="'pagination.pageOf'"
 *       [kjTranslateParams]="{ page: page(), total: total() }"></span>
 *
 * <!-- localized aria-label on an icon-only button -->
 * <button [kjTranslate]="'toast.close'" kjTranslateAttr="aria-label">×</button>
 * ```
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file i18n.basic.example.ts
 * @doc-name i18n
 * @doc-category Core/Accessibility
 */
@Directive({
  selector: '[kjTranslate]',
  standalone: true,
})
export class KjTranslate {
  private readonly svc = inject(KjTranslateService);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Translation key to render. Compile-checked against the catalog. */
  readonly kjTranslate = input.required<KjTranslationKey>();

  /** Values for `{name}` placeholders in the resolved string. */
  readonly kjTranslateParams = input<KjTranslationParams>();

  /**
   * Target attribute to write (e.g. `'aria-label'`, `'title'`). When unset, the
   * translation is written to the host's text content.
   */
  readonly kjTranslateAttr = input<string>();

  constructor() {
    effect(() => {
      const value = this.svc.translate(
        this.kjTranslate(),
        this.kjTranslateParams(),
      );
      const attr = this.kjTranslateAttr();
      if (attr) {
        this.el.nativeElement.setAttribute(attr, value);
      } else {
        this.el.nativeElement.textContent = value;
      }
    });
  }
}
