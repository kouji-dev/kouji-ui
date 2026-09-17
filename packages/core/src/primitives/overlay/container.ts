import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';

/** Marks the one overlay root in a document, so any copy of the library finds it. */
const KJ_OVERLAY_CONTAINER_ATTR = 'data-kj-overlay-container';

/**
 * Lazy, page-wide root for every overlay (dialogs, drawers, popovers,
 * tooltips, dropdowns, toasts). The first call appends a single
 * `<div class="kj-overlay-container" data-kj-overlay-container>` to
 * `document.body`; every later call finds that element again **by its data
 * attribute**, so the container is owned by the document rather than by a
 * module variable. SSR-safe (returns `null` when there is no document).
 *
 * Per-overlay code MUST go through {@link getOverlayContainer} +
 * {@link createOverlayWrapper} instead of reaching for `document.body`
 * directly — a single positioned root owns z-stacking, pointer-events
 * isolation, and cleanup ordering across the whole overlay system. Apps that
 * need the service-launched family rooted elsewhere (a fullscreen element, a
 * host-owned node) provide {@link KJ_OVERLAY_CONTAINER}.
 *
 * The root is found **in the DOM**, not in a module variable: a module
 * variable belongs to one copy of the bundle, while the element it points at
 * belongs to the page. Discovery also survives a root that app code removed,
 * and keeps two Angular roots sharing one container instead of appending a
 * second one. `doc` defaults to the ambient document so the exported
 * zero-argument form keeps working; every DI caller goes through
 * {@link KJ_OVERLAY_CONTAINER}, which passes the injected `DOCUMENT` and
 * returns `null` off-browser.
 *
 * Stacking inside the root is owned by `KjOverlayStack`: each wrapper gets
 * an inline `z-index` (base `1000`, one higher per nested level) when its
 * overlay opens, so a later overlay always paints above the ones already
 * open. The root itself sits at `--kj-overlay-z-base` (default `1000`).
 *
 * @doc-category Core/Overlay
 * @doc
 * @doc-name overlay-container
 * @doc-is-main
 * @doc-description Lazily creates the shared body-level root element where every overlay mounts.
 */
export function getOverlayContainer(doc: Document | null = ambientDocument()): HTMLElement | null {
  const body = doc?.body;
  if (!body) return null;
  const existing = body.querySelector<HTMLElement>(`:scope > [${KJ_OVERLAY_CONTAINER_ATTR}]`);
  if (existing) return existing;
  const root = doc.createElement('div');
  root.className = 'kj-overlay-container';
  root.setAttribute(KJ_OVERLAY_CONTAINER_ATTR, '');
  body.appendChild(root);
  return root;
}

/**
 * The ambient document, or `null` where there is none (server, worker).
 * Read through `globalThis` rather than the bare `document` binding so the
 * SSR lint rule stays meaningful for every other call site in the library.
 */
function ambientDocument(): Document | null {
  return (globalThis as { document?: Document }).document ?? null;
}

/**
 * @internal Best-effort `Document` for the free-function strategy factories.
 *
 * They are built both inside an injection context (a `useFactory` provider, a
 * directive field) and outside one (`KjDialogService.open()`), so the injected
 * `DOCUMENT` — the right answer on the server — has to be probed for rather
 * than assumed. Falls back to the ambient document, and finally to `null`.
 */
export function resolveOverlayDocument(): Document | null {
  try {
    return inject(DOCUMENT, { optional: true }) ?? ambientDocument();
  } catch {
    return ambientDocument();
  }
}

/**
 * Resolves the root element that hosts every overlay wrapper.
 * `KjOverlayBuilder` appends the wrapper of each service-launched overlay
 * (dialog, drawer, sheet, toast) into it and `KjOverlayStack` reads
 * `--kj-overlay-z-base` from it. Defaults to {@link getOverlayContainer};
 * provide it to root those overlays in a fullscreen element or a node the
 * app owns. Declarative overlays keep their mount strategy (`bodyPortal()`,
 * `inContainer(target)`). Returns `null` on the server.
 */
export const KJ_OVERLAY_CONTAINER = new InjectionToken<() => HTMLElement | null>('KJ_OVERLAY_CONTAINER', {
  providedIn: 'root',
  factory: () => {
    const doc = inject(DOCUMENT, { optional: true });
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    return () => (isBrowser ? getOverlayContainer(doc) : null);
  },
});

/**
 * Creates a per-overlay wrapper inside `root` (the singleton container by
 * default). The wrapper owns its overlay's backdrop + panel as siblings so
 * DOM teardown is atomic and stacking among siblings follows insertion order.
 */
export function createOverlayWrapper(root: HTMLElement | null = getOverlayContainer()): HTMLElement | null {
  const doc = root?.ownerDocument;
  if (!root || !doc) return null;
  const wrapper = doc.createElement('div');
  wrapper.className = 'kj-overlay-wrapper';
  root.appendChild(wrapper);
  return wrapper;
}
