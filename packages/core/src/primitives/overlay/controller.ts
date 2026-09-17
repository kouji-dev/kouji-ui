import { DestroyRef, Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import type { KjOverlayContext } from './context';
import type {
  KjMountStrategy, KjPositionStrategy, KjBackdropStrategy,
  KjFocusTrapStrategy, KjScrollLockStrategy, KjLiveAnnouncerStrategy,
  KjTriggerEventStrategy, KjStrategy,
} from './tokens';
import type { KjOverlayState, KjCloseReason } from './types';
import { KjOverlayStack, applyOverlayZIndex, clearOverlayZIndex, type KjOverlayStackHandle } from './stack';
import { KjId } from './id';
import { KjReducedMotion } from '../../motion/reduced-motion';
import { focusInitialIn, returnFocusFrom } from '../../a11y/focus-trap';

/** The strategy bundle an overlay runs on. `mount` and `position` are required; the rest default to their no-op strategies. */
export interface KjOverlayStrategies {
  mount: KjMountStrategy;
  position: KjPositionStrategy;
  trigger?: KjTriggerEventStrategy | null;
  backdrop?: KjBackdropStrategy | null;
  focusTrap?: KjFocusTrapStrategy | null;
  scrollLock?: KjScrollLockStrategy | null;
  liveAnnouncer?: KjLiveAnnouncerStrategy | null;
  /**
   * Return focus to the element that had it when the overlay opened (or to
   * the trigger when that element is gone) once the overlay closes. Applies
   * whether or not a focus trap is configured; a trap built with
   * `returnFocus: false` opts out on its own. Default `true`.
   */
  returnFocus?: boolean;
  /**
   * Whether Escape closes the overlay. `false` makes it swallow Escape
   * without closing (an `alertdialog` that must be answered) — Escape does
   * not fall through to the overlay beneath. Default `true`.
   */
  closeOnEsc?: boolean;
  /**
   * Whether a press outside the panel closes the overlay. With a rendered
   * scrim the scrim decides (this flag, else the backdrop strategy's
   * `closeOnClick`); without one `KjOverlayStack` decides. Default `true`.
   */
  closeOnOutside?: boolean;
  /**
   * Register with `KjOverlayStack` as a passive entry: stacked above what is
   * open, but never the owner of a gesture — Escape and outside presses keep
   * going to the overlay beneath. For transient, non-interactive surfaces
   * such as toasts. Default `false`.
   */
  passive?: boolean;
}

/** Panel roles whose open moves focus into the panel even without a focus trap (WAI-ARIA APG dialog). */
const FOCUS_ON_OPEN_ROLES = new Set(['dialog', 'alertdialog']);

/** Close reasons produced by a press on the trigger itself; a trigger click that follows one is the same gesture. */
const PRESS_REASONS = new Set<KjCloseReason>(['outside', 'backdrop']);

/**
 * Parses a CSS time list (`'0.2s, 300ms'`) into milliseconds. A computed
 * `transition-duration` is a *list* whenever the stylesheet transitions more
 * than one property, and `parseFloat` on it reads only the first entry.
 */
function cssTimesMs(value: string): number[] {
  return value.split(',').map(part => {
    const text = part.trim();
    const n = parseFloat(text);
    if (!Number.isFinite(n)) return 0;
    return text.endsWith('ms') ? n : n * 1000;
  });
}

/**
 * Longest `duration + delay` pair in a CSS transition / animation list. CSS
 * repeats the shorter list over the longer one, and a negative delay starts
 * the animation part-way through rather than extending it, so it clamps at 0.
 */
function longestRunMs(durations: string, delays: string): number {
  const d = cssTimesMs(durations);
  const l = cssTimesMs(delays);
  let longest = 0;
  for (let i = 0; i < d.length; i++) {
    const delay = l.length ? l[i % l.length] : 0;
    longest = Math.max(longest, d[i] + Math.max(0, delay));
  }
  return longest;
}

/** The strategy slots of a bundle, in attach order. */
const STRATEGY_SLOTS = ['mount', 'position', 'backdrop', 'scrollLock', 'focusTrap', 'liveAnnouncer', 'trigger'] as const;
type StrategySlot = (typeof STRATEGY_SLOTS)[number];

/**
 * Owns the overlay's open/closed state machine plus the rAF/transition
 * orchestration. Strategies (mount/position/backdrop/focus-trap/scroll-lock/
 * live-announcer/trigger-event) attach to it and receive `onOpen` when the
 * overlay starts opening and `onClose` once the close transition ends; the
 * panel + trigger directives bind to it via DI.
 *
 * Focus is managed here for every overlay: on open, a configured focus trap
 * places initial focus (a trap-less `dialog` / `alertdialog` panel gets the
 * `[kjAutofocus]` element or the panel itself); on close, focus that is
 * still inside the panel — or that fell to `<body>` after entering it —
 * returns to the opener, falling back to the trigger element.
 *
 * Lifecycle: the controller disposes itself when the injector that provides
 * it is destroyed (a trigger or panel host leaving the DOM with the overlay
 * open), tearing the open overlay down synchronously — stack entry, scroll
 * lock, portal wrapper and document listeners are gone before the next
 * gesture. Re-opening during the close transition also settles the previous
 * cycle synchronously first, so no stack entry or listener outlives it.
 *
 * @doc-category Core/Overlay
 * @doc
 * @doc-name overlay-controller
 * @doc-is-main
 * @doc-description Owns one overlay's open/close state and keeps its panel, trigger, and backdrop in sync.
 */
@Injectable()
export class KjOverlayController {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser  = isPlatformBrowser(this.platformId);
  private readonly stack      = inject(KjOverlayStack);
  private readonly idSvc      = inject(KjId);
  private readonly document   = inject(DOCUMENT);
  /**
   * perf F-15: one `MediaQueryList` for the page rather than a fresh one per
   * open and per close. `matchesNow()` (not the signal) is the right reader
   * here — the signal is seeded in `afterNextRender` to keep hydration stable,
   * so an overlay opened before that render would read a stale `false`.
   */
  private readonly reducedMotion = inject(KjReducedMotion);
  readonly id = this.idSvc.mint('overlay');

  private readonly _state     = signal<KjOverlayState>('closed');
  private readonly _trigger   = signal<HTMLElement | null>(null);
  private readonly _panel     = signal<HTMLElement | null>(null);
  private readonly _backdrop  = signal<HTMLElement | null>(null);
  private readonly _closeReason = signal<KjCloseReason | null>(null);
  readonly state              = this._state.asReadonly();
  readonly isOpen             = computed(() => this._state() === 'open' || this._state() === 'opening');
  readonly triggerEl          = this._trigger.asReadonly();
  readonly panelEl            = this._panel.asReadonly();
  /** The rendered `<kj-backdrop>` scrim, when the overlay has one. */
  readonly backdropEl         = this._backdrop.asReadonly();
  /**
   * Why the overlay last closed (or is closing): `null` until the first
   * close, reset when it opens again. Lets a consumer tell an Escape /
   * outside dismissal from a selection or an API call.
   */
  readonly closeReason        = this._closeReason.asReadonly();

  /**
   * Public read-only access to the attached strategy bundle. Builder, panel
   * directive, and tests all need to inspect strategies without reaching
   * for a private field via casts.
   */
  strategies: KjOverlayStrategies | null = null;
  private stackHandle: KjOverlayStackHandle | null = null;
  private readonly _stackHandle = signal<KjOverlayStackHandle | null>(null);

  /**
   * Whether this overlay is the top of `KjOverlayStack` — nothing is open
   * above it. Read by dismiss paths (backdrop click, Escape) so a gesture
   * aimed at a nested overlay never falls through to its opener. `true`
   * when the overlay is not registered at all (nothing to be under).
   */
  readonly isTopmost = computed(() => this._stackHandle()?.isTopmost() ?? true);

  readonly context: KjOverlayContext = {
    state: this.state,
    isOpen: this.isOpen,
    triggerEl: this.triggerEl,
    panelEl: this.panelEl,
    stack: this.stack,
    isTopmost: this.isTopmost,
    platform: { isBrowser: this.isBrowser },
    requestClose: (r) => this.close(r),
  };

  private transitionDeadline = 0;
  private rafId = 0;
  private transitionListener: ((e: Event) => void) | null = null;

  /** Element focused when the overlay started opening — where focus returns on close. */
  private opener: HTMLElement | null = null;
  /** Whether focus entered the panel while it was open; set by `focusin` on the panel. */
  private focusEntered = false;
  private focusWatched: HTMLElement | null = null;
  private readonly onPanelFocusIn = (): void => { this.focusEntered = true; };

  constructor() {
    // Providers on an element injector are destroyed with their host view:
    // a popover trigger, dropdown or command palette removed while open
    // (route change, `@if`) tears its overlay down here. Builder-launched
    // overlays reach the same call from `KjOverlayWrapper`.
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  bindTrigger(el: HTMLElement | null) { this._trigger.set(el); }
  bindPanel(el: HTMLElement | null)   { this._panel.set(el); }
  /**
   * Registers the overlay's scrim element. `KjBackdrop` calls it on
   * creation; the controller keeps the scrim right before the panel while
   * open (inside the portal wrapper) and hidden next to it while closed, and
   * hands outside-press ownership to it instead of `KjOverlayStack`.
   */
  bindBackdrop(el: HTMLElement | null) { this._backdrop.set(el); }

  /** Whether Escape closes this overlay — see {@link KjOverlayStrategies.closeOnEsc}. */
  get closeOnEsc(): boolean {
    return this.strategies?.closeOnEsc ?? true;
  }

  /**
   * Whether an outside press closes this overlay — see
   * {@link KjOverlayStrategies.closeOnOutside}. With a rendered scrim and no
   * explicit flag, the backdrop strategy's `closeOnClick` decides.
   */
  get closeOnOutside(): boolean {
    const s = this.strategies;
    return s?.closeOnOutside ?? (this._backdrop() ? s?.backdrop?.closeOnClick ?? true : true);
  }

  /**
   * Attaches a strategy bundle. May run more than once for one controller:
   * `KjOverlayBuilder.create()` attaches the config, then the body component
   * it mounts (`kj-dialog`, `kj-drawer`, `kj-sheet`) composes `KjOverlayPanel`,
   * which attaches the same strategy instances again from the per-overlay
   * injector — without the builder's policy flags. So a second bundle is
   * merged over the first: a slot it sets (even to `null`) replaces the
   * previous strategy, which is detached; a flag it leaves `undefined`
   * (`closeOnEsc`, `closeOnOutside`, `returnFocus`, `passive`) keeps its
   * value. Re-attaching an unchanged instance is a no-op for every shipped
   * strategy.
   */
  attachStrategies(s: KjOverlayStrategies): void {
    const prev = this.strategies;
    let next = s;
    if (prev) {
      next = { ...prev };
      for (const [key, value] of Object.entries(s)) {
        if (value !== undefined) (next as unknown as Record<string, unknown>)[key] = value;
      }
      for (const slot of STRATEGY_SLOTS) {
        const old = prev[slot] as KjStrategy | null | undefined;
        if (old && old !== next[slot]) old.detach();
      }
    }
    this.strategies = next;
    for (const slot of STRATEGY_SLOTS) (next[slot] as KjStrategy | null | undefined)?.attach(this.context);
  }

  open(): void {
    const cur = this._state();
    if (cur === 'open' || cur === 'opening') return;
    if (cur === 'closing') {
      // Settle the interrupted close first so every `onOpen` below pairs
      // with the `onClose` it expects: the previous cycle's stack entry,
      // scroll lock and portal wrapper are released, never leaked.
      this.cancelTransition();
      this.finishClose();
    }
    this._closeReason.set(null);
    this._state.set('opening');
    this.beginOpen();
  }

  close(reason: KjCloseReason = 'programmatic'): void {
    const cur = this._state();
    if (cur === 'closed' || cur === 'closing') return;
    if (cur === 'opening') this.cancelTransition();
    this._closeReason.set(reason);
    this._state.set('closing');
    this.beginClose();
  }

  /**
   * Opens a closed overlay, closes an open one (`'trigger'` reason). During
   * the close transition it re-opens — a click on the trigger while the
   * panel is still fading out is a request to bring it back — unless the
   * close was caused by a press outside the panel, in which case the click
   * that follows on the trigger belongs to that same press and is ignored.
   */
  toggle(): void {
    const cur = this._state();
    if (cur === 'closed') { this.open(); return; }
    if (cur === 'closing') {
      const reason = this._closeReason();
      if (!reason || !PRESS_REASONS.has(reason)) this.open();
      return;
    }
    this.close('trigger');
  }

  /**
   * Tears the overlay down synchronously — an open or closing overlay
   * runs its full close chain right away (no transition) — then detaches
   * every strategy. Idempotent; called automatically when the providing
   * injector is destroyed.
   */
  dispose(): void {
    this.cancelTransition();
    if (this._state() !== 'closed') {
      if (this.strategies) this.finishClose();
      else this._state.set('closed');
    }
    this.unwatchPanelFocus();
    if (!this.strategies) return;
    const s = this.strategies;
    for (const slot of [...STRATEGY_SLOTS].reverse() as StrategySlot[]) {
      (s[slot] as KjStrategy | null | undefined)?.detach();
    }
    this.strategies = null;
  }

  private beginOpen(): void {
    if (!this.strategies) return;
    const s = this.strategies;
    this.rememberOpener();
    s.mount.onOpen?.();
    // Un-hide synchronously: the host binding cannot tell a re-open that
    // interrupted a close (open → closing → closed → opening in one task)
    // from no change at all, and the close path hid the panel imperatively.
    this._panel()?.removeAttribute('hidden');
    this.placeBackdrop(false);
    s.position.onOpen?.();
    s.position.update();
    this.stackHandle = this.stack.register(this.id, {
      onClose: (reason) => this.close(reason),
      closeOnEsc: this.closeOnEsc,
      // A scrim owns the outside press (see KjBackdrop); the stack only
      // handles it for overlays that render none.
      closeOnOutside: !this._backdrop() && this.closeOnOutside,
      passive: !!s.passive,
      // A press on the trigger is the trigger strategy's gesture.
      triggerEl: () => this._trigger(),
    });
    this._stackHandle.set(this.stackHandle);
    if (this._panel()) this.stack.markContentEl(this.id, this._panel());
    // Stacking: the panel (and its wrapper, when portalled) take the level
    // the stack just assigned — one above every overlay open right now.
    applyOverlayZIndex(this._panel(), this.stackHandle.zIndex);
    // The backdrop inerts the page behind the panel, so it runs after the
    // mount strategy has put the panel where it will live while open.
    s.backdrop?.onOpen?.();
    s.scrollLock?.onOpen?.();
    s.focusTrap?.onOpen?.();
    s.liveAnnouncer?.onOpen?.();
    s.trigger?.onOpen?.();
    this.watchPanelFocus();
    this.runTransition('open', () => {
      this._state.set('open');
      // Re-anchor once the panel is fully open. `beginOpen` positions it the
      // moment it is un-hidden, which is correct for the common case, but a
      // panel whose open state changes its box (a scale-in transform, a
      // stylesheet that only sizes it under `[data-state="open"]`) is a
      // different size by now, and `flip` / `align` depend on that size.
      s.position.update();
      this.focusInitial();
    });
  }

  private beginClose(): void {
    if (!this.strategies) return;
    this.runTransition('close', () => this.finishClose());
  }

  /**
   * The close chain proper — runs once the close transition ends, or
   * synchronously when the overlay is disposed or re-opened mid-close.
   */
  private finishClose(): void {
    const s = this.strategies;
    if (!s) { this._state.set('closed'); return; }
    s.trigger?.onClose?.();
    s.liveAnnouncer?.onClose?.();
    // The trap's Tab / focusin listeners go first, so the focus moves
    // below are not mistaken for an escape.
    s.focusTrap?.onClose?.();
    clearOverlayZIndex(this._panel());
    this.stackHandle?.unregister();
    this.stackHandle = null;
    this._stackHandle.set(null);
    s.scrollLock?.onClose?.();
    // The backdrop thaws the page before focus returns to it — an inert
    // opener cannot take focus.
    s.backdrop?.onClose?.();
    this.restoreFocus();
    // Hide the panel synchronously before strategy cleanup so the brief
    // moment between position.onClose clearing inline styles and Angular
    // CD applying [hidden] never paints the panel at its default flow
    // position. The host binding re-affirms this value via CD.
    const panel = this._panel();
    if (panel) panel.setAttribute('hidden', '');
    s.position.onClose?.();
    s.mount.onClose?.();
    this.placeBackdrop(true);
    this._state.set('closed');
  }

  /**
   * Keeps the scrim immediately before the panel, wherever the mount
   * strategy has put the panel — the portal wrapper while open, the
   * original parent while closed.
   */
  private placeBackdrop(hidden: boolean): void {
    const backdrop = this._backdrop();
    if (!backdrop) return;
    // Imperative, like the panel's `hidden`: the scrim's own host binding
    // cannot see a re-open that interrupted a close.
    if (hidden) backdrop.setAttribute('hidden', '');
    else backdrop.removeAttribute('hidden');
    const panel = this._panel();
    const parent = panel?.parentNode;
    if (!panel || !parent) return;
    if (backdrop.parentNode !== parent || backdrop.nextSibling !== panel) parent.insertBefore(backdrop, panel);
  }

  private rememberOpener(): void {
    if (!this.isBrowser) return;
    const active = this.document.activeElement as HTMLElement | null;
    const panel = this._panel();
    // Re-opening from inside the panel (a click during the close
    // transition) keeps the original opener.
    if (panel && active && panel.contains(active)) return;
    this.opener = active && active !== this.document.body ? active : null;
  }

  private watchPanelFocus(): void {
    if (!this.isBrowser) return;
    this.unwatchPanelFocus();
    const panel = this._panel();
    if (!panel) return;
    this.focusEntered = panel.contains(this.document.activeElement);
    panel.addEventListener('focusin', this.onPanelFocusIn);
    this.focusWatched = panel;
  }

  private unwatchPanelFocus(): void {
    this.focusWatched?.removeEventListener('focusin', this.onPanelFocusIn);
    this.focusWatched = null;
  }

  private focusInitial(): void {
    if (!this.isBrowser || !this.strategies) return;
    if (this.strategies.focusTrap) {
      this.strategies.focusTrap.focusFirst();
      return;
    }
    const panel = this._panel();
    if (!panel || !FOCUS_ON_OPEN_ROLES.has(panel.getAttribute('role') ?? '')) return;
    focusInitialIn(panel, 'auto');
  }

  private restoreFocus(): void {
    const s = this.strategies;
    const entered = this.focusEntered;
    this.unwatchPanelFocus();
    this.focusEntered = false;
    const opener = this.opener;
    this.opener = null;
    if (!this.isBrowser || !s) return;
    s.focusTrap?.restoreFocus();
    if (s.returnFocus === false || s.focusTrap?.returnFocus === false) return;
    returnFocusFrom(this._panel(), [opener, this._trigger()], entered);
  }

  private runTransition(_kind: 'open' | 'close', done: () => void): void {
    if (!this.isBrowser) { done(); return; }
    const panel = this._panel();
    // `data-state` is a host binding, applied on the next change detection —
    // so the computed styles below would otherwise describe the state the
    // overlay is leaving, not the one it is entering. A stylesheet that
    // declares its duration under `[data-state="closing"]` (the normal
    // pattern) measured 0s and had its animation cut off on the next frame.
    // The value written here is the one CD is about to write anyway.
    if (panel) panel.setAttribute('data-state', this._state());
    const view = this.document.defaultView;
    const reduce = this.reducedMotion.matchesNow();
    const cs = panel && view ? view.getComputedStyle(panel) : null;
    const transitionMs = cs ? longestRunMs(cs.transitionDuration, cs.transitionDelay) : 0;
    const animationMs  = cs ? longestRunMs(cs.animationDuration,  cs.animationDelay)  : 0;
    const longest = Math.max(transitionMs, animationMs);
    if (reduce || longest === 0 || !panel) {
      this.rafId = requestAnimationFrame(() => { this.rafId = 0; done(); });
      return;
    }
    let fired = false;
    const listener = (e: Event) => {
      if (e.target !== panel) return;
      if (fired) return; fired = true;
      panel.removeEventListener('transitionend', listener);
      panel.removeEventListener('animationend', listener);
      this.transitionListener = null;
      done();
    };
    this.transitionListener = listener;
    panel.addEventListener('transitionend', listener);
    panel.addEventListener('animationend', listener);
    // Safety: if event never fires within longest+50ms, force done.
    // `setTimeout` is not a DOM global, so it needs no SSR guard; the cast
    // keeps the field a browser timer id under Node's ambient typings.
    this.transitionDeadline = setTimeout(() => {
      this.transitionDeadline = 0;
      if (!fired) { fired = true; panel.removeEventListener('transitionend', listener); panel.removeEventListener('animationend', listener); this.transitionListener = null; done(); }
    }, longest + 50) as unknown as number;
  }

  private cancelTransition(): void {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
    if (this.transitionDeadline) { clearTimeout(this.transitionDeadline); this.transitionDeadline = 0; }
    if (this.transitionListener && this._panel()) {
      const p = this._panel()!;
      p.removeEventListener('transitionend', this.transitionListener);
      p.removeEventListener('animationend', this.transitionListener);
    }
    this.transitionListener = null;
  }
}
