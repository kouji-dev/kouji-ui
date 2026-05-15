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
 * @doc-example Gallery
 *   Browseable Lucide icon grid with a substring filter. Click any tile to
 *   copy its `<i kjIcon="…">` snippet.
 *   @doc-file ../../../components/src/icon/icon.gallery.example.ts
 * @doc-example Usage
 *   Common icon shapes — decorative inline, meaningful with a label, sized
 *   variants, and semantic color tokens.
 *   @doc-file ../../../components/src/icon/icon.usage.example.ts
 *
 * @doc-keyboard
 *   None — the icon directive is non-interactive. Place inside a focusable parent (button/link) for activation semantics.
 *
 * @doc-aria
 *   aria-hidden          — Set to "true" by default (decorative). Removed when [kjIconLabel] is provided
 *   role="img"           — Set when [kjIconLabel] is provided (meaningful icon)
 *   aria-label           — Bound to [kjIconLabel] when provided
 *   data-kj-icon-mode    — Mirrors the resolved mode ("svg" | "font") for theme CSS
 *
 * @doc-css-var
 *   --kj-icon            — CSS-ready resolved icon value (a url() for svg mode or a quoted glyph for font mode). Set by the directive.
 *   --kj-icon-font       — Font family used in font mode. Consumers set this on a parent when shipping icon fonts.
 *   --kj-color-icon-*    — Foreground color tokens for [kjIconColor] (muted/primary/success/warning/danger/info).
 *   --kj-icon-size-*     — Em-relative size tokens for [kjIconSize] (xs/sm/md/lg/xl).
 *
 * @doc-touch
 *   The icon is layout-only and does not require a 44×44 target on its own.
 *   When the icon is the sole label of an interactive control, the parent
 *   (`kj-button kjSize="icon"`, `<a>`, etc.) must meet WCAG 2.5.5.
 *
 * @doc-a11y
 *   Decorative by default — `aria-hidden="true"` keeps the icon silent for
 *   AT. Pass `[kjIconLabel]` only when the icon conveys meaning that is not
 *   duplicated in adjacent text; this swaps in `role="img"` and the label.
 *   Color tokens map to `--kj-color-icon-{token}` so theme palettes can
 *   retarget per-mode without API churn.
 *
 * @doc-related button,link,badge
 *
 * @doc-category Core/Icon
 * @doc
 * @doc-name icon
 * @doc-description Renders an accessible icon on its host element by name with color and size tokens.
 * @doc-is-main
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
