/**
 * Reference-counted `inert` for the page behind a modal overlay.
 *
 * Two modals stacked on the same app root each retain it once; the root
 * becomes interactive again only when the last one releases. An element
 * the app itself marked `inert` is never touched.
 */
const retained = new WeakMap<Element, number>();

/** Elements under `<body>` that never carry page content and must not be made inert. */
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT', 'META']);

/** Marks `el` inert, or bumps its count when a modal already did. */
export function retainInert(el: Element): void {
  const count = retained.get(el) ?? 0;
  if (count === 0) {
    if (el.hasAttribute('inert')) return;
    el.setAttribute('inert', '');
  }
  retained.set(el, count + 1);
}

/** Reverses one {@link retainInert}; removes `inert` once no modal holds it. */
export function releaseInert(el: Element): void {
  const count = retained.get(el) ?? 0;
  if (count === 0) return;
  if (count === 1) {
    retained.delete(el);
    el.removeAttribute('inert');
    return;
  }
  retained.set(el, count - 1);
}

/**
 * Makes everything behind a modal `panel` inert: every child of `<body>`
 * outside the overlay container (except script/style nodes and live
 * regions), plus every overlay wrapper opened before the panel's own — a
 * dialog stacked on a dialog freezes the one below. The container itself is
 * never inerted, even for a panel mounted outside it, so overlays the modal
 * opens afterwards (dropdowns, pickers) stay usable. A body child that
 * contains the panel (an inline-mounted modal) is left alone, because
 * inerting it would inert the panel itself.
 *
 * @returns A release function; safe to call more than once.
 */
export function inertSiblingsOf(panel: HTMLElement): () => void {
  // The panel is the only handle this function has on a document, and it is
  // the right one: inerting is scoped to the tree the panel actually lives in.
  const body = panel.ownerDocument?.body;
  if (!body) return () => {};
  // The overlay root, whether or not the panel lives in it. An inline-mounted
  // (`inPlace`) modal sits outside it, yet the overlays it opens — a select,
  // combobox or date picker dropdown — mount into it after the modal opened:
  // inerting the root itself would freeze them. Its wrappers open at this
  // point are frozen one by one below instead; later ones stay live.
  const container =
    panel.closest('.kj-overlay-container') ??
    Array.from(body.children).find(
      (c) =>
        c.hasAttribute('data-kj-overlay-container') || c.classList.contains('kj-overlay-container'),
    ) ??
    null;
  const targets: Element[] = [];

  for (const child of Array.from(body.children)) {
    if (child === container) continue;
    if (child.contains(panel)) continue;
    if (SKIPPED_TAGS.has(child.tagName)) continue;
    if (child.hasAttribute('aria-live') || child.hasAttribute('data-kj-live-region')) continue;
    targets.push(child);
  }

  if (container) {
    const own = Array.from(container.children).find((w) => w.contains(panel));
    for (const wrapper of Array.from(container.children)) {
      if (wrapper === own) continue;
      const below = !own || !!(wrapper.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (below) targets.push(wrapper);
    }
  }

  for (const el of targets) retainInert(el);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    for (const el of targets) releaseInert(el);
  };
}
