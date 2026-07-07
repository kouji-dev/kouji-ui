import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { KjSkipLink } from '@kouji-ui/core';

/**
 * Themed "skip to content" link — the styled wrapper around the headless
 * `KjSkipLink` directive. Implements [WCAG 2.4.1 Bypass
 * Blocks](https://www.w3.org/TR/WCAG21/#bypass-blocks): a keyboard user's first
 * Tab reveals it, and Enter jumps focus past the navbar / sidebar to the main
 * content landmark.
 *
 * Place it as the **first focusable element** of the app shell and give the main
 * landmark a matching `id` (default `main-content`):
 *
 * ```html
 * <kj-skip-link />
 * <kj-navbar />
 * <main id="main-content" tabindex="-1"><router-outlet /></main>
 * ```
 *
 * The visible label is projected content and defaults to "Skip to main content".
 * The link is visually hidden (parked above the viewport) until focused, then
 * slides into view with a solid high-contrast background so it is legible over
 * any page chrome.
 *
 * @example
 * ```html
 * <kj-skip-link />
 * <kj-skip-link kjTarget="page-body">Skip to article</kj-skip-link>
 * ```
 *
 * @doc-example Default
 *   The shell-level skip link. Tab into the demo frame to reveal it, then
 *   activate it to move focus to the demo's main region.
 *   @doc-file skip-link.example.ts
 *
 * @doc-keyboard
 *   Tab   — Reveals the link when it receives focus (it is the first focusable element)
 *   Enter — Activates it; keyboard focus moves to the target landmark
 *
 * @doc-aria
 *   role=link   — Native `<a>` semantics; accessible name from the projected label
 *   href        — Reflects `#<target>` so it works before hydration and is bookmarkable
 *   tabindex=-1 — Applied to the target on activation so `focus()` lands and the
 *                 next Tab continues from the content, not the navigation
 *
 * @doc-a11y
 *   Satisfies WCAG 2.4.1 Bypass Blocks. Hidden-until-focused (not
 *   `display:none`, so it stays in the tab order), fully on-screen and
 *   high-contrast when focused, and moves real keyboard focus — not just scroll.
 *
 * @doc-css-var
 *   --kj-skip-link-bg      — Background when focused. Defaults to the theme's primary surface.
 *   --kj-skip-link-fg      — Text color when focused. Pairs with the background for AAA contrast.
 *   --kj-skip-link-radius  — Corner radius of the focused pill.
 *   --kj-skip-link-shadow  — Elevation shadow when focused.
 *   --kj-skip-link-offset  — Inset from the top-left corner when focused.
 *   --kj-skip-link-z       — Stacking order. Must sit above the navbar and overlays.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name skip-link
 * @doc-description Themed, focus-moving "skip to main content" link for the app shell (WCAG 2.4.1).
 * @doc-is-main
 */
@Component({
  selector: 'kj-skip-link',
  standalone: true,
  imports: [KjSkipLink],
  template: `
    <a kjSkipLink class="kj-skip-link" [kjSkipLink]="kjTarget()">
      <ng-content>Skip to main content</ng-content>
    </a>
  `,
  styleUrl: './skip-link.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSkipLinkComponent {
  /** `id` of the main-content landmark to move focus to. Defaults to `'main-content'`. */
  readonly kjTarget = input('main-content');
}
