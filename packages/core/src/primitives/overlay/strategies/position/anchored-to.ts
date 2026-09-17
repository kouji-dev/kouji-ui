import { inject, isSignal, signal, computed, type Signal } from '@angular/core';
import type { KjOverlayContext } from '../../context';
import { KJ_OVERLAY_POSITION_STRATEGY, type KjPositionStrategy } from '../../tokens';
import type { KjSide, KjAlign, KjPlacement } from '../../types';
import { mintKjId } from '../../../../primitives/overlay/id';

/** Options for {@link anchoredTo}. */
export interface KjAnchoredToOpts {
  trigger?: Signal<HTMLElement | null>;
  side: Signal<KjSide> | KjSide;
  align: Signal<KjAlign> | KjAlign;
  offset?: Signal<number> | number;
  flip?: boolean;
  shift?: boolean;
  /**
   * How to size the panel relative to the trigger:
   * - `'none'` (default) — panel keeps its intrinsic width.
   * - `'min'`            — panel min-width matches trigger width (panel can grow but not shrink below).
   * - `'fixed'`          — panel width matches trigger width exactly.
   */
  matchTriggerWidth?: 'none' | 'min' | 'fixed';
  /**
   * Mirror `side: 'left' | 'right'` and `align: 'start' | 'end'` when the
   * trigger sits in an RTL sub-tree. `true` (the default) reads `side` and
   * `align` as *logical* names: `align: 'start'` — the default for a select
   * or dropdown listbox — pins the panel to the trigger's inline start,
   * which is its right edge under `dir="rtl"`. Set `false` to keep the
   * names physical in every direction.
   */
  mirrorInRtl?: boolean;
  /**
   * Hide the panel while the trigger is scrolled out of view inside a
   * clipping ancestor. `true` (the default).
   *
   * A panel is portalled to the overlay container, so nothing clips it: when
   * the trigger lives in a scroll container (`overflow: hidden | auto |
   * scroll | clip`) and the user scrolls it out of sight, the panel used to
   * keep painting at the trigger's last viewport position — a menu floating
   * over unrelated content, still clickable, pointing at nothing (overlay
   * F-7).
   *
   * While detached the panel gets `visibility: hidden` and
   * `pointer-events: none`, and stops being repositioned. It is deliberately
   * NOT closed or unmounted: open state, focus and the stack entry belong to
   * the overlay, not to a position strategy, and scrolling the trigger back
   * into view has to restore the panel exactly as it was. `visibility: hidden`
   * also takes it out of the accessibility tree while it is out of view, which
   * is the right answer for AT too.
   *
   * Set `false` for a panel that must stay pinned regardless.
   */
  hideWhenDetached?: boolean;
}

/** {@link anchoredTo}'s return type — side/align/offset stay reconfigurable after DI has built it. */
export type KjAnchoredToStrategy = KjPositionStrategy & {
  configure(opts: Partial<KjAnchoredToOpts>): void;
};

/**
 * Reads this element's position strategy back out of DI as an
 * {@link anchoredTo} one and configures it in a single statement.
 *
 * Every anchored panel in the kit — popover, tooltip, select, combobox,
 * tree-select, cascade-select, date-picker, color-picker — declared the same
 * two lines in its constructor, the first of which was a blind
 * `inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>`.
 * The token's type is the *slot* (`KjPositionStrategy`), not what a given
 * panel provided into it, so some narrowing is unavoidable; doing it here
 * makes it one CHECKED narrowing with a message that names the mistake,
 * instead of eight unchecked casts that would have failed later, inside the
 * strategy, with no clue which panel was miswired.
 *
 * The three inputs stay declared on the panel class: Angular's compiler
 * discovers a signal input by seeing `input()` as a class property
 * initialiser, so an input a helper returns is not an input at all.
 *
 * ```ts
 * readonly kjSide   = input<KjSide>('bottom');
 * readonly kjAlign  = input<KjAlign>('center');
 * readonly kjOffset = input<number, unknown>(8, { transform: pxOffset(8) });
 *
 * constructor() {
 *   injectAnchoredPosition({ side: this.kjSide, align: this.kjAlign, offset: this.kjOffset });
 * }
 * ```
 *
 * @param opts - Anything {@link anchoredTo}'s `configure` accepts; the
 *   signals are read live, so later input changes reposition the panel.
 * @returns The strategy, for a panel that needs to reconfigure it again later.
 */
export function injectAnchoredPosition(
  opts: Partial<KjAnchoredToOpts>,
): KjAnchoredToStrategy {
  const strategy = inject(KJ_OVERLAY_POSITION_STRATEGY);
  if (typeof (strategy as Partial<KjAnchoredToStrategy>).configure !== 'function') {
    throw new Error(
      'injectAnchoredPosition() needs KJ_OVERLAY_POSITION_STRATEGY to be an ' +
        'anchoredTo() strategy. Provide `{ provide: KJ_OVERLAY_POSITION_STRATEGY, ' +
        'useFactory: () => anchoredTo() }` on the panel that calls it.',
    );
  }
  const anchored = strategy as KjAnchoredToStrategy;
  anchored.configure(opts);
  return anchored;
}

/**
 * Input transform for a pixel offset that accepts `0`.
 *
 * Every anchored panel used to write `transform: v => Number(v) || <default>`,
 * which coerces `0` — and any expression that evaluates to `0` — back to the
 * default gap, so a flush-to-trigger listbox (`[kjOffset]="0"`) could not be
 * expressed at all. This keeps that expression's real job, guarding `NaN` and
 * an empty / absent value, and lets every finite number through.
 *
 * ```ts
 * readonly kjOffset = input<number, unknown>(8, { transform: pxOffset(8) });
 * ```
 */
export const pxOffset = (fallback: number) => (value: unknown): number => {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const read = <T>(v: Signal<T> | T): T => isSignal(v) ? v() : v;

/**
 * Returns the trigger's effective bounding rect. If the trigger element has
 * `display: contents` (rect is 0×0), walks to the first child until a sized
 * element is found. Common case: `<kj-button kjPopoverTrigger>` where the
 * `<kj-button>` host is `display: contents` and the actual `<button>` is a
 * descendant.
 */
const effectiveRect = (el: HTMLElement): DOMRect => {
  let r = el.getBoundingClientRect();
  if (r.width > 0 || r.height > 0) return r;
  let cur: HTMLElement | null = el;
  while (cur) {
    const child = cur.firstElementChild as HTMLElement | null;
    if (!child) break;
    r = child.getBoundingClientRect();
    if (r.width > 0 || r.height > 0) return r;
    cur = child;
  }
  return el.getBoundingClientRect();
};

/**
 * Whether the anchor sits in an RTL sub-tree, read from its nearest `[dir]`
 * ancestor. Deliberately the same rule a scoped `KjDirectionality` applies,
 * and the one `KjRovingTabindex` applies to arrow keys, so visual direction,
 * keyboard direction and anchoring agree inside an RTL island. It is also a
 * layout-free attribute walk, cheap enough to repeat every frame of a scroll
 * — a CSS-only `direction: rtl` with no `dir` attribute is not honoured,
 * because reading that would mean `getComputedStyle` per frame.
 */
const isRtlAnchor = (el: HTMLElement): boolean =>
  (el.closest('[dir]')?.getAttribute('dir') ?? '').toLowerCase() === 'rtl';

/** Computed overflow values that clip a descendant. */
const CLIPPING_OVERFLOW = /hidden|clip|auto|scroll/;

/**
 * The trigger's clipping ancestors: every element above it whose computed
 * overflow clips, stopping at (and excluding) `<body>` / `<html>`, which the
 * viewport clamp in `shift` already covers.
 *
 * Resolved once per open — `getComputedStyle` per ancestor is far too
 * expensive to repeat on every frame of a scroll, so only the cheap
 * `getBoundingClientRect()` reads happen per frame. A container that becomes
 * scrollable *while* the overlay is open is therefore not picked up; that is
 * the trade for keeping the per-frame path layout-read-only, and the set is
 * re-resolved on the next open.
 */
const clippingAncestors = (el: HTMLElement): HTMLElement[] => {
  const view = el.ownerDocument.defaultView;
  if (!view || typeof view.getComputedStyle !== 'function') return [];
  const out: HTMLElement[] = [];
  const { body, documentElement } = el.ownerDocument;
  let cur = el.parentElement;
  while (cur && cur !== body && cur !== documentElement) {
    const cs = view.getComputedStyle(cur);
    // The shorthand as well as the longhands: a browser fills in
    // `overflowX` / `overflowY`, jsdom only reports the shorthand it was
    // given, and either one clipping is enough.
    if (CLIPPING_OVERFLOW.test(`${cs.overflow} ${cs.overflowX} ${cs.overflowY}`)) out.push(cur);
    cur = cur.parentElement;
  }
  return out;
};

/** Whether `rect` lies entirely outside `clip`. Touching edges count as outside. */
const outside = (rect: DOMRect, clip: DOMRect): boolean =>
  rect.bottom <= clip.top ||
  rect.top >= clip.bottom ||
  rect.right <= clip.left ||
  rect.left >= clip.right;

const MIRRORED_SIDE: Record<KjSide, KjSide> = { left: 'right', right: 'left', top: 'top', bottom: 'bottom' };
const MIRRORED_ALIGN: Record<KjAlign, KjAlign> = { start: 'end', end: 'start', center: 'center' };

const supportsCssAnchor = (): boolean => {
  // Disabled — CSS Anchor Positioning + position-area produces inconsistent
  // results across browser versions (Chrome flips/inflates inset unexpectedly
  // with span-* keywords). Manual math fallback is the canonical path.
  return false;
};

const positionAreaFor = (side: KjSide, align: KjAlign): string => {
  if (side === 'top' || side === 'bottom') {
    const cross = align === 'start' ? 'span-right'
                : align === 'end'   ? 'span-left'
                                    : 'center';
    return `${side} ${cross}`;
  }
  const cross = align === 'start' ? 'span-bottom'
              : align === 'end'   ? 'span-top'
                                  : 'center';
  return `${side} ${cross}`;
};

/**
 * Anchors the panel to the trigger.
 *
 * The resolved placement — post-RTL-mirror, post-flip — is published on
 * `placement`, which `KjOverlayPanel` reflects as `data-side` / `data-align`
 * on the panel element. Both are *physical*: `data-align="end"` means the
 * panel's right edge meets the trigger's right edge whatever the document
 * direction, so an arrow rule keyed on it works in LTR and RTL alike.
 */
export function anchoredTo(initialOpts: Partial<KjAnchoredToOpts> = {}): KjAnchoredToStrategy {
  let opts: Partial<KjAnchoredToOpts> = { ...initialOpts };
  let ctx: KjOverlayContext | null = null;
  let onResize: (() => void) | null = null;
  // The window the listeners were installed on, taken from the overlay's own
  // elements rather than a global so a panel in another document still works.
  let view: (Window & typeof globalThis) | null = null;
  let onScroll: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let useCssAnchor: boolean | null = null;
  /** Clipping ancestors of the trigger, resolved once at open. */
  let clippers: HTMLElement[] = [];
  /** Whether the panel is hidden right now because the trigger scrolled away. */
  let detached = false;
  // Minted eagerly so it routes through the injector's KjId: `anchoredTo()`
  // is built in an injection context (provider factory / field initialiser),
  // while `update()` — where the ident is used — is not.
  const anchorIdent = `--${mintKjId('anchor')}`;
  let cssTrigger: HTMLElement | null = null;
  let isOpen = false;
  /** Pending coalescing frame; `0` when nothing is scheduled. */
  let frame = 0;
  const _placement = signal<KjPlacement | null>(null);
  const placement = computed(() => _placement());

  /** Resolved logical-to-physical side/align for the current anchor. */
  const resolveNames = (trigger: HTMLElement): { side: KjSide; align: KjAlign } => {
    const side = read<KjSide>(opts.side ?? 'bottom');
    const align = read<KjAlign>(opts.align ?? 'center');
    if (!((opts.mirrorInRtl ?? true) && isRtlAnchor(trigger))) return { side, align };
    return { side: MIRRORED_SIDE[side], align: MIRRORED_ALIGN[align] };
  };

  const applyCss = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = opts.trigger ? opts.trigger() : ctx.triggerEl();
    const panel = ctx.panelEl();
    if (!trigger || !panel) return;

    const { side, align } = resolveNames(trigger);
    const offset = read<number>(opts.offset ?? 0);

    trigger.style.setProperty('anchor-name', anchorIdent);
    cssTrigger = trigger;

    panel.style.setProperty('position', 'fixed');
    panel.style.setProperty('position-anchor', anchorIdent);
    panel.style.setProperty('position-area', positionAreaFor(side, align));
    panel.style.setProperty('margin', `${offset}px`);

    _placement.set({ side, align });
  };

  const clearCss = () => {
    const panel = ctx?.panelEl();
    if (panel) {
      panel.style.removeProperty('position');
      panel.style.removeProperty('position-anchor');
      panel.style.removeProperty('position-area');
      panel.style.removeProperty('margin');
    }
    if (cssTrigger) {
      const current = cssTrigger.style.getPropertyValue('anchor-name');
      if (current === anchorIdent) {
        cssTrigger.style.removeProperty('anchor-name');
      }
    }
    cssTrigger = null;
    _placement.set(null);
  };

  /**
   * One measure phase, then one write phase. Every style write is guarded on
   * the value actually changing, so a frame in which nothing moved leaves
   * layout clean and the next frame's `getBoundingClientRect()` is served
   * without a forced reflow.
   */
  const applyManual = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = opts.trigger ? opts.trigger() : ctx.triggerEl();
    const panel = ctx.panelEl();
    if (!trigger || !panel) return;

    const { side, align } = resolveNames(trigger);
    const offset = read<number>(opts.offset ?? 0);
    const flip = opts.flip ?? true;
    const shift = opts.shift ?? true;
    const matchWidth = opts.matchTriggerWidth ?? 'none';

    // ── measure ─────────────────────────────────────────────────────────
    const tRect = effectiveRect(trigger);

    // The trigger may have scrolled out of a clipping ancestor. Nothing clips
    // the portalled panel, so the strategy has to. Rect reads only here — the
    // expensive `getComputedStyle` walk ran once, at open.
    if (setDetached(panel, isClippedAway(tRect))) return;

    // Width matching changes the panel's own box, so it has to land before
    // the panel is measured. Written only when the value differs: through a
    // scroll the trigger's width is constant, so this leaves layout clean.
    if (matchWidth !== 'none') {
      const prop = matchWidth === 'fixed' ? 'width' : 'minWidth';
      const value = `${tRect.width}px`;
      if (panel.style[prop] !== value) panel.style[prop] = value;
    }

    const pRect = panel.getBoundingClientRect();
    const win = panel.ownerDocument.defaultView;
    const vw = win?.innerWidth ?? 0, vh = win?.innerHeight ?? 0;

    // ── resolve ─────────────────────────────────────────────────────────
    let resolvedSide = side;
    if (flip) {
      if (side === 'bottom' && tRect.bottom + offset + pRect.height > vh && tRect.top - offset - pRect.height >= 0) resolvedSide = 'top';
      else if (side === 'top' && tRect.top - offset - pRect.height < 0 && tRect.bottom + offset + pRect.height <= vh) resolvedSide = 'bottom';
      else if (side === 'right' && tRect.right + offset + pRect.width > vw && tRect.left - offset - pRect.width >= 0) resolvedSide = 'left';
      else if (side === 'left' && tRect.left - offset - pRect.width < 0 && tRect.right + offset + pRect.width <= vw) resolvedSide = 'right';
    }

    let left = 0, top = 0;
    if (resolvedSide === 'bottom') { top = tRect.bottom + offset; }
    if (resolvedSide === 'top')    { top = tRect.top - offset - pRect.height; }
    if (resolvedSide === 'right')  { left = tRect.right + offset; }
    if (resolvedSide === 'left')   { left = tRect.left - offset - pRect.width; }

    if (resolvedSide === 'top' || resolvedSide === 'bottom') {
      if (align === 'start')  left = tRect.left;
      if (align === 'center') left = tRect.left + (tRect.width - pRect.width) / 2;
      if (align === 'end')    left = tRect.right - pRect.width;
    } else {
      if (align === 'start')  top = tRect.top;
      if (align === 'center') top = tRect.top + (tRect.height - pRect.height) / 2;
      if (align === 'end')    top = tRect.bottom - pRect.height;
    }

    if (shift) {
      left = Math.max(0, Math.min(left, vw - pRect.width));
      top  = Math.max(0, Math.min(top,  vh - pRect.height));
    }

    // ── write ───────────────────────────────────────────────────────────
    const leftPx = `${left}px`;
    const topPx = `${top}px`;
    if (panel.style.position !== 'fixed') panel.style.position = 'fixed';
    if (panel.style.left !== leftPx) panel.style.left = leftPx;
    if (panel.style.top !== topPx) panel.style.top = topPx;

    const prev = _placement();
    if (!prev || prev.side !== resolvedSide || prev.align !== align) {
      _placement.set({ side: resolvedSide, align });
    }
  };

  /**
   * Coalesces every scroll / resize / element-resize notification arriving in
   * one frame into a single `applyManual()`. Without it, a wheel gesture ran
   * the measure + write pair once per event, for every scroll container in
   * the document (the listener is in capture on `window`), for every open
   * anchored overlay.
   */
  const schedule = () => {
    if (frame || !view) return;
    frame = view.requestAnimationFrame(() => {
      frame = 0;
      applyManual();
    });
  };

  const cancelScheduled = () => {
    if (frame && view) view.cancelAnimationFrame(frame);
    frame = 0;
  };

  /**
   * Whether the trigger has scrolled entirely out of one of its clipping
   * ancestors. A clipper with no box at all (0×0) is skipped rather than
   * treated as "clips everything": that is what an environment with no layout
   * reports, and hiding every panel there would be far worse than not hiding
   * one.
   */
  const isClippedAway = (tRect: DOMRect): boolean => {
    if ((opts.hideWhenDetached ?? true) === false) return false;
    // A trigger with no box at all is not "scrolled away", it is not laid out
    // yet (first open before paint, `display: none` ancestor). Hiding on that
    // would blank a panel that is about to be positioned correctly.
    if (tRect.width === 0 && tRect.height === 0) return false;
    for (const clipper of clippers) {
      const cRect = clipper.getBoundingClientRect();
      if (cRect.width === 0 && cRect.height === 0) continue;
      if (outside(tRect, cRect)) return true;
    }
    return false;
  };

  /**
   * Applies — or lifts — the detached posture. Returns `true` when the caller
   * should stop: the panel is hidden, so there is nothing to position.
   */
  const setDetached = (panel: HTMLElement, next: boolean): boolean => {
    if (next !== detached) {
      detached = next;
      panel.style.visibility = next ? 'hidden' : '';
      panel.style.pointerEvents = next ? 'none' : '';
    }
    return next;
  };

  const clearManual = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.width = '';
    panel.style.minWidth = '';
    if (detached) {
      panel.style.visibility = '';
      panel.style.pointerEvents = '';
    }
    detached = false;
    _placement.set(null);
  };

  const apply = () => {
    if (useCssAnchor) applyCss();
    else applyManual();
  };

  return {
    placement,
    attach(c) { ctx = c; },
    onOpen() {
      isOpen = true;
      if (useCssAnchor === null) {
        useCssAnchor = ctx?.platform.isBrowser ? supportsCssAnchor() : false;
      }
      if (useCssAnchor) {
        applyCss();
        return;
      }
      {
        const anchor = opts.trigger ? opts.trigger() : ctx?.triggerEl();
        clippers = ctx?.platform.isBrowser && anchor ? clippingAncestors(anchor) : [];
      }
      applyManual();
      if (!ctx?.platform.isBrowser) return;
      onResize = schedule;
      onScroll = schedule;
      const trigger = opts.trigger ? opts.trigger() : ctx.triggerEl();
      const panel = ctx.panelEl();
      view = panel?.ownerDocument.defaultView ?? trigger?.ownerDocument.defaultView ?? null;
      // Passive: repositioning never calls `preventDefault()`, and a
      // non-passive capture-phase `scroll` listener on `window` opts the
      // whole document out of compositor-thread scrolling.
      view?.addEventListener('resize', onResize, { passive: true });
      view?.addEventListener('scroll', onScroll, { capture: true, passive: true });
      if (typeof ResizeObserver !== 'undefined' && trigger && panel) {
        resizeObserver = new ResizeObserver(schedule);
        resizeObserver.observe(trigger);
        resizeObserver.observe(panel);
      }
    },
    onClose() {
      isOpen = false;
      if (useCssAnchor) {
        clearCss();
        return;
      }
      cancelScheduled();
      clearManual();
      clippers = [];
      if (onResize) view?.removeEventListener('resize', onResize);
      if (onScroll) view?.removeEventListener('scroll', onScroll, true);
      onResize = onScroll = null;
      view = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
    },
    update() {
      if (useCssAnchor) return;
      applyManual();
    },
    detach() { cancelScheduled(); ctx = null; },
    configure(newOpts: Partial<KjAnchoredToOpts>) {
      opts = { ...opts, ...newOpts };
      if (isOpen) apply();
    },
  };
}
