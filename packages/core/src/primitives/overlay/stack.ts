import { Injectable, PLATFORM_ID, computed, inject, signal, type Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface KjOverlayRegistration {
  onClose: () => void;
  closeOnOutside?: boolean;
  closeOnEsc?: boolean;
}

export interface KjOverlayStackHandle {
  unregister: () => void;
  isTopmost: Signal<boolean>;
}

interface StackEntry {
  id: string;
  opts: Required<KjOverlayRegistration>;
  contentEl: HTMLElement | null;
}

/**
 * Global coordinator for nested-overlay behaviour: stack ordering, Escape
 * routing, and outside-click detection. Only the topmost overlay receives
 * Esc / outside-click — prevents the double-close problem.
 *
 * SSR-safe: every DOM access guarded by isPlatformBrowser.
 *
 * @category Core/Overlay
 * @doc
 * @doc-name overlay-stack
 * @doc-is-main
 * @doc-description Coordinates nested overlays so only the topmost receives Escape and outside-click, preventing the double-close problem when dialogs, popovers, and menus stack.
 */
@Injectable({ providedIn: 'root' })
export class KjOverlayStack {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly _stack = signal<StackEntry[]>([]);

  private _listenersInstalled = false;
  private readonly _onKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
  private readonly _onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);

  register(id: string, opts: KjOverlayRegistration): KjOverlayStackHandle {
    if (!this.isBrowser) {
      return { unregister: () => {}, isTopmost: computed(() => false) };
    }
    const entry: StackEntry = {
      id,
      opts: {
        onClose: opts.onClose,
        closeOnEsc: opts.closeOnEsc ?? true,
        closeOnOutside: opts.closeOnOutside ?? true,
      },
      contentEl: null,
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
    };
  }

  markContentEl(id: string, el: HTMLElement | null): void {
    if (!this.isBrowser) return;
    const entry = this._stack().find(e => e.id === id);
    if (entry) entry.contentEl = el;
  }

  get stackSize(): number { return this._stack().length; }

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
    if (top.contentEl && target && top.contentEl.contains(target)) return;
    top.opts.onClose();
  }
}
