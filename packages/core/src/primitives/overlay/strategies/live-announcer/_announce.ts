/** `aria-live` politeness of the announcement region. */
export type KjLivePoliteness = 'polite' | 'assertive';

const SR_ONLY_STYLE = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/** Marks a shared announcement region so any caller can find it again. */
const REGION_ATTR = 'data-kj-live-region';

/**
 * Finds this document's region for `politeness`, creating it once.
 *
 * The lookup is a DOM query, not a module-level map: the region is appended to
 * `<body>` and never removed, so a module map outlives nothing it owns while
 * multiplying the region with every extra copy of the library (and leaking one
 * per app unmount / remount cycle). Querying makes the region genuinely
 * page-wide and self-healing if app code removes it.
 */
const ensureRegion = (doc: Document, politeness: KjLivePoliteness): HTMLElement | null => {
  const body = doc.body;
  if (!body) return null;
  const existing = body.querySelector<HTMLElement>(`[${REGION_ATTR}="${politeness}"]`);
  if (existing) return existing;
  const region = doc.createElement('div');
  region.setAttribute(REGION_ATTR, politeness);
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.style.cssText = SR_ONLY_STYLE;
  body.appendChild(region);
  return region;
};

/**
 * Announces `message` into the document's shared live region.
 *
 * Clears the region first so consecutive announcements sharing a prefix are
 * still detected as a change, then writes on the next frame.
 */
export const announce = (
  doc: Document | null,
  message: string,
  politeness: KjLivePoliteness = 'polite',
): void => {
  if (!doc) return;
  const region = ensureRegion(doc, politeness);
  if (!region) return;
  region.textContent = '';
  const raf = doc.defaultView?.requestAnimationFrame;
  if (raf) raf.call(doc.defaultView, () => { region.textContent = message; });
  else region.textContent = message;
};
