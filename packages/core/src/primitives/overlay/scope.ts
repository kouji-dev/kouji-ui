/**
 * Attributes that scope the design tokens an element resolves against.
 * `data-theme` picks the theme, `data-density` the density preset and `dir`
 * the writing direction — all three cascade from an ancestor, so an overlay
 * portalled to `<body>` would otherwise resolve them against `<html>`.
 */
export const KJ_OVERLAY_SCOPE_ATTRS = ['data-theme', 'data-density', 'dir'] as const;

/**
 * Copies the token scope of `from` onto `to`: for each of
 * {@link KJ_OVERLAY_SCOPE_ATTRS}, the value declared on `from` or its closest
 * ancestor is written to `to`, and the attribute is removed from `to` when no
 * ancestor declares it. Called for every overlay wrapper — declarative
 * (`bodyPortal()`, from the trigger) and service-launched (`KjOverlayBuilder`,
 * from the focused element or the app root) — so a dialog opened inside a
 * subtree themed `data-theme="custom-draft"`, a dense panel or an RTL app
 * renders like the content it belongs to. A null `from` clears the scope.
 *
 * @doc-category Core/Overlay
 */
export function inheritOverlayScope(from: Element | null, to: HTMLElement): void {
  for (const attr of KJ_OVERLAY_SCOPE_ATTRS) {
    const value = from?.closest?.(`[${attr}]`)?.getAttribute(attr) ?? null;
    if (value) to.setAttribute(attr, value);
    else to.removeAttribute(attr);
  }
}
