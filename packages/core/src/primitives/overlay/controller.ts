import { Injectable, computed, inject, signal, type Signal, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { KjOverlayContext } from './context';
import type {
  KjMountStrategy, KjPositionStrategy, KjBackdropStrategy,
  KjFocusTrapStrategy, KjScrollLockStrategy, KjLiveAnnouncerStrategy,
  KjTriggerEventStrategy, KjStrategy,
} from './tokens';
import type { KjOverlayState, KjCloseReason } from './types';
import { KjOverlayStack, type KjOverlayHandle } from './stack';
import { KjId } from './id';

export interface KjOverlayStrategies {
  mount: KjMountStrategy;
  position: KjPositionStrategy;
  trigger: KjTriggerEventStrategy;
  backdrop?: KjBackdropStrategy | null;
  focusTrap?: KjFocusTrapStrategy | null;
  scrollLock?: KjScrollLockStrategy | null;
  liveAnnouncer?: KjLiveAnnouncerStrategy | null;
}

@Injectable()
export class KjOverlayController {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser  = isPlatformBrowser(this.platformId);
  private readonly stack      = inject(KjOverlayStack);
  private readonly idSvc      = inject(KjId);
  readonly id = this.idSvc.mint('overlay');

  private readonly _state     = signal<KjOverlayState>('closed');
  private readonly _trigger   = signal<HTMLElement | null>(null);
  private readonly _panel     = signal<HTMLElement | null>(null);
  readonly state              = this._state.asReadonly();
  readonly isOpen             = computed(() => this._state() === 'open' || this._state() === 'opening');
  readonly triggerEl          = this._trigger.asReadonly();
  readonly panelEl            = this._panel.asReadonly();

  readonly context: KjOverlayContext = {
    state: this.state,
    isOpen: this.isOpen,
    triggerEl: this.triggerEl,
    panelEl: this.panelEl,
    stack: this.stack,
    platform: { isBrowser: this.isBrowser },
    requestClose: (r) => this.close(r),
  };

  private strategies: KjOverlayStrategies | null = null;
  private stackHandle: KjOverlayHandle | null = null;
  private transitionDeadline = 0;
  private rafId = 0;
  private transitionListener: ((e: Event) => void) | null = null;

  bindTrigger(el: HTMLElement | null) { this._trigger.set(el); }
  bindPanel(el: HTMLElement | null)   { this._panel.set(el); }

  attachStrategies(s: KjOverlayStrategies): void {
    this.strategies = s;
    const order: (KjStrategy | null | undefined)[] = [
      s.mount, s.position, s.backdrop, s.scrollLock, s.focusTrap, s.liveAnnouncer, s.trigger,
    ];
    for (const strat of order) strat?.attach(this.context);
  }

  open(): void {
    const cur = this._state();
    if (cur === 'open' || cur === 'opening') return;
    if (cur === 'closing') { this.cancelTransition(); }
    this.beginOpen();
  }

  close(_reason?: KjCloseReason): void {
    const cur = this._state();
    if (cur === 'closed' || cur === 'closing') return;
    if (cur === 'opening') { this.cancelTransition(); }
    this.beginClose();
  }

  toggle(): void { this.isOpen() ? this.close('programmatic') : this.open(); }

  dispose(): void {
    if (this._state() !== 'closed') this.close('programmatic');
    if (!this.strategies) return;
    const s = this.strategies;
    const order: (KjStrategy | null | undefined)[] = [
      s.trigger, s.liveAnnouncer, s.focusTrap, s.scrollLock, s.backdrop, s.position, s.mount,
    ];
    for (const strat of order) strat?.detach();
    this.strategies = null;
  }

  private beginOpen(): void {
    if (!this.strategies) return;
    const s = this.strategies;
    s.mount.onOpen?.();
    s.position.onOpen?.();
    s.position.update();
    s.backdrop?.onOpen?.();
    s.scrollLock?.onOpen?.();
    this.stackHandle = this.stack.register(this.id, { onClose: () => this.close('esc') });
    if (this._panel()) this.stack.markContentEl(this.id, this._panel());
    this._state.set('opening');
    this.runTransition('open', () => {
      this._state.set('open');
      s.focusTrap?.focusFirst();
    });
  }

  private beginClose(): void {
    if (!this.strategies) return;
    const s = this.strategies;
    this._state.set('closing');
    this.runTransition('close', () => {
      s.focusTrap?.restoreFocus();
      this.stackHandle?.unregister();
      this.stackHandle = null;
      s.scrollLock?.onClose?.();
      s.backdrop?.onClose?.();
      s.position.onClose?.();
      s.mount.onClose?.();
      this._state.set('closed');
    });
  }

  private runTransition(_kind: 'open' | 'close', done: () => void): void {
    if (!this.isBrowser) { done(); return; }
    const panel = this._panel();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cs = panel ? getComputedStyle(panel) : null;
    const transitionMs = cs ? parseFloat(cs.transitionDuration) * 1000 : 0;
    const animationMs  = cs ? parseFloat(cs.animationDuration)  * 1000 : 0;
    const longest = Math.max(transitionMs, animationMs);
    if (reduce || longest === 0 || !panel) {
      this.rafId = requestAnimationFrame(done);
      return;
    }
    let fired = false;
    const listener = (e: Event) => {
      if (e.target !== panel) return;
      if (fired) return; fired = true;
      panel.removeEventListener('transitionend', listener);
      panel.removeEventListener('animationend', listener);
      done();
    };
    this.transitionListener = listener;
    panel.addEventListener('transitionend', listener);
    panel.addEventListener('animationend', listener);
    // Safety: if event never fires within longest+50ms, force done.
    this.transitionDeadline = window.setTimeout(() => {
      if (!fired) { fired = true; panel.removeEventListener('transitionend', listener); panel.removeEventListener('animationend', listener); done(); }
    }, longest + 50);
  }

  private cancelTransition(): void {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
    if (this.transitionDeadline) { clearTimeout(this.transitionDeadline); this.transitionDeadline = 0; }
    if (this.transitionListener && this._panel()) {
      const p = this._panel()!;
      p.removeEventListener('transitionend', this.transitionListener);
      p.removeEventListener('animationend', this.transitionListener);
      this.transitionListener = null;
    }
  }
}
