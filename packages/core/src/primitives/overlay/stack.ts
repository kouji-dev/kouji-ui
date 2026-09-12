import { Injectable, InjectionToken, PLATFORM_ID, computed, inject, signal, type Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface KjOverlayRegistration {
  onClose: () => void;
  closeOnOutside?: boolean;
  closeOnEsc?: boolean;
}

export interface KjOverlayStackHandle {
  unregister: () => void;
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
  opts: Required<KjOverlayRegistration>;
  contentEl: HTMLElement | null;
  zIndex: number;
}

/** Default `z-index` of the first (outermost) open overlay. */
export const KJ_OVERLAY_Z_BASE_DEFAULT = 1000;

/**
 * Base `z-index` of the overlay stack — the level the first open overlay
 * gets; each nested overlay opened on top of it gets the next integer up.
 * Override per app via DI, or at runtime with `--kj-overlay-z-base` on
 * `:root` (the CSS custom property wins when both are set).
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
 * routing, outside-click detection, and z-index stacking. Only the topmost
 * overlay receives Esc / outside-click — prevents the double-close problem.
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
 * `KJ_OVERLAY_Z_BASE` (DI) or `--kj-overlay-z-base` on `:root`. Toasts are
 * not part of the stack — they live in their own layer above it
 * (`--kj-toast-z-index`, default `2000`).
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
  private readonly _stack = signal<StackEntry[]>([]);

  private _listenersInstalled = false;
  private readonly _onKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
  private readonly _onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);

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
      },
      contentEl: null,
      zIndex: this.nextZIndex,
    };
    this._stack.update(s => [...s, entry]);
    this.ensureListeners();
    const isTopmost = computed(() => {
      const s = this._stack();
      return s.length > 0 && s[s.length - 1].id === id;
    });
    return {
      unregister: () => {
        this._stack.update(s => s.filter(e => e !== entry));
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
   * Base level of the stack: `--kj-overlay-z-base` on `:root` when it holds
   * a number, otherwise the `KJ_OVERLAY_Z_BASE` token (default `1000`).
   */
  get baseZIndex(): number {
    if (this.isBrowser && typeof getComputedStyle === 'function') {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--kj-overlay-z-base').trim();
      const n = raw === '' ? NaN : Number(raw);
      if (Number.isFinite(n)) return n;
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
    document.addEventListener('keydown', this._onKeydown, true);
    document.addEventListener('pointerdown', this._onPointerDown, true);
    this._listenersInstalled = true;
  }

  private maybeRemoveListeners(): void {
    if (this._stack().length > 0 || !this._listenersInstalled) return;
    document.removeEventListener('keydown', this._onKeydown, true);
    document.removeEventListener('pointerdown', this._onPointerDown, true);
    this._listenersInstalled = false;
  }

  private topmost(): StackEntry | null {
    const s = this._stack();
    return s.length ? s[s.length - 1] : null;
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    const top = this.topmost();
    if (!top || !top.opts.closeOnEsc) return;
    top.opts.onClose();
  }

  private handlePointerDown(e: PointerEvent): void {
    const top = this.topmost();
    if (!top || !top.opts.closeOnOutside) return;
    const target = e.target as Node | null;
    // A node that is no longer in the document is not "outside" — it is
    // gone. `contains()` reports false for it just like it would for a
    // genuine outside click, which would dismiss the overlay on a gesture
    // that started inside it and whose target was re-rendered away.
    if (target && !target.isConnected) return;
    if (top.contentEl && target && top.contentEl.contains(target)) return;
    top.opts.onClose();
  }
}
