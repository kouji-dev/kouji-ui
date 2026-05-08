/**
 * Module-level lazy singleton root for every overlay (dialogs, drawers,
 * popovers, tooltips, dropdowns, toasts). The first call appends a single
 * `<div class="kj-overlay-container">` to `document.body`; subsequent calls
 * return the same element. SSR-safe (returns `null` when `document` is
 * unavailable).
 *
 * Per-overlay code MUST go through {@link getOverlayContainer} +
 * {@link createOverlayWrapper} instead of reaching for `document.body`
 * directly — a single positioned root owns z-stacking, pointer-events
 * isolation, and cleanup ordering across the whole overlay system.
 *
 * @category Core/Overlay
 * @doc
 * @doc-name overlay-container
 * @doc-is-main
 * @doc-description Lazily creates the shared body-level root element where every overlay mounts.
 */
let _root: HTMLElement | null = null;

export function getOverlayContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (_root && _root.isConnected) return _root;
  _root = document.createElement('div');
  _root.className = 'kj-overlay-container';
  document.body.appendChild(_root);
  return _root;
}

/**
 * Creates a per-overlay wrapper inside the singleton container. The wrapper
 * owns its overlay's backdrop + panel as siblings so DOM teardown is atomic
 * and stacking among siblings follows insertion order.
 */
export function createOverlayWrapper(): HTMLElement | null {
  const root = getOverlayContainer();
  if (!root || typeof document === 'undefined') return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'kj-overlay-wrapper';
  root.appendChild(wrapper);
  return wrapper;
}
