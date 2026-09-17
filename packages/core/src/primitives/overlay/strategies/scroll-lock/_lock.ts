/**
 * Inline styles captured before the lock applied, keyed by CSS property name.
 * Restored verbatim when the last holder releases; an empty string removes
 * the property, which is what `el.style.prop = ''` used to do.
 */
type KjSavedStyles = Readonly<Record<string, string>>;

/** Refcount of live scroll locks, written on `<html>`. */
const COUNT_ATTR = 'data-kj-scroll-lock';
/** JSON snapshot of the inline styles the first lock replaced. */
const SAVED_ATTR = 'data-kj-scroll-lock-saved';

/**
 * Acquires the page's scroll lock, applying `apply` only for the first holder
 * and restoring what it saved only when the last one releases.
 *
 * **The refcount and the saved styles live on `<html>`, not in module state.**
 * The thing being mutated (`documentElement.style`) is page-scoped, so its
 * bookkeeping has to be too: a module variable belongs to one copy of the
 * bundle and one module instance, and two holders that release out of LIFO
 * order strand the page unscrollable with no overlay open. Reading the count
 * back off the element makes every holder agree, whatever created it.
 *
 * `htmlOverflow()` and `cssClip()` deliberately share one key. They write the
 * same property with different values, so letting them keep separate counts
 * would reintroduce exactly the stranding described above when a `cssClip`
 * overlay opens above an `htmlOverflow` one. The first lock's style wins
 * until the page is fully unlocked.
 */
export function acquireScrollLock(
  doc: Document,
  apply: (html: HTMLElement) => KjSavedStyles,
): () => void {
  const html = doc.documentElement;
  const count = readCount(html, COUNT_ATTR) + 1;
  html.setAttribute(COUNT_ATTR, String(count));
  if (count === 1) {
    html.setAttribute(SAVED_ATTR, JSON.stringify(apply(html)));
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = readCount(html, COUNT_ATTR) - 1;
    if (next > 0) {
      html.setAttribute(COUNT_ATTR, String(next));
      return;
    }
    html.removeAttribute(COUNT_ATTR);
    const saved = readSaved(html);
    html.removeAttribute(SAVED_ATTR);
    for (const [prop, value] of Object.entries(saved)) html.style.setProperty(prop, value);
  };
}

function readCount(html: HTMLElement, attr: string): number {
  const raw = Number(html.getAttribute(attr));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function readSaved(html: HTMLElement): KjSavedStyles {
  const raw = html.getAttribute(SAVED_ATTR);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as KjSavedStyles) : {};
  } catch {
    return {};
  }
}
