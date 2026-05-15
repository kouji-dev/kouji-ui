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
 *   A single keyboard key rendered inline with prose — anchors the chrome.
 *   @doc-file kbd.example.ts
 * @doc-example Usage
 *   Common kbd shapes — sizes, glyph keys with aria-labels, and a combo.
 *   @doc-file kbd.usage.example.ts
 * @doc-example Combo
 *   Sibling `<kj-kbd>` elements joined by a literal "+" glyph.
 *   @doc-file kbd.combo.example.ts
 * @doc-example Sizes
 *   `xs` / `sm` / `md` / `lg` — the only library component that goes below `sm`.
 *   @doc-file kbd.sizes.example.ts
 * @doc-example In a tooltip
 *   Tooltip body wraps a shortcut hint with `<kj-kbd>`.
 *   @doc-file kbd.in-tooltip.example.ts
 *
 * @doc-keyboard
 *   None — kbd is purely visual. The element is non-interactive and does not participate in tab order.
 *
 * @doc-aria
 *   aria-label  — When [kjKbdAriaLabel] is set, forwarded to the inner <kbd> for glyph keys (⌘, ⌥, ⇧, ↵)
 *   data-size   — Mirrors [kjSize] (xs/sm/md/lg) for theme CSS
 *
 * @doc-touch
 *   Kbd is a label, not a target — no 44 px requirement. When embedded in
 *   an actionable control (button / link), the parent owns the touch
 *   surface.
 *
 * @doc-a11y
 *   Uses the semantic `<kbd>` element underneath so AT reads the text content
 *   directly. Only set `[kjKbdAriaLabel]` when the visible glyph is unicode
 *   the screen reader cannot pronounce — for `Enter`, `Ctrl`, `K`, the
 *   default text content is the right read.
 *
 * @doc-related tooltip,command-palette,badge
 *
 * @doc-css-var
 *   --kj-kbd-bg           — Background fill of the key cap. Defaults to --kj-bg-surface.
 *   --kj-kbd-fg           — Foreground (glyph) color.
 *   --kj-kbd-border-color — Border color. Bumped at xs for contrast.
 *   --kj-kbd-border-width — Border thickness. Inherits --kj-border.
 *   --kj-kbd-radius       — Corner radius. Inherits --kj-radius-selector.
 *   --kj-kbd-padding-x    — Horizontal padding inside the cap. Sizes override.
 *   --kj-kbd-padding-y    — Vertical padding inside the cap. Sizes override.
 *   --kj-kbd-font         — Font family. Defaults to --kj-font-mono.
 *   --kj-kbd-font-size    — Font size. Sizes (xs/sm/md/lg) override.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name kbd
 * @doc-description Themed keyboard key label with size variants and an aria-label override for symbol glyphs.
 * @doc-is-main
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
