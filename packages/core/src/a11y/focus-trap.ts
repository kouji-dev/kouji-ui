import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  booleanAttribute,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Elements that can take sequential keyboard focus, before the visibility,
 * disabled and `tabindex` filters in {@link tabbableElements} run.
 */
const TABBABLE_CANDIDATES = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]',
  '[tabindex]',
].join(',');

/** Candidates that are tabbable on their own, without a `contenteditable` attribute. */
const NATIVE_CANDIDATES = TABBABLE_CANDIDATES.replace(',[contenteditable]', '');

/** Selector for the element an overlay focuses first when it opens. */
const AUTOFOCUS = '[kjautofocus], [autofocus]';

type VisibilityCheck = HTMLElement & {
  checkVisibility?: (options?: { visibilityProperty?: boolean; contentVisibilityAuto?: boolean }) => boolean;
};

/**
 * Whether `el` is rendered: connected to the document and not hidden by a
 * `hidden` attribute, `display: none`, `visibility: hidden` or a closed
 * `<details>` on itself or an ancestor. Uses `Element.checkVisibility()`
 * where the engine provides it; otherwise walks the ancestor chain, which
 * is the layout-free path an SSR-less DOM (jsdom) can answer.
 */
/**
 * The document a DOM node belongs to, falling back to the ambient one.
 *
 * This engine is framework-free — it is handed elements, not an injector — so
 * the element it is working on *is* its handle on a document. Read through
 * `globalThis` rather than the bare `document` binding so the SSR lint rule
 * keeps its meaning everywhere else, and so a node in another document (an
 * iframe, a test harness) is honoured instead of silently ignored.
 */
function ownerDocumentOf(node: Node | null | undefined): Document | null {
  return node?.ownerDocument ?? (globalThis as { document?: Document }).document ?? null;
}

/**
 * Whether an element is rendered and visible — `Element.checkVisibility()`
 * where the engine has it, else a layout-free ancestor walk so jsdom stays
 * testable. Shared by the focus-trap tabbable query and the roving group's
 * navigable filter.
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const check = (el as VisibilityCheck).checkVisibility;
  if (typeof check === 'function') {
    return check.call(el, { visibilityProperty: true, contentVisibilityAuto: true });
  }
  const view = el.ownerDocument?.defaultView;
  if (!view) return false;
  let node: HTMLElement | null = el;
  const root = el.ownerDocument?.documentElement ?? null;
  while (node && node !== root) {
    if (node.hasAttribute('hidden')) return false;
    if (node.tagName === 'DETAILS' && !(node as HTMLDetailsElement).open && !isOwnSummary(el, node)) return false;
    if (view.getComputedStyle(node).display === 'none') return false;
    node = node.parentElement;
  }
  return view.getComputedStyle(el).visibility !== 'hidden';
}

function isOwnSummary(el: HTMLElement, details: HTMLElement): boolean {
  const summary = details.querySelector(':scope > summary');
  return !!summary && summary.contains(el);
}

function tabIndexOf(el: HTMLElement): number {
  const raw = el.getAttribute('tabindex');
  if (raw === null) return 0;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
}

function isDisabled(el: HTMLElement): boolean {
  if ((el as HTMLButtonElement).disabled === true) return true;
  try {
    return el.matches(':disabled');
  } catch {
    return false;
  }
}

/**
 * Whether `el` currently takes part in sequential (Tab) focus navigation:
 * a native or `tabindex`-bearing focusable that is rendered, enabled, not
 * `tabindex="-1"` and not inside an `inert` subtree.
 */
export function isTabbable(el: HTMLElement): boolean {
  if (tabIndexOf(el) < 0) return false;
  if (el.closest('[inert]')) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' && (el as HTMLInputElement).type === 'hidden') return false;
  if (isDisabled(el)) return false;
  if (tag === 'SUMMARY') {
    const details = el.parentElement;
    if (!details || details.tagName !== 'DETAILS' || details.querySelector(':scope > summary') !== el) return false;
  }
  if (el.getAttribute('contenteditable') === 'false' && !el.matches(NATIVE_CANDIDATES)) return false;
  return isElementVisible(el);
}

/**
 * Every tabbable descendant of `root` in sequential focus order: elements
 * with a positive `tabindex` first (ascending), then the rest in DOM order.
 * Shadow roots are not traversed.
 */
export function tabbableElements(root: ParentNode): HTMLElement[] {
  const positive: { el: HTMLElement; ti: number }[] = [];
  const rest: HTMLElement[] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_CANDIDATES))) {
    if (!isTabbable(el)) continue;
    const ti = tabIndexOf(el);
    if (ti > 0) positive.push({ el, ti });
    else rest.push(el);
  }
  positive.sort((a, b) => a.ti - b.ti);
  return [...positive.map((p) => p.el), ...rest];
}

/** Whether `el` can receive programmatic focus right now (connected, rendered, not inert). */
export function isFocusTarget(el: HTMLElement | null | undefined): el is HTMLElement {
  return !!el && el.isConnected && !el.closest('[inert]') && isElementVisible(el);
}

/**
 * Where focus goes when a trapped region opens.
 *
 * - `'auto'` — the first `[kjAutofocus]` / `[autofocus]` element inside the
 *   region, else the region itself.
 * - `'first'` — the first tabbable element, else the region itself.
 * - an element, or a function returning one — that element, else the region.
 */
export type KjInitialFocus = 'auto' | 'first' | HTMLElement | (() => HTMLElement | null);

/** Focuses the region itself, giving it `tabindex="-1"` when it has no `tabindex` of its own. */
function focusRegion(root: HTMLElement): void {
  if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
  root.focus();
}

/**
 * Moves focus into `root` according to `policy`. A no-op when focus is
 * already inside the region, so a widget that places focus on its own
 * active item (a listbox, a menu) is never fought.
 */
export function focusInitialIn(root: HTMLElement, policy: KjInitialFocus = 'auto'): void {
  const doc = ownerDocumentOf(root);
  if (!doc) return;
  const current = doc.activeElement;
  if (current && current !== doc.body && root.contains(current)) return;
  let target: HTMLElement | null;
  if (policy instanceof HTMLElement) target = policy;
  else if (typeof policy === 'function') target = policy();
  else if (policy === 'first') target = tabbableElements(root)[0] ?? null;
  else target = root.querySelector<HTMLElement>(AUTOFOCUS);
  if (isFocusTarget(target)) target.focus();
  else focusRegion(root);
}

/**
 * Returns focus to the first usable element of `candidates` when focus is
 * inside `container` or was lost to `<body>` after entering it (its element
 * was removed with the region). Focus the user or the app already moved
 * somewhere else is left alone.
 *
 * @returns `true` when focus was moved.
 */
export function returnFocusFrom(
  container: HTMLElement | null,
  candidates: readonly (HTMLElement | null | undefined)[],
  focusEntered: boolean,
): boolean {
  const doc = ownerDocumentOf(container ?? candidates.find((c) => !!c) ?? null);
  if (!doc) return false;
  const current = doc.activeElement as HTMLElement | null;
  const lost = !current || current === doc.body;
  const inside = !!current && !!container && container.contains(current);
  if (!inside && !(lost && focusEntered)) return false;
  for (const candidate of candidates) {
    if (!isFocusTarget(candidate)) continue;
    candidate.focus();
    return doc.activeElement === candidate;
  }
  return false;
}

/** Options for {@link createFocusTrap}. */
export interface KjFocusTrapOptions {
  /** The trapped region. Read on every event so a late-bound panel works. */
  container: () => HTMLElement | null;
  /**
   * Whether the trap currently owns focus. A trap under a newer overlay
   * returns `false` so Tab and focus inside that overlay are left alone.
   * Defaults to always active.
   */
  isActive?: () => boolean;
  /** Return focus to the element focused at `activate()` time. Defaults to `true`. */
  returnFocus?: boolean | (() => boolean);
}

/** Handle returned by {@link createFocusTrap}. */
export interface KjFocusTrapHandle {
  /** Whether the document listeners are installed. */
  readonly active: boolean;
  /** Records the current focus as the return target and starts trapping. */
  activate(): void;
  /** Stops trapping. Keeps the return target for a later {@link restoreFocus}. */
  deactivate(): void;
  /** Moves focus into the region per `policy` — see {@link focusInitialIn}. */
  focusInitial(policy?: KjInitialFocus): void;
  /**
   * Returns focus to the element focused at `activate()` time when focus
   * is still inside the region or was lost to `<body>`.
   * @returns `true` when focus was moved.
   */
  restoreFocus(): boolean;
}

/**
 * Framework-free focus-trap engine shared by {@link KjFocusTrap} and the
 * overlay `tabCycle()` / `inertBased()` strategies. Keeps sequential focus
 * inside a region:
 *
 * - Tab / Shift+Tab wrap between the first and last tabbable element; a
 *   region with no tabbable element keeps focus on itself.
 * - Focus that lands outside the region by any route (script, a click on a
 *   non-inert background, returning from browser chrome) is pulled back to
 *   the last focused element inside it.
 * - Listeners live on `document`, so they gate on `isActive` — a nested
 *   overlay on top of the region owns focus while it is open.
 */
export function createFocusTrap(opts: KjFocusTrapOptions): KjFocusTrapHandle {
  let active = false;
  let returnTarget: HTMLElement | null = null;
  let lastInside: HTMLElement | null = null;
  let focusEntered = false;

  /** Where the listeners live. Taken from the trapped region when there is one. */
  let listenerDoc: Document | null = null;

  const isActive = (): boolean => active && (opts.isActive?.() ?? true);
  const region = (): HTMLElement | null => {
    const root = opts.container();
    return root && root.isConnected ? root : null;
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab' || e.defaultPrevented || !isActive()) return;
    const root = region();
    if (!root) return;
    const tabbables = tabbableElements(root);
    if (tabbables.length === 0) {
      e.preventDefault();
      focusRegion(root);
      return;
    }
    const current = ownerDocumentOf(root)?.activeElement as HTMLElement | null;
    const first = tabbables[0];
    const last = tabbables[tabbables.length - 1];
    if (!current || !root.contains(current)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    const index = tabbables.indexOf(current);
    if (index === -1) {
      // Focus sits on a non-tabbable element inside the region (the region
      // itself, or a roving item at tabindex="-1"): step to the neighbour
      // in DOM order and wrap at the edges.
      e.preventDefault();
      const next = e.shiftKey
        ? [...tabbables].reverse().find((el) => el.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING) ?? last
        : tabbables.find((el) => el.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_PRECEDING) ?? first;
      next.focus();
      return;
    }
    if (e.shiftKey && index === 0) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && index === tabbables.length - 1) {
      e.preventDefault();
      first.focus();
    }
  };

  const onFocusIn = (e: FocusEvent): void => {
    if (!isActive()) return;
    const root = region();
    if (!root) return;
    const target = e.target as HTMLElement | null;
    if (target && root.contains(target)) {
      lastInside = target;
      focusEntered = true;
      return;
    }
    if (lastInside && root.contains(lastInside) && isFocusTarget(lastInside)) {
      lastInside.focus();
      return;
    }
    const first = tabbableElements(root)[0];
    if (first) first.focus();
    else focusRegion(root);
  };

  return {
    get active() {
      return active;
    },
    activate() {
      if (active) return;
      const root = opts.container();
      const doc = ownerDocumentOf(root);
      if (!doc) return;
      active = true;
      focusEntered = false;
      lastInside = null;
      const current = doc.activeElement as HTMLElement | null;
      if (current && current !== doc.body && !(root && root.contains(current))) returnTarget = current;
      listenerDoc = doc;
      doc.addEventListener('keydown', onKeydown, true);
      doc.addEventListener('focusin', onFocusIn, true);
    },
    deactivate() {
      if (!active) return;
      active = false;
      listenerDoc?.removeEventListener('keydown', onKeydown, true);
      listenerDoc?.removeEventListener('focusin', onFocusIn, true);
      listenerDoc = null;
    },
    focusInitial(policy = 'auto') {
      const root = region();
      if (!root) return;
      focusInitialIn(root, policy);
      const current = ownerDocumentOf(root)?.activeElement as HTMLElement | null;
      if (current && root.contains(current)) {
        lastInside = current;
        focusEntered = true;
      }
    },
    restoreFocus() {
      const wanted = typeof opts.returnFocus === 'function' ? opts.returnFocus() : (opts.returnFocus ?? true);
      const target = returnTarget;
      returnTarget = null;
      const entered = focusEntered;
      focusEntered = false;
      lastInside = null;
      if (!wanted) return false;
      return returnFocusFrom(opts.container(), [target], entered);
    },
  };
}

/**
 * Traps keyboard focus inside the host element while enabled — Tab and
 * Shift+Tab wrap at the edges, focus that escapes is pulled back, and a
 * host with no tabbable content keeps focus on itself. On enable the
 * element focused at that moment is remembered and focus moves into the
 * host (`[kjAutofocus]` / `[autofocus]` first, else the host); on disable
 * or destroy focus returns to that element.
 *
 * Every kouji overlay gets this behaviour from the overlay primitives; use
 * the directive for a hand-rolled dialog, drawer or side panel.
 *
 * @example
 * ```html
 * <div role="dialog" kjFocusTrap [kjFocusTrapEnabled]="isOpen()">
 *   <button>Action</button>
 * </div>
 * ```
 * @doc-category Core/Accessibility
 * @doc
 * @doc-name a11y
 */
@Directive({
  selector: '[kjFocusTrap]',
  standalone: true,
  exportAs: 'kjFocusTrap',
})
export class KjFocusTrap {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly trap = createFocusTrap({
    container: () => this.el.nativeElement,
    returnFocus: () => this.kjFocusTrapReturnFocus(),
  });

  /** Whether the focus trap is active. Set to true when the overlay is open. Default `false`. */
  readonly kjFocusTrapEnabled = input(false, { transform: booleanAttribute });

  /** Return focus to the previously focused element when the trap is disabled. Default `true`. */
  readonly kjFocusTrapReturnFocus = input(true, { transform: booleanAttribute });

  constructor() {
    effect(() => {
      const enabled = this.kjFocusTrapEnabled();
      if (!this.isBrowser) return;
      untracked(() => (enabled ? this.enable() : this.disable()));
    });
    inject(DestroyRef).onDestroy(() => this.disable());
  }

  /** Focuses the first tabbable element inside the trap, or the host when there is none. */
  focusFirst(): void {
    if (!this.isBrowser) return;
    focusInitialIn(this.el.nativeElement, 'first');
  }

  private enable(): void {
    if (this.trap.active) return;
    this.trap.activate();
    // The host may become visible in the same change-detection pass that
    // enabled the trap; focus only lands once that render is done.
    afterNextRender(() => {
      if (this.trap.active) this.trap.focusInitial('auto');
    }, { injector: this.injector });
  }

  private disable(): void {
    if (!this.trap.active) return;
    this.trap.deactivate();
    this.trap.restoreFocus();
  }
}
