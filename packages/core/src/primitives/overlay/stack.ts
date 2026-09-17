import { Injectable, InjectionToken, PLATFORM_ID, computed, inject, signal, type Signal } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { KJ_OVERLAY_CONTAINER } from './container';
import { KjDismissPress } from './dismiss-press';
import type { KjCloseReason } from './types';

/** What an overlay tells `KjOverlayStack` when it registers: how it dismisses, and what counts as outside. */
export interface KjOverlayRegistration {
  /**
   * Called when the stack dismisses the overlay: `'escape'` for the Escape
   * key, `'outside'` for a press outside the overlay's content element.
   */
  onClose: (reason: KjCloseReason) => void;
  /** Dismiss on a press outside the content element. Default `true`. */
  closeOnOutside?: boolean;
  /** Dismiss on Escape. Default `true`. */
  closeOnEsc?: boolean;
  /**
   * The overlay's trigger element, read per event. A press that begins on
   * it is the trigger strategy's own gesture (toggle, open-only tap), never
   * an outside press — so a hover popover's touch fallback keeps it open
   * and a click trigger closes with the `'trigger'` reason, not `'outside'`.
   */
  triggerEl?: () => HTMLElement | null;
  /**
   * A passive overlay takes a stack level (it paints above everything open
   * when it registers) but never owns a gesture: Escape and outside presses
   * go to the nearest non-passive overlay beneath it, which stays
   * `isTopmost`. Toasts register this way, so a toast showing over a dialog
   * neither swallows the dialog's Escape nor its scrim press. Default
   * `false`.
   */
  passive?: boolean;
}

/** Returned by `KjOverlayStack.register()` — the overlay's live stack position and its unregister hook. */
export interface KjOverlayStackHandle {
  unregister: () => void;
  /** Whether this overlay owns gestures right now: no non-passive overlay is open above it. Always `false` for a passive entry. */
  isTopmost: Signal<boolean>;
  /**
   * `z-index` assigned to this overlay when it registered — strictly above
   * every overlay that was open at that moment. Stable for the overlay's
   * lifetime: a later overlay never sinks below an earlier one.
   */
  readonly zIndex: number;
}

interface StackEntry {
  id: string;
  opts: Required<Omit<KjOverlayRegistration, 'triggerEl'>> & Pick<KjOverlayRegistration, 'triggerEl'>;
  contentEl: HTMLElement | null;
  zIndex: number;
}

/** Default `z-index` of the first (outermost) open overlay. */
export const KJ_OVERLAY_Z_BASE_DEFAULT = 1000;

/**
 * Base `z-index` of the overlay stack — the level the first open overlay
 * gets; each nested overlay opened on top of it gets the next integer up.
 * Provide it per app via DI; it wins over the stylesheet. While it is left at
 * its default, `--kj-overlay-z-base` resolved on the overlay container (so a
 * value declared on `:root` or on the container itself) is used instead.
 */
export const KJ_OVERLAY_Z_BASE = new InjectionToken<number>('KJ_OVERLAY_Z_BASE', {
  providedIn: 'root',
  factory: () => KJ_OVERLAY_Z_BASE_DEFAULT,
});

/**
 * CSS custom property every overlay panel / backdrop reads as
 * `z-index: var(--kj-overlay-z, <default>)`. Written by
 * {@link applyOverlayZIndex} on open and removed on close.
 */
export const KJ_OVERLAY_Z_VAR = '--kj-overlay-z';

/**
 * Writes the stack-assigned `z-index` for one overlay to the DOM: the panel
 * receives `--kj-overlay-z` (so its component CSS resolves the level), and
 * when the panel sits inside a `.kj-overlay-wrapper` the wrapper receives
 * the same custom property plus an inline `z-index`. Giving the wrapper the
 * `z-index` turns it into one stacking context per overlay, so a backdrop
 * and its panel move as a unit and a nested overlay's wrapper always paints
 * above its opener's — regardless of the fixed `z-index` each component's
 * stylesheet declares.
 */
export function applyOverlayZIndex(panel: HTMLElement | null, zIndex: number): void {
  if (!panel) return;
  const z = String(zIndex);
  panel.style.setProperty(KJ_OVERLAY_Z_VAR, z);
  const wrapper = panel.parentElement;
  if (wrapper?.classList.contains('kj-overlay-wrapper')) {
    wrapper.style.setProperty(KJ_OVERLAY_Z_VAR, z);
    wrapper.style.zIndex = z;
  }
}

/** Reverses {@link applyOverlayZIndex} — call before the panel leaves its wrapper. */
export function clearOverlayZIndex(panel: HTMLElement | null): void {
  if (!panel) return;
  panel.style.removeProperty(KJ_OVERLAY_Z_VAR);
  const wrapper = panel.parentElement;
  if (wrapper?.classList.contains('kj-overlay-wrapper')) {
    wrapper.style.removeProperty(KJ_OVERLAY_Z_VAR);
    wrapper.style.removeProperty('z-index');
  }
}

/**
 * Global coordinator for nested-overlay behaviour: stack ordering, Escape
 * routing, outside-press detection, and z-index stacking. Only the topmost
 * overlay receives Esc / outside-press — prevents the double-close problem.
 *
 * **Outside press.** An overlay without a scrim is dismissed by a press that
 * begins outside its content element and ends as a `click` — the same rule
 * `KjBackdrop` applies through {@link KjDismissPress}, so a press that began
 * inside an overlay stacked above (an option re-rendered away on commit) is
 * never mistaken for a dismissal of the one below. A secondary-button press
 * dismisses on the down event, because no click follows it. Overlays with a
 * scrim register `closeOnOutside: false`: the scrim owns their outside press.
 * An entry that never marked a content element is not dismissed this way,
 * and a press on the overlay's own trigger element belongs to the trigger
 * strategy (see {@link KjOverlayRegistration.triggerEl}).
 *
 * **Close policy.** `closeOnEsc` / `closeOnOutside` arrive from the
 * controller (`KjOverlayStrategies`, so `KjOverlayBuilderConfig`); an
 * `alertdialog` launched through the builder defaults both to `false`. The
 * dismissal reason reaches `onClose` — `'escape'` or `'outside'` — and the
 * controller records it as `closeReason`.
 *
 * **Stacking.** Every overlay registers here when it opens and receives a
 * `z-index` one above the highest overlay open at that moment (the first
 * one gets the base, `1000` by default). The controller writes it to the
 * panel and its wrapper as `--kj-overlay-z`, and every overlay stylesheet
 * in the kit reads `z-index: var(--kj-overlay-z, …)`, so a select opened
 * inside a command palette, a popover inside a dialog, or a dialog opened
 * from a palette always paints above its opener. Closing an overlay pops it
 * off the stack; the ones left keep their level, and the next overlay opens
 * one above whatever is still open. Change the base app-wide with
 * `KJ_OVERLAY_Z_BASE` (DI, wins) or `--kj-overlay-z-base` on `:root` (read
 * while the token is at its default). The DI token wins so an app's explicit
 * choice is never overruled by a stylesheet it does not own; two
 * independently bootstrapped apps sharing one document (micro-frontends) are
 * not a supported target — they share this service's document listeners and
 * container, so their stacks cannot be isolated. Only the queued toasts rendered by
 * `<kj-toast-viewport>` live outside the stack, in their own layer above it
 * (`--kj-toast-z-index`, default `2000`); a toast opened through
 * `KjOverlayBuilder` is stacked like any other overlay — passively, so it
 * never takes a gesture — and a dialog opened after it paints above it.
 *
 * SSR-safe: every DOM access guarded by isPlatformBrowser.
 *
 * @doc-category Core/Overlay
 * @doc
 * @doc-name overlay-stack
 * @doc-is-main
 * @doc-description Routes Escape and outside-click to only the topmost overlay when overlays are nested, and stacks each nested overlay above its opener.
 */
@Injectable({ providedIn: 'root' })
export class KjOverlayStack {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly configuredBase = inject(KJ_OVERLAY_Z_BASE);
  private readonly container = inject(KJ_OVERLAY_CONTAINER);
  private readonly document = inject(DOCUMENT);
  private readonly _stack = signal<StackEntry[]>([]);

  private _listenersInstalled = false;
  private readonly _onKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
  private readonly _onPointerDown = (e: MouseEvent) => this.handlePointerDown(e);
  private readonly _onClick = (e: MouseEvent) => this.handleClick(e);
  /** The outside press in flight, armed on the down event for the entry that was topmost then. */
  private readonly press = new KjDismissPress();
  private pressEntry: StackEntry | null = null;

  register(id: string, opts: KjOverlayRegistration): KjOverlayStackHandle {
    if (!this.isBrowser) {
      return { unregister: () => {}, isTopmost: computed(() => false), zIndex: this.configuredBase };
    }
    const entry: StackEntry = {
      id,
      opts: {
        onClose: opts.onClose,
        closeOnEsc: opts.closeOnEsc ?? true,
        closeOnOutside: opts.closeOnOutside ?? true,
        passive: opts.passive ?? false,
        triggerEl: opts.triggerEl,
      },
      contentEl: null,
      zIndex: this.nextZIndex,
    };
    this._stack.update(s => [...s, entry]);
    this.ensureListeners();
    const isTopmost = computed(() => !entry.opts.passive && this.topmostOf(this._stack()) === entry);
    return {
      unregister: () => {
        this._stack.update(s => s.filter(e => e !== entry));
        if (this.pressEntry === entry) { this.pressEntry = null; this.press.reset(); }
        this.maybeRemoveListeners();
      },
      isTopmost,
      zIndex: entry.zIndex,
    };
  }

  markContentEl(id: string, el: HTMLElement | null): void {
    if (!this.isBrowser) return;
    const entry = this._stack().find(e => e.id === id);
    if (entry) entry.contentEl = el;
  }

  get stackSize(): number { return this._stack().length; }

  /** `z-index` of a registered overlay, or `null` when `id` is not open. */
  zIndexOf(id: string): number | null {
    return this._stack().find(e => e.id === id)?.zIndex ?? null;
  }

  /**
   * Base level of the stack: the `KJ_OVERLAY_Z_BASE` token when an app
   * provided it; otherwise `--kj-overlay-z-base` as resolved on the overlay
   * container (declared there or inherited from `:root`) when it holds a
   * number, else the default `1000`.
   */
  get baseZIndex(): number {
    if (this.configuredBase !== KJ_OVERLAY_Z_BASE_DEFAULT) return this.configuredBase;
    const view = this.document.defaultView;
    if (this.isBrowser && typeof view?.getComputedStyle === 'function') {
      // The container inherits a `:root` declaration in a browser; the
      // document element is read as well for engines that do not resolve
      // inherited custom properties.
      for (const el of [this.container(), this.document.documentElement]) {
        if (!el) continue;
        const raw = view.getComputedStyle(el).getPropertyValue('--kj-overlay-z-base').trim();
        const n = raw === '' ? NaN : Number(raw);
        if (Number.isFinite(n)) return n;
      }
    }
    return this.configuredBase;
  }

  /** The level the next overlay to open will receive: one above the topmost open one, or the base. */
  get nextZIndex(): number {
    const s = this._stack();
    if (s.length === 0) return this.baseZIndex;
    let max = -Infinity;
    for (const e of s) if (e.zIndex > max) max = e.zIndex;
    return max + 1;
  }

  private ensureListeners(): void {
    if (this._listenersInstalled) return;
    this.document.addEventListener('keydown', this._onKeydown, true);
    this.document.addEventListener('pointerdown', this._onPointerDown, true);
    this.document.addEventListener('mousedown', this._onPointerDown, true);
    this.document.addEventListener('click', this._onClick, true);
    this._listenersInstalled = true;
  }

  private maybeRemoveListeners(): void {
    if (this._stack().length > 0 || !this._listenersInstalled) return;
    this.document.removeEventListener('keydown', this._onKeydown, true);
    this.document.removeEventListener('pointerdown', this._onPointerDown, true);
    this.document.removeEventListener('mousedown', this._onPointerDown, true);
    this.document.removeEventListener('click', this._onClick, true);
    this._listenersInstalled = false;
    this.press.reset();
    this.pressEntry = null;
  }

  /** The highest non-passive entry — the one that owns gestures. */
  private topmostOf(s: readonly StackEntry[]): StackEntry | null {
    for (let i = s.length - 1; i >= 0; i--) if (!s[i].opts.passive) return s[i];
    return null;
  }

  private topmost(): StackEntry | null {
    return this.topmostOf(this._stack());
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    const top = this.topmost();
    if (!top || !top.opts.closeOnEsc) return;
    top.opts.onClose('escape');
  }

  /** Is `target` a press outside `entry`'s content — a candidate dismissal? */
  private isOutside(entry: StackEntry, target: Node | null): boolean {
    // An entry with no content element has nothing to be outside of (a
    // builder overlay that mounted no component): never dismissed this way.
    if (!entry.contentEl) return false;
    // A node that is no longer in the document is not "outside" — it is
    // gone. `contains()` reports false for it just like it would for a
    // genuine outside click, which would dismiss the overlay on a gesture
    // that started inside it and whose target was re-rendered away.
    if (target && !target.isConnected) return false;
    if (target && entry.contentEl.contains(target)) return false;
    // The trigger is the overlay's own surface: its strategy owns the press.
    const trigger = entry.opts.triggerEl?.();
    if (target && trigger && trigger.contains(target)) return false;
    return true;
  }

  private handlePointerDown(e: MouseEvent): void {
    this.press.reset();
    this.pressEntry = null;
    const top = this.topmost();
    if (!top || !top.opts.closeOnOutside) return;
    if (!this.isOutside(top, e.target as Node | null)) return;
    // A secondary button never produces a `click`: dismiss on the down event.
    if (e.button > 0) { top.opts.onClose('outside'); return; }
    this.press.arm();
    this.pressEntry = top;
  }

  private handleClick(e: MouseEvent): void {
    const began = this.pressEntry;
    this.pressEntry = null;
    const owns = this.press.owns(e);
    const top = this.topmost();
    if (!top || !top.opts.closeOnOutside) return;
    if (!this.isOutside(top, e.target as Node | null)) return;
    if (!owns) return;
    // A pointer press that began while another overlay owned the gesture
    // (it closed under the pointer) is not aimed at this one.
    if (e.detail !== 0 && began !== top) return;
    top.opts.onClose('outside');
  }
}
