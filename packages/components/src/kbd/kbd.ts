import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { KJ_SIZE_PRESET, KJ_KBD_SIZE_PRESET, KjKbd } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjKbd` directive.
 *
 * Renders an inner `<kbd kjKbd>` so the native `<kbd>` semantic is preserved
 * (HTML AAM maps `<kbd>` to `role="generic"`; AT typically announces the
 * element's text content directly, with a "key" prefix in verbose modes —
 * which is exactly the right read for a keyboard-shortcut visual). The wrapper
 * itself is layout-invisible (`display: contents`) so a kbd inline-flowed in
 * prose does not introduce an extra block-level box that would break baseline
 * alignment with surrounding text.
 *
 * **Composition note.** Per the analysis, the directive is composed by
 * applying `kjKbd` to the inner `<kbd>` rather than via the wrapper's own
 * `hostDirectives`. The directive must run on the visible kbd element so the
 * `data-size` reflection (and any future host bindings) land where theme CSS
 * expects them, not on the `display: contents` outer `<kj-kbd>` custom
 * element.
 *
 * **No variant.** Kbd is tonally neutral — there is no "destructive kbd" or
 * "primary kbd". A future design language wanting e.g. a "deprecated shortcut"
 * tone can fold in via a CSS-only `[data-deprecated="true"]` attribute without
 * API churn.
 *
 * **Size preset.** The wrapper provides `KJ_SIZE_PRESET` with the four-value
 * `xs / sm / md / lg` scale (default `md`). Inline-with-prose kbds genuinely
 * want sub-`sm`; this is the one component in the library that legitimately
 * extends below the standard `[sm, md, lg]` baseline.
 *
 * @example
 * ```html
 * <kj-kbd>Enter</kj-kbd>
 * <kj-kbd kjSize="xs">⌘</kj-kbd>
 * <kj-kbd kjKbdAriaLabel="Command">⌘</kj-kbd>
 * ```
 * @doc-example Default
 *   @doc-file kbd.example.ts
 * @doc-example Combo
 *   @doc-file kbd.combo.example.ts
 * @doc-example Sizes
 *   @doc-file kbd.sizes.example.ts
 * @doc-example In a tooltip
 *   @doc-file kbd.in-tooltip.example.ts
 * @category Library/Data display
 */
@Component({
  selector: 'kj-kbd',
  standalone: true,
  imports: [KjKbd],
  template: `<kbd
    kjKbd
    class="kj-kbd"
    [kjSize]="kjSize()"
    [attr.aria-label]="kjKbdAriaLabel() ?? null"
  ><ng-content /></kbd>`,
  styleUrl: './kbd.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: KJ_SIZE_PRESET, useValue: KJ_KBD_SIZE_PRESET }],
})
export class KjKbdComponent {
  /** Size preset. Validated against `KJ_KBD_SIZE_PRESET` (`xs` / `sm` / `md` / `lg`). */
  readonly kjSize = input<'xs' | 'sm' | 'md' | 'lg'>('md');

  /**
   * Optional override for the host's accessible name. Use only when the
   * visible text is a unicode glyph (`⌘`, `⌥`, `↵`, `⇧`, `⌫`, `⎋`, `⇥`, `⏎`)
   * that AT does not pronounce sensibly. Forwards to `[attr.aria-label]` on
   * the inner `<kbd>`. The default — the host's text content — is the right
   * read for plain-text kbds (`Enter`, `Ctrl`, `K`).
   *
   * The directive does not declare a duplicate input for this; the wrapper is
   * allowed to set host attributes the directive does not own, the same way a
   * consumer using `[kjKbd]` directly is.
   */
  readonly kjKbdAriaLabel = input<string | undefined>(undefined);
}
