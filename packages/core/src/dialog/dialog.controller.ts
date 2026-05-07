import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjOverlayService } from '../primitives/overlay/overlay';
import {
  type KjDialogAutoFocusEvent,
  type KjDialogCloseEvent,
  type KjDialogCloseReason,
  createDialogAutoFocusEvent,
  createDialogCloseEvent,
  nextDialogId,
} from './dialog.context';

/** Selector used to discover focusable descendants. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Per-dialog host wiring consumed by {@link KjDialogController}.
 *
 * @internal
 */
export interface KjDialogHostConfig {
  emitCloseRequested: (event: KjDialogCloseEvent) => void;
  emitOpenAutoFocus: (event: KjDialogAutoFocusEvent) => void;
  emitCloseAutoFocus: (event: KjDialogAutoFocusEvent) => void;
  emitClosed: (result: unknown) => void;
}

/**
 * Shared state machine for a single dialog instance.
 *
 * Owns:
 * - the reactive `open` / `titleId` / `descriptionId` signals
 * - cancellable close cycle
 * - `KjOverlayService.register()` for stack ordering + Esc / outside-click
 * - body scroll-lock (refcounted via `KjOverlayService.lockBodyScroll`)
 * - focus capture before open and focus restore on close
 * - auto-focus inside the panel after mount
 *
 * Created via Angular DI inside `KjDialogTrigger` (declarative path) or
 * directly via `new` inside `KjDialogService.open` (programmatic path).
 *
 * @internal
 */
@Injectable()
export class KjDialogController {
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlay = inject(KjOverlayService);

  /** Stable id used for ARIA wiring. */
  readonly dialogId = nextDialogId();

  private readonly _open = signal(false);
  /** Reactive open state. */
  readonly open = this._open.asReadonly();

  private readonly _titleId = signal<string | null>(null);
  readonly titleId = this._titleId.asReadonly();

  private readonly _descriptionId = signal<string | null>(null);
  readonly descriptionId = this._descriptionId.asReadonly();

  private readonly _disableClose = signal(false);
  /**
   * Mutable signal that disables both Escape and backdrop close paths when
   * `true`. Useful while saving an in-progress form.
   */
  readonly disableClose = this._disableClose;

  private cfg: KjDialogHostConfig | undefined;
  private overlayHandle: ReturnType<KjOverlayService['register']> | undefined;
  private releaseScrollLock: (() => void) | undefined;
  private focusRestoreTarget: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;

  /**
   * Hint set by directive-local Esc / close-button handlers so the
   * cancellable close cycle reports the right reason. The overlay-stack
   * coordinator coalesces Esc and outside-click through one `onClose`
   * callback — without this hint we'd attribute everything to `'backdrop'`.
   */
  private lastCloseReasonHint: KjDialogCloseReason | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.tearDownStack();
    });
  }

  configure(cfg: KjDialogHostConfig): void {
    this.cfg = cfg;
  }

  hintCloseReason(reason: KjDialogCloseReason): void {
    this.lastCloseReasonHint = reason;
  }

  // ── Title / description id registration ────────────────────────────

  registerTitleId(id: string): void {
    this._titleId.set(id);
  }
  unregisterTitleId(id: string): void {
    if (this._titleId() === id) this._titleId.set(null);
  }
  registerDescriptionId(id: string): void {
    this._descriptionId.set(id);
  }
  unregisterDescriptionId(id: string): void {
    if (this._descriptionId() === id) this._descriptionId.set(null);
  }

  // ── State transitions ───────────────────────────────────────────────

  /**
   * Open the dialog. Captures the previously-focused element for restoration
   * on close. The directive path observes `open()` to mount the template;
   * the service path mounts directly and calls {@link registerPanel}.
   */
  open$(): void {
    if (this._open()) return;
    if (
      isPlatformBrowser(this.platformId)
      && typeof document !== 'undefined'
      && document.activeElement instanceof HTMLElement
    ) {
      this.focusRestoreTarget = document.activeElement;
    }
    this._open.set(true);
  }

  /**
   * Request a close. Runs the cancellable lifecycle: emits
   * `(kjCloseRequested)` first, and only commits the close if the consumer
   * does not call `preventDefault()`. Honours `disableClose`.
   */
  requestClose(result: unknown, reason: KjDialogCloseReason): boolean {
    if (!this._open()) return false;
    if (this._disableClose() && reason !== 'programmatic') return false;

    const ev = createDialogCloseEvent(reason, result);
    this.cfg?.emitCloseRequested(ev);
    if (ev.defaultPrevented) return false;
    this.commitClose(result);
    return true;
  }

  private commitClose(result: unknown): void {
    if (!this._open()) return;

    const restoreTarget = this.focusRestoreTarget;
    this.tearDownStack();
    this._open.set(false);
    this.panelEl = null;

    if (restoreTarget) {
      this.runCloseAutoFocus(restoreTarget);
    }
    this.cfg?.emitClosed(result);
  }

  // ── Stack / scroll-lock helpers ──────────────────────────────────────

  registerWithStack(opts: {
    closeOnEscape: boolean;
    closeOnBackdrop: boolean;
    scrollLock: boolean;
  }): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.overlayHandle) return;
    this.overlayHandle = this.overlay.register(this.stackId(), {
      onClose: () => {
        const reason = this.lastCloseReasonHint ?? 'backdrop';
        this.lastCloseReasonHint = null;
        this.requestClose(undefined, reason);
      },
      closeOnEsc: opts.closeOnEscape,
      closeOnOutside: opts.closeOnBackdrop,
    });
    if (this.panelEl) {
      this.overlay.markContentEl(this.stackId(), this.panelEl);
    }
    if (opts.scrollLock) {
      this.releaseScrollLock = this.overlay.lockBodyScroll();
    }
  }

  registerPanel(el: HTMLElement | null): void {
    this.panelEl = el;
    if (this.overlayHandle && el) {
      this.overlay.markContentEl(this.stackId(), el);
    }
  }

  /** Capture the element to restore focus to on close. */
  setFocusRestoreTarget(el: HTMLElement | null): void {
    this.focusRestoreTarget = el;
  }

  private tearDownStack(): void {
    this.overlayHandle?.unregister();
    this.overlayHandle = undefined;
    this.releaseScrollLock?.();
    this.releaseScrollLock = undefined;
  }

  private stackId(): string {
    return this.dialogId;
  }

  // ── Auto-focus ───────────────────────────────────────────────────────

  /**
   * Resolve the initial-focus target inside the panel.
   *
   * Resolution order matches the analysis:
   * 1. Element matching `autoFocus` selector if one was provided.
   * 2. Element with `[autofocus]` attribute.
   * 3. First tabbable descendant.
   * 4. The panel itself (with `tabindex="-1"`).
   */
  runOpenAutoFocus(panel: HTMLElement, autoFocus: boolean | string): void {
    if (autoFocus === false) return;

    let target: HTMLElement | null = null;
    if (typeof autoFocus === 'string') {
      target = panel.querySelector<HTMLElement>(autoFocus);
    }
    target ??= panel.querySelector<HTMLElement>('[autofocus]');
    target ??= panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    target ??= panel;

    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');

    const ev = createDialogAutoFocusEvent(target);
    this.cfg?.emitOpenAutoFocus(ev);
    if (ev.defaultPrevented) return;
    try {
      target.focus();
    } catch {
      /* ignore */
    }
  }

  private runCloseAutoFocus(target: HTMLElement): void {
    const ev = createDialogAutoFocusEvent(target);
    this.cfg?.emitCloseAutoFocus(ev);
    if (ev.defaultPrevented) return;
    try {
      target.focus();
    } catch {
      /* ignore */
    }
  }
}
