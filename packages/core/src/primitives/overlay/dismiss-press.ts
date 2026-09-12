/**
 * Tracks whether the press that produced a `click` actually BEGAN on the
 * element that is about to dismiss an overlay.
 *
 * A backdrop covers the viewport, so the browser hands it clicks it never
 * saw the start of. When the element a press began on is removed from the
 * document before the pointer is released — which is exactly what happens
 * when a `<kj-select>` nested in a `<kj-command-palette>` commits a NEW
 * value, re-rendering its option list — the engine retargets the `click`
 * to what is under the pointer by then. The option is gone and its whole
 * portalled wrapper with it, so the palette's backdrop is what is left
 * underneath, and its dismiss handler ran on a click the user aimed at an
 * option. Committing the SAME value re-renders nothing, the option stays
 * attached, the click lands on it, and the palette survives — which is why
 * the bug looked like it depended on the value.
 *
 * The rule this encodes: a dismiss-on-click surface reacts only to a press
 * it owns from the start. Arm on `pointerdown` (which is dispatched at the
 * real origin, before any re-render can move it), and dismiss on `click`
 * only if that arming happened.
 *
 * Clicks with `detail === 0` are let through: they are not pointer-driven
 * at all (`element.click()`, keyboard activation, some assistive tooling),
 * so no `pointerdown` ever arrives to match them against.
 *
 * @doc-category Core/Overlay
 */
export class KjDismissPress {
  private armed = false;

  /**
   * Bind to `pointerdown` (and `mousedown`, for engines without pointer
   * events) on the dismissing element. Firing at all is the signal: the
   * listener sits on that element, so the press started there.
   */
  arm(): void {
    this.armed = true;
  }

  /**
   * Bind to `click` on the dismissing element. `true` when the click
   * belongs to a press that began here and should dismiss; `false` for a
   * click retargeted onto this element after its original target left the
   * document. Consumes the arming either way, so a stray click can never
   * ride on the previous press.
   */
  owns(event: MouseEvent): boolean {
    const armed = this.armed;
    this.armed = false;
    return event.detail === 0 || armed;
  }

  /** Drop any pending arming — call when the overlay closes or is destroyed. */
  reset(): void {
    this.armed = false;
  }
}
