import { InjectionToken, type Signal } from '@angular/core';

/**
 * Lets a styled wrapper tell {@link KjOverlayTrigger} where its **real control**
 * is, when that control is not the element the trigger directive sits on.
 *
 * A styled wrapper such as `<kj-button>` renders its `<button>` inside its own
 * view and sets `display: contents` on the host, so the host paints nothing and
 * cannot take focus. A consumer writing
 *
 * ```html
 * <kj-button kjDropdownMenuTrigger>Theme</kj-button>
 * ```
 *
 * puts the trigger on the wrapper, so `aria-expanded` / `aria-haspopup` /
 * `aria-controls` land there while `role` and the accessible name stay on the
 * inner `<button>` — name, role and state split across two elements, which is
 * WCAG 4.1.2 Name, Role, Value.
 *
 * A wrapper that provides this token redirects all of that onto the element it
 * nominates. The token is **opt-in**: a trigger with no provider keeps writing
 * to its own host, byte for byte, which is what every other consumer does
 * today.
 *
 * `controlElement` is a signal because the control usually comes from a
 * `viewChild` and therefore resolves after the trigger is constructed; the
 * trigger re-binds when it appears.
 *
 * @doc-category Core/Overlay
 */
export interface KjTriggerControl {
  /** The element that should carry the trigger's ARIA and receive its events. */
  readonly controlElement: Signal<HTMLElement | null>;
}

/** DI token a styled wrapper provides to nominate its real control element. */
export const KJ_TRIGGER_CONTROL = new InjectionToken<KjTriggerControl>('KjTriggerControl');
