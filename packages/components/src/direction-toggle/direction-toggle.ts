import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { KjLocale } from '@kouji-ui/core';

/**
 * A visible, keyboard-native control that flips the application's logical text
 * direction between `ltr` and `rtl`.
 *
 * It is the concrete UI the locale provider pointed at: it reads
 * `KjLocale.isRtl()` and calls `KjLocale.setDirection(...)`. Paired with
 * `provideKjDocumentDirection()`, one click mirrors the whole page —
 * `<html dir>` flips and every logical-property layout follows.
 *
 * Renders a real `<button type="button">` so it is reachable by Tab and
 * operable with Enter / Space for free. `aria-pressed` reflects the RTL state
 * (pressed = RTL), and an accessible name is always present via
 * `[kjAriaLabel]`. Project custom content to replace the default `LTR` / `RTL`
 * text label.
 *
 * @example
 * ```html
 * <kj-direction-toggle />
 * <kj-direction-toggle kjAriaLabel="Toggle Arabic layout">اتجاه</kj-direction-toggle>
 * ```
 *
 * @doc-example Default
 *   The toggle wired to `KjLocale` — click to flip `<html dir>` and mirror the page.
 *   @doc-file direction-toggle.example.ts
 *
 * @doc-keyboard
 *   Enter — Toggles the direction (native button activation)
 *   Space — Toggles the direction (native button activation)
 *   Tab   — Moves focus to / from the toggle
 *
 * @doc-aria
 *   aria-pressed  — Reflects the RTL state (true when direction is rtl)
 *   aria-label    — Accessible name; defaults to "Toggle right-to-left layout"
 *   data-direction — Mirrors the resolved direction (ltr | rtl) for theme CSS
 *
 * @doc-touch
 *   The button reserves a 44×44px hit area (WCAG 2.5.5) regardless of label size.
 *
 * @doc-a11y
 *   A native `<button>` with `aria-pressed` — AT announces "toggle button,
 *   pressed/not pressed". Because mirroring is CSS-logical only, DOM and tab
 *   order are unchanged in both directions (WCAG 1.3.2).
 *
 * @doc-related locale
 *
 * @doc-css-var
 *   --kj-direction-toggle-bg           — Background at rest.
 *   --kj-direction-toggle-fg           — Text color.
 *   --kj-direction-toggle-border-color — Border color.
 *   --kj-direction-toggle-radius       — Corner radius.
 *   --kj-direction-toggle-padding-x    — Inline padding.
 *   --kj-direction-toggle-padding-y    — Block padding.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name direction-toggle
 * @doc-description Accessible LTR/RTL toggle button that drives KjLocale.direction and mirrors the page.
 * @doc-is-main
 */
@Component({
  selector: 'kj-direction-toggle',
  standalone: true,
  template: `
    <button
      type="button"
      class="kj-direction-toggle"
      [attr.aria-pressed]="isRtl()"
      [attr.aria-label]="kjAriaLabel()"
      [attr.data-direction]="direction()"
      (click)="toggle()"
    >
      <ng-content>{{ isRtl() ? 'RTL' : 'LTR' }}</ng-content>
    </button>
  `,
  styleUrl: './direction-toggle.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDirectionToggle {
  private readonly locale = inject(KjLocale);

  /** Resolved logical direction from the shared `KjLocale`. */
  readonly direction = this.locale.direction;

  /** `true` when the resolved direction is `rtl`. Drives `aria-pressed`. */
  readonly isRtl = this.locale.isRtl;

  /** Accessible name for the toggle button. */
  readonly kjAriaLabel = input<string>('Toggle right-to-left layout');

  /** Flip the direction: `ltr` ⇄ `rtl`. */
  toggle(): void {
    this.locale.setDirection(this.locale.isRtl() ? 'ltr' : 'rtl');
  }
}
