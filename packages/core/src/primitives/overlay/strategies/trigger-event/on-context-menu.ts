import { isSignal, type Signal } from '@angular/core';
import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

type Reactive<T> = T | Signal<T> | (() => T);
const read = <T>(v: Reactive<T> | undefined, fallback: T): T => {
  if (v === undefined) return fallback;
  if (isSignal(v)) return v();
  if (typeof v === 'function') return (v as () => T)();
  return v;
};

export interface KjOnContextMenuOpts {
  longPressMs?: Reactive<number>;
}

export type KjOnContextMenuStrategy = KjTriggerEventStrategy & {
  configure(opts: Partial<KjOnContextMenuOpts>): void;
};

export function onContextMenu(initialOpts: Partial<KjOnContextMenuOpts> = {}): KjOnContextMenuStrategy {
  let opts: Partial<KjOnContextMenuOpts> = { ...initialOpts };
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let onCtx: ((e: MouseEvent) => void) | null = null;
  let onKey: ((e: KeyboardEvent) => void) | null = null;
  let onTouchStart: ((e: TouchEvent) => void) | null = null;
  let onTouchEnd: (() => void) | null = null;
  let touchTimer = 0;

  const wire = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = ctx.triggerEl();
    if (!trigger || onCtx) return;

    onCtx = (e: MouseEvent) => { e.preventDefault(); toggle?.(); };
    onKey = (e: KeyboardEvent) => { if (e.key === 'F10' && e.shiftKey) { e.preventDefault(); toggle?.(); } };
    onTouchStart = (_e: TouchEvent) => { touchTimer = setTimeout(() => { toggle?.(); touchTimer = 0; }, read(opts.longPressMs, 500)) as unknown as number; };
    onTouchEnd = () => { if (touchTimer) { clearTimeout(touchTimer); touchTimer = 0; } };

    trigger.addEventListener('contextmenu', onCtx);
    trigger.addEventListener('keydown', onKey);
    trigger.addEventListener('touchstart', onTouchStart);
    trigger.addEventListener('touchend', onTouchEnd);
    trigger.addEventListener('touchcancel', onTouchEnd);
  };

  return {
    ariaHasPopup: 'menu',
    attach(c) { ctx = c; wire(); },
    bindToggle(t) { toggle = t; wire(); },
    onOpen() {}, onClose() {},
    detach() {
      const trigger = ctx?.triggerEl();
      if (trigger) {
        if (onCtx) trigger.removeEventListener('contextmenu', onCtx);
        if (onKey) trigger.removeEventListener('keydown', onKey);
        if (onTouchStart) trigger.removeEventListener('touchstart', onTouchStart);
        if (onTouchEnd) {
          trigger.removeEventListener('touchend', onTouchEnd);
          trigger.removeEventListener('touchcancel', onTouchEnd);
        }
      }
      if (touchTimer) clearTimeout(touchTimer);
      onCtx = onKey = onTouchStart = onTouchEnd = null; touchTimer = 0;
      toggle = null; ctx = null;
    },
    configure(newOpts) { opts = { ...opts, ...newOpts }; },
  };
}
