import {
  DestroyRef,
  ElementRef,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  KJ_TOOLTIP_BUILTIN_DEFAULTS,
  KJ_TOOLTIP_DEFAULTS,
  KJ_TOOLTIP_GROUP,
  type KjTooltipDefaults,
  type KjTooltipGroupContext,
} from './tooltip.context';

/** Trigger element ElementRef used by the controller. */
type TriggerElementRef = ElementRef<HTMLElement>;

let _tooltipIdCounter = 0;

/** Allocates a stable tooltip id used for `aria-describedby` wiring. */
export function nextTooltipId(): string {
  return `kj-tooltip-${++_tooltipIdCounter}`;
}

/**
 * Per-trigger configuration consumed by {@link KjTooltipController}. Each
 * trigger directive (shorthand or compound) provides one of these — the
 * controller does not read directive inputs directly, so the same controller
 * shape works for both shorthand and compound directives.
 */
export interface KjTooltipTriggerConfig {
  /** Disabled flag; when true the controller never opens. */
  disabled: () => boolean;
  /** Effective open-delay (resolved to default if unset). */
  openDelayMs: () => number;
  /** Effective close-delay. */
  closeDelayMs: () => number;
  /** Effective touch-gestures mode. */
  touchGestures: () => 'auto' | 'on' | 'off';
  /** Effective touch hold duration. */
  touchHoldMs: () => number;
  /** Called after the tooltip transitions to open. Used by directives to mount the portal. */
  onOpen: () => void;
  /** Called after the tooltip transitions to closed. Used to dispose the portal. */
  onClose: () => void;
}

/**
 * Shared timer + state machine for both the shorthand and compound tooltip
 * shapes. Owns:
 *
 * - Open-delay / close-delay / skip-delay timers
 * - The `open` signal exposed back to the directive
 * - Group skip-delay coordination via {@link KJ_TOOLTIP_GROUP}
 * - The trigger's native `title` attribute strip (and restore on destroy)
 * - Touch long-press detection
 *
 * Created via Angular DI inside the trigger directive's injector. The
 * directive calls {@link configure} once with its element + config callbacks,
 * then routes its host events to {@link onPointerEnter}, {@link onPointerLeave},
 * {@link onFocus}, etc.
 *
 * @internal
 */
@Injectable()
export class KjTooltipController {
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly group = inject<KjTooltipGroupContext>(KJ_TOOLTIP_GROUP);
  private readonly userDefaults = inject<KjTooltipDefaults | null>(
    KJ_TOOLTIP_DEFAULTS,
    { optional: true },
  );
  private readonly triggerEl = inject<TriggerElementRef>(ElementRef);

  /** Effective defaults: user-provided values merged over the built-in defaults. */
  readonly defaults: Required<KjTooltipDefaults> = {
    ...KJ_TOOLTIP_BUILTIN_DEFAULTS,
    ...(this.userDefaults ?? {}),
  };

  /** Stable tooltip id for `aria-describedby`. Allocated up-front so the
   *  trigger can wire `aria-describedby` *before* the tooltip is visible
   *  (per the WAI-ARIA spec — AT scans the attribute on focus, not on show). */
  readonly tooltipId = nextTooltipId();

  private readonly _open = signal(false);
  /** Reactive open-state — true while the tooltip is visible. */
  readonly open = this._open.asReadonly();

  private cfg: KjTooltipTriggerConfig | undefined;
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private touchTimer: ReturnType<typeof setTimeout> | undefined;

  /** Stored title attribute that we stripped on configure(); restored on destroy. */
  private savedTitle: string | null = null;

  /** Whether the cursor is currently on the trigger or content (for hoverable contract). */
  private pointerOnTrigger = false;
  private pointerOnContent = false;

  /** Whether the trigger currently has keyboard focus. */
  private focused = false;

  constructor() {
    this.stripTitle(this.triggerEl.nativeElement);
    this.destroyRef.onDestroy(() => {
      this.clearAllTimers();
      this.restoreTitle();
      if (this._open()) {
        this._open.set(false);
        try { this.cfg?.onClose(); } catch { /* ignore */ }
        this.group.notifyClosed();
      }
    });
  }

  /** Wire the controller to its config providers. Call once from the trigger directive. */
  configure(cfg: KjTooltipTriggerConfig): void {
    this.cfg = cfg;
  }

  /**
   * The trigger element used for positioning math.
   *
   * If the host element renders with `display: contents` (common for thin
   * wrappers), it produces no box and `getBoundingClientRect()` returns
   * `0,0,0,0` — which would pin the floating panel to the top-left corner.
   * Fall back to the first descendant element with a real box.
   */
  get triggerElement(): HTMLElement {
    const host = this.triggerEl.nativeElement;
    if (typeof window === 'undefined') return host;
    const cs = getComputedStyle(host);
    if (cs.display !== 'contents') return host;
    let cur: Element | null = host.firstElementChild;
    while (cur) {
      const childCs = getComputedStyle(cur as HTMLElement);
      if (childCs.display !== 'contents' && (cur as HTMLElement).offsetParent !== null) return cur as HTMLElement;
      cur = cur.firstElementChild ?? cur.nextElementSibling;
    }
    return host;
  }

  /** Mark that pointer-content state changed (called from `[kjTooltipContent]`). */
  setPointerOnContent(value: boolean): void {
    this.pointerOnContent = value;
    if (value) {
      this.cancelClose();
    } else {
      this.scheduleClose();
    }
  }

  // ── Trigger event entrypoints ────────────────────────────────────────

  onPointerEnter(): void {
    this.pointerOnTrigger = true;
    this.cancelClose();
    this.scheduleOpen();
  }

  onPointerLeave(): void {
    this.pointerOnTrigger = false;
    this.cancelOpen();
    this.scheduleClose();
  }

  onFocus(): void {
    this.focused = true;
    this.cancelClose();
    this.scheduleOpen();
  }

  onBlur(): void {
    this.focused = false;
    this.cancelOpen();
    // Focus loss closes immediately — no delay. Keeps focus-driven behaviour
    // crisp; matches Material's MatTooltip blur.
    this.closeImmediate();
  }

  onTouchStart(): void {
    if (!this.shouldHandleTouch()) return;
    if (!this.cfg) return;
    this.clearTouchTimer();
    const hold = this.cfg.touchHoldMs();
    this.touchTimer = setTimeout(() => {
      this.touchTimer = undefined;
      this.openImmediate();
    }, hold);
  }

  onTouchEnd(): void {
    this.clearTouchTimer();
  }

  onTouchCancel(): void {
    this.clearTouchTimer();
  }

  /** Programmatic open — skips the open-delay. */
  openImmediate(): void {
    this.cancelOpen();
    this.cancelClose();
    if (this.cfg?.disabled()) return;
    if (this._open()) return;
    this._open.set(true);
    this.cfg?.onOpen();
    this.group.notifyOpened();
  }

  /** Programmatic close — fires immediately. */
  closeImmediate(): void {
    this.cancelOpen();
    this.cancelClose();
    if (!this._open()) return;
    this._open.set(false);
    this.cfg?.onClose();
    this.group.notifyClosed();
  }

  // ── Internals ────────────────────────────────────────────────────────

  private scheduleOpen(): void {
    if (!this.cfg || this.cfg.disabled()) return;
    if (this._open()) return;
    if (this.openTimer !== undefined) return;

    const delay = this.skipOpenDelay() ? 0 : this.cfg.openDelayMs();
    if (delay <= 0) {
      this.openImmediate();
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      // Re-check guards after the timer fires — the user may have moved
      // away, focused away, or set disabled in the meantime.
      if (!this.cfg || this.cfg.disabled()) return;
      if (!this.pointerOnTrigger && !this.focused) return;
      this.openImmediate();
    }, delay);
  }

  private scheduleClose(): void {
    if (!this.cfg) return;
    if (!this._open()) {
      // If we have a pending open and the user already left, drop it.
      this.cancelOpen();
      return;
    }
    if (this.closeTimer !== undefined) return;
    if (this.pointerOnTrigger || this.pointerOnContent || this.focused) return;

    const delay = this.cfg.closeDelayMs();
    if (delay <= 0) {
      this.closeImmediate();
      return;
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      if (this.pointerOnTrigger || this.pointerOnContent || this.focused) return;
      this.closeImmediate();
    }, delay);
  }

  private cancelOpen(): void {
    if (this.openTimer !== undefined) {
      clearTimeout(this.openTimer);
      this.openTimer = undefined;
    }
  }

  private cancelClose(): void {
    if (this.closeTimer !== undefined) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
  }

  private clearTouchTimer(): void {
    if (this.touchTimer !== undefined) {
      clearTimeout(this.touchTimer);
      this.touchTimer = undefined;
    }
  }

  private clearAllTimers(): void {
    this.cancelOpen();
    this.cancelClose();
    this.clearTouchTimer();
  }

  private skipOpenDelay(): boolean {
    const last = this.group.lastVisibleAt();
    if (last <= 0) return false;
    return Date.now() - last < this.defaults.skipDelayMs;
  }

  private shouldHandleTouch(): boolean {
    if (!this.cfg) return false;
    if (!isPlatformBrowser(this.platformId)) return false;
    const mode = this.cfg.touchGestures();
    if (mode === 'off') return false;
    if (mode === 'on') return true;
    // 'auto' — only handle when the device is a coarse pointer.
    try {
      return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  }

  private stripTitle(el: HTMLElement): void {
    if (!el.hasAttribute('title')) return;
    const value = el.getAttribute('title') ?? '';
    if (value === '') {
      // Empty `title=""` — just remove. Nothing meaningful to restore.
      el.removeAttribute('title');
      return;
    }
    this.savedTitle = value;
    el.removeAttribute('title');
  }

  private restoreTitle(): void {
    if (this.savedTitle === null) return;
    try {
      this.triggerEl.nativeElement.setAttribute('title', this.savedTitle);
    } catch {
      /* element may already be detached — ignore */
    }
    this.savedTitle = null;
  }
}
