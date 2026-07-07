import { DOCUMENT } from '@angular/common';
import { Directive, inject, input } from '@angular/core';

/**
 * Headless "skip to content" link. Turns a native `<a>` into a
 * [WCAG 2.4.1 Bypass Blocks](https://www.w3.org/TR/WCAG21/#bypass-blocks)
 * mechanism: a fragment link that, when activated, moves **keyboard focus** to
 * the page's main-content landmark — not merely the scroll position.
 *
 * Owns the two behaviours a CSS-only skip link cannot deliver:
 *
 * 1. **Fragment `href`.** `[attr.href]` reflects `#<target-id>`, so the element
 *    is a real anchor (role=link, Enter activates) and carries the id in the
 *    SSR-prerendered HTML.
 * 2. **Deterministic focus move.** On `click` (which Enter also fires on an
 *    anchor) the directive `preventDefault()`s the navigation, looks the target
 *    up by id, makes it programmatically focusable via `tabindex="-1"` when it
 *    has no `tabindex`, and calls `focus()` (which also scrolls it into view).
 *
 *    `preventDefault()` is required, not optional: under a `<base href="/">`
 *    (the norm for Angular SPAs) a fragment-only reference like `#main-content`
 *    resolves against the **base URL**, not the current document — so the native
 *    click would navigate to `/#main-content` (the root route), swapping the
 *    page out and discarding focus. Moving focus programmatically is both the
 *    correct behaviour and immune to that gotcha.
 *
 * Styling (visually-hidden-until-focused) is a component-layer concern; see
 * `KjSkipLinkComponent` in `@kouji-ui/components`.
 *
 * @example
 * ```html
 * <a kjSkipLink>Skip to main content</a>
 * <main id="main-content" tabindex="-1">…</main>
 * ```
 * @example
 * ```html
 * <a kjSkipLink="page-body">Skip to content</a>
 * <section id="page-body" tabindex="-1">…</section>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name skip-link
 * @doc-description Turns a native anchor into a focus-moving "skip to content" bypass link.
 * @doc-is-main
 */
@Directive({
  selector: 'a[kjSkipLink]',
  standalone: true,
  host: {
    '[attr.href]': '"#" + kjSkipLink()',
    '(click)': 'onActivate($event)',
  },
})
export class KjSkipLink {
  private readonly document = inject(DOCUMENT);

  /**
   * `id` of the element to move focus to. Aliased to the selector attribute so
   * `<a kjSkipLink="page-body">` sets it directly. Defaults to `'main-content'`.
   *
   * The `transform` maps an empty value to the default: a bare `<a kjSkipLink>`
   * binds the attribute as `''` (the selector attribute is present but valueless),
   * which would otherwise shadow the initial value.
   */
  readonly kjSkipLink = input('main-content', {
    transform: (value: string | undefined) => value || 'main-content',
  });

  /**
   * Moves keyboard focus to the target landmark. Suppresses the anchor's native
   * navigation (see class docs — it is base-relative and would leave the page),
   * then adds `tabindex="-1"` when the target is not already focusable so
   * `focus()` succeeds while keeping it out of the sequential tab order.
   */
  protected onActivate(event: Event): void {
    event.preventDefault();
    const target = this.document.getElementById(this.kjSkipLink());
    if (!target) return;
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus();
  }
}
