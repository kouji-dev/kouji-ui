import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  Signal,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjOverlayService } from '../primitives/overlay/overlay';
import {
  KJ_POPOVER_BUILTIN_DEFAULTS,
  KJ_POPOVER_DEFAULTS,
  type KjAutoFocusEvent,
  type KjPopoverCloseEvent,
  type KjPopoverCloseReason,
  type KjPopoverDefaults,
  createAutoFocusEvent,
  createCloseEvent,
  nextPopoverId,
} from './popover.context';

/** Selector used to discover the first focusable element inside a panel. */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Per-popover host wiring consumed by {@link KjPopoverController}.
 *
 * @internal
 */
export interface KjPopoverHostConfig {
  emitOpenChange: (open: boolean) => void;
  emitCloseRequested: (event: KjPopoverCloseEvent) => void;
  emitOpenAutoFocus: (event: KjAutoFocusEvent) => void;
  emitCloseAutoFocus: (event: KjAutoFocusEvent) => void;
}

/**
 * Shared state machine for the popover family. Owns the reactive `open`
 * signal, the cancellable close cycle, focus capture / restore, stack
 * registration with `KjOverlayService`, and the optional body scroll-lock
 * applied when modal.
 *
 * Created via Angular DI inside the host directive's injector
 * (`[kjPopover]` for compound shape, `[kjPopoverTrigger]` with
 * `[kjPopoverTriggerFor]` for the flat shape). Both shapes share the same
 * controller — only the host bridge to outputs differs.
 *
 * The content directive (`[kjPopoverContent]`) reacts to `open()` to mount
 * its own template via `KjOverlayService.createFromTemplate`; the
 * controller does not own the overlay ref directly, only the lifecycle
 * coordination around mount-and-focus.
 *
 * @internal
 */
@Injectable()
export class KjPopoverController {
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlay = inject(KjOverlayService);
  private readonly userDefaults = inject<KjPopoverDefaults | null>(
    KJ_POPOVER_DEFAULTS,
    { optional: true },
  );

  /** Effective defaults: user-provided values merged over the built-in ones. */
  readonly defaults: Required<KjPopoverDefaults> = {
    ...KJ_POPOVER_BUILTIN_DEFAULTS,
    ...(this.userDefaults ?? {}),
  };

  /** Stable id used as `aria-controls` on the trigger and `id` on the panel. */
  readonly popoverId = nextPopoverId();

  private readonly _open = signal(false);
  /** Reactive open state. */
  readonly open = this._open.asReadonly();

  private readonly _titleId = signal<string | null>(null);
  /** The id of the projected `[kjPopoverTitle]`, or `null` when none. */
  readonly titleId = this._titleId.asReadonly();

  private readonly _trigger = signal<HTMLElement | null>(null);
  /** The captured trigger element. */
  readonly triggerElement: Signal<HTMLElement | null> = this._trigger.asReadonly();

  private readonly _modal = signal(false);
  /** The current modality (mirrors `[kjPopoverContent].kjModal()`). */
  readonly modal = this._modal.asReadonly();

  /** The mounted panel element while open. */
  private panelEl: HTMLElement | null = null;

  /** The element to restore focus to on close. */
  private focusRestoreTarget: HTMLElement | null = null;

  private cfg: KjPopoverHostConfig | undefined;
  private overlayHandle: ReturnType<KjOverlayService['register']> | undefined;
  private releaseScrollLock: (() => void) | undefined;
  private suppressNotify = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.tearDownStack();
      if (this._open()) {
        this._open.set(false);
      }
    });
  }

  configure(cfg: KjPopoverHostConfig): void {
    this.cfg = cfg;
  }

  // ── Trigger / title / modal registration ────────────────────────────

  captureTrigger(el: HTMLElement): void {
    this._trigger.set(el);
  }

  captureTriggerFocus(el: HTMLElement): void {
    this.focusRestoreTarget = el;
  }

  restoreTriggerFocus(): void {
    const target = this.focusRestoreTarget;
    if (!target) return;
    try {
      target.focus();
    } catch {
      /* element may be detached */
    }
  }

  registerPanel(el: HTMLElement | null): void {
    this.panelEl = el;
    if (el) {
      this.overlay.markContentEl(this.stackId(), el);
    }
  }

  registerTitleId(id: string): void {
    this._titleId.set(id);
  }

  unregisterTitleId(id: string): void {
    if (this._titleId() === id) this._titleId.set(null);
  }

  setModal(modal: boolean): void {
    this._modal.set(modal);
  }

  // ── State transitions ───────────────────────────────────────────────

  toggle(): void {
    if (this._open()) {
      this.requestClose('programmatic');
    } else {
      this.show();
    }
  }

  /**
   * Open the popover. The content directive observes the `open` signal and
   * reacts by mounting its template; this method captures the focus-restore
   * target and emits `kjOpenChange`. Auto-focus runs in
   * {@link runOpenAutoFocus} once the content is mounted (it calls
   * {@link registerPanel}).
   */
  show(): void {
    if (this._open()) return;
    if (
      isPlatformBrowser(this.platformId)
      && typeof document !== 'undefined'
      && document.activeElement instanceof HTMLElement
    ) {
      this.focusRestoreTarget = document.activeElement;
    }

    this._open.set(true);
    if (!this.suppressNotify) this.cfg?.emitOpenChange(true);
  }

  hide(reason: KjPopoverCloseReason): void {
    this.requestClose(reason);
  }

  /**
   * Run the cancellable close cycle. Returns whether the close was committed.
   */
  requestClose(reason: KjPopoverCloseReason): boolean {
    if (!this._open()) return false;
    const ev = createCloseEvent(reason);
    this.cfg?.emitCloseRequested(ev);
    if (ev.defaultPrevented) return false;
    this.commitClose();
    return true;
  }

  private commitClose(): void {
    if (!this._open()) return;

    if (this.focusRestoreTarget) {
      this.runCloseAutoFocus(this.focusRestoreTarget);
    }

    this.tearDownStack();
    this._open.set(false);
    this.panelEl = null;
    if (!this.suppressNotify) this.cfg?.emitOpenChange(false);
  }

  /** Sync from a programmatic write to the host model. */
  syncFromModel(wanted: boolean): void {
    if (wanted === this._open()) return;
    this.suppressNotify = true;
    try {
      if (wanted) {
        this.show();
      } else {
        this.requestClose('programmatic');
      }
    } finally {
      this.suppressNotify = false;
    }
  }

  // ── Stack / scroll-lock helpers ──────────────────────────────────────

  registerWithStack(opts: {
    closeOnEsc: boolean;
    closeOnOutsideClick: boolean;
    modal: boolean;
  }): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.overlayHandle) return;
    this.overlayHandle = this.overlay.register(this.stackId(), {
      onClose: () => {
        const reason = this.lastCloseReasonHint ?? 'outside-click';
        this.lastCloseReasonHint = null;
        this.requestClose(reason);
      },
      closeOnEsc: opts.closeOnEsc,
      closeOnOutside: opts.closeOnOutsideClick,
    });
    if (this.panelEl) {
      this.overlay.markContentEl(this.stackId(), this.panelEl);
    }
    if (opts.modal) {
      this.releaseScrollLock = this.overlay.lockBodyScroll();
    }
  }

  /**
   * Stack closes are coalesced through one `onClose` callback; this hint
   * lets the directive's local Esc keydown listener attribute the correct
   * `'escape'` reason to the close event.
   */
  private lastCloseReasonHint: KjPopoverCloseReason | null = null;
  hintCloseReason(reason: KjPopoverCloseReason): void {
    this.lastCloseReasonHint = reason;
  }

  closeButtonClicked(): void {
    this.requestClose('close-button');
  }

  private tearDownStack(): void {
    this.overlayHandle?.unregister();
    this.overlayHandle = undefined;
    this.releaseScrollLock?.();
    this.releaseScrollLock = undefined;
  }

  private stackId(): string {
    return `kj-popover-${this.popoverId}`;
  }

  // ── Auto-focus ───────────────────────────────────────────────────────

  /** Called by `[kjPopoverContent]` after the panel mounts. */
  runOpenAutoFocus(panel: HTMLElement): void {
    const autofocus = panel.querySelector<HTMLElement>('[autofocus]');
    const target =
      autofocus ?? panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? panel;

    const ev = createAutoFocusEvent(target);
    this.cfg?.emitOpenAutoFocus(ev);
    if (ev.defaultPrevented) return;
    try {
      target.focus();
    } catch {
      /* ignore */
    }
  }

  private runCloseAutoFocus(target: HTMLElement): void {
    const ev = createAutoFocusEvent(target);
    this.cfg?.emitCloseAutoFocus(ev);
    if (ev.defaultPrevented) return;
    try {
      target.focus();
    } catch {
      /* ignore */
    }
  }
}
