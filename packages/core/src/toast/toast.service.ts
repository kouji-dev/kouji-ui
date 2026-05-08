import { EnvironmentInjector, Injectable, TemplateRef, Type, inject, runInInjectionContext, signal } from '@angular/core';
import { KjOverlayBuilder } from '../primitives/overlay/builder';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { corner, type KjCornerPosition } from '../primitives/overlay/strategies/position/corner';
import { polite } from '../primitives/overlay/strategies/live-announcer/polite';
import { assertive } from '../primitives/overlay/strategies/live-announcer/assertive';
import { programmatic } from '../primitives/overlay/strategies/trigger-event/programmatic';
import { KJ_TOAST_STRATEGY } from './toast.strategy';
import { KjToastRef } from './toast.ref';

export type KjToastVariant = 'default' | 'success' | 'destructive' | 'warning';

/** Variant tag accepted by the variant-sugar methods (`success`/`info`/`warn`/`error`). */
export type KjToastSugarVariant = 'success' | 'info' | 'warn' | 'error';

/**
 * Shape `[kjToastDefaultTemplate]` and per-call templates receive via `ngTemplateOutlet`.
 * Inherits every `KjToastContext` field for `let-id="id"`-style bindings, plus `$implicit`
 * for the canonical `<ng-template let-ctx>` form.
 */
export interface KjToastTemplateContext<TData = unknown> extends KjToastContext<TData> {
  $implicit: KjToastContext<TData>;
}

/** Context object passed to a toast template. Available via `let-ctx` (or `let-ctx="$implicit"`). */
export interface KjToastContext<TData = unknown> {
  /** Unique id for this toast. */
  readonly id: string;
  /** Variant set when the toast was shown. */
  readonly variant: KjToastVariant;
  /** Plain text message — only set when shown via the string-based API. */
  readonly message?: string;
  /** Optional title set via options. */
  readonly title?: string;
  /** Arbitrary client payload set via options.data. Strongly typed via the TemplateRef generic. */
  readonly data?: TData;
  /** Dismiss this toast. Bound — safe to use directly in templates. */
  dismiss(): void;
}

/** Options for `KjToastService.show()` and the `success`/`error`/`warning`/`info` shorthands. */
export interface KjToastOptions<TData = unknown> {
  /** Override the auto-generated id. */
  id?: string;
  /** Optional title rendered above the message. */
  title?: string;
  /** Plain text message — set when not using a custom template. */
  message?: string;
  /** Visual / semantic variant. Defaults to `'default'`. */
  variant?: KjToastVariant;
  /** Auto-dismiss delay in ms. `0` = persistent. Defaults to `5000`. */
  duration?: number;
  /** Arbitrary payload exposed to the template via `ctx.data`. */
  data?: TData;
  /** Override the corner position used for the overlay. Defaults to `'bottom-right'`. */
  position?: KjCornerPosition;
  /** Optional component to mount as the toast body. */
  component?: Type<unknown>;
  /** Optional template for queue-based rendering through `<kj-toast-viewport>`. */
  template?: TemplateRef<KjToastTemplateContext<TData>>;
}

/** Internal queue item — tracked by the service, consumed by `KjToastViewport`. */
export interface KjToastItem<TData = unknown> {
  readonly id: string;
  readonly variant: KjToastVariant;
  readonly duration: number;
  readonly message?: string;
  readonly title?: string;
  readonly data?: TData;
  /** Per-call template, when shown via `show(template, …)`. Otherwise the viewport's default template renders. */
  readonly template?: TemplateRef<KjToastTemplateContext<TData>>;
}

/** Reasons that can hold the auto-dismiss timers in the paused state. Ref-counted. */
export type KjToastPauseReason = 'hover' | 'focus' | 'manual';

/** Internal timer tracking for an in-flight toast — supports pause / resume. */
interface KjToastTimer {
  /** The active `setTimeout` handle, or `null` while paused. */
  handle: ReturnType<typeof setTimeout> | null;
  /** Original duration (ms) used to compute remaining on pause. */
  duration: number;
  /** When the current `setTimeout` was started. Used to compute remaining on pause. */
  startedAt: number;
  /** Time left to fire when paused. */
  remaining: number;
}

const VARIANT_FROM_SUGAR: Record<KjToastSugarVariant, KjToastVariant> = {
  success: 'success',
  info: 'default',
  warn: 'warning',
  error: 'destructive',
};

/**
 * Programmatic API for toast notifications.
 *
 * Two ways to dispatch a toast:
 * - `show(opts)` (and the `success`/`info`/`warn`/`error` sugar) — overlay-based.
 *   Each call creates an overlay via `KjOverlayBuilder`, anchored at the chosen
 *   corner, returning a `KjToastRef` for programmatic dismissal.
 * - The legacy queue API (`show(message|template, options)` returning a string id)
 *   is preserved so consumers using `<kj-toast-viewport>` to render their own
 *   queue continue to work. Auto-dismiss + pause/resume + max-visible logic
 *   lives on this service regardless of which entry-point a caller uses.
 *
 * @category Core/Overlays
 */
@Injectable({ providedIn: 'root' })
export class KjToastService {
  private readonly strategy = inject(KJ_TOAST_STRATEGY);
  private readonly builder = inject(KjOverlayBuilder);
  private readonly env = inject(EnvironmentInjector);
  private readonly _toasts = signal<KjToastItem[]>([]);
  /** Live list of active toasts. Read by `[kjToastViewport]`. */
  readonly toasts = this._toasts.asReadonly();

  private readonly timers = new Map<string, KjToastTimer>();

  /** Holds active overlay controllers keyed by toast id so dismiss can close them. */
  private readonly overlays = new Map<string, { close: () => void }>();

  /**
   * Ref-counted pause depth, keyed by reason. A timer is considered paused
   * while any reason holds a non-zero count.
   */
  private readonly pauseDepth = new Map<KjToastPauseReason, number>();

  /**
   * Overlay-based entry point. Builds an overlay via `KjOverlayBuilder` with
   * `bodyPortal` mount, `corner` positioning and a polite/assertive live
   * announcer based on the variant. Returns a `KjToastRef` whose `close()`
   * dismisses the toast and unwinds the overlay.
   */
  show<TData = unknown>(opts: KjToastOptions<TData>): KjToastRef;
  /** Show a toast with a plain text message. The viewport's default template renders it. */
  show(message: string, options?: KjToastOptions): string;
  /** Show a toast with a custom template. Returns the toast id. */
  show<TData = unknown>(template: TemplateRef<KjToastTemplateContext<TData>>, options?: KjToastOptions<TData>): string;
  show(
    arg: KjToastOptions | string | TemplateRef<KjToastTemplateContext>,
    options: KjToastOptions = {},
  ): KjToastRef | string {
    if (typeof arg === 'string') {
      return this.enqueue({ ...options, message: arg });
    }
    if (arg instanceof TemplateRef) {
      return this.enqueue({ ...options, template: arg });
    }
    return this.openOverlay(arg);
  }

  private openOverlay(opts: KjToastOptions): KjToastRef {
    const id = opts.id ?? crypto.randomUUID();
    const variant = opts.variant ?? 'default';
    const ctrl = runInInjectionContext(this.env, () => this.builder.create({
      mount: bodyPortal(),
      position: corner({ position: opts.position ?? 'bottom-right' }),
      backdrop: null,
      focusTrap: null,
      scrollLock: null,
      liveAnnouncer: variant === 'destructive' ? assertive() : polite(),
      trigger: programmatic(),
      panelRole: variant === 'destructive' ? 'alert' : 'status',
    }));

    if (opts.component) {
      runInInjectionContext(this.env, () => this.builder.attachComponent(ctrl, opts.component!, { data: opts.data }));
    }

    this._toasts.update((ts) => [...ts, {
      id,
      variant,
      duration: opts.duration ?? this.strategy.duration,
      title: opts.title,
      message: opts.message,
      data: opts.data,
      template: opts.template,
    }]);

    const dismiss = (toastId: string) => this.dismiss(toastId);
    const ref = new KjToastRef(id, ctrl, dismiss);
    this.overlays.set(id, { close: () => ctrl.close('programmatic') });

    const duration = opts.duration ?? this.strategy.duration;
    if (duration > 0) this.startTimer(id, duration);
    ctrl.open();
    return ref;
  }

  private enqueue(options: KjToastOptions): string {
    const id = options.id ?? crypto.randomUUID();
    const toast: KjToastItem = {
      id,
      variant: options.variant ?? 'default',
      duration: options.duration ?? this.strategy.duration,
      title: options.title,
      data: options.data,
      message: options.message,
      template: options.template,
    };
    this._toasts.update((ts) => [...ts, toast]);
    if (toast.duration > 0) this.startTimer(id, toast.duration);
    return id;
  }

  /** Show a success toast via the overlay-based API. */
  success<TData = unknown>(opts: Omit<KjToastOptions<TData>, 'variant'> = {}): KjToastRef {
    return this.openOverlay({ ...opts, variant: VARIANT_FROM_SUGAR.success });
  }
  /** Show an informational toast via the overlay-based API. */
  info<TData = unknown>(opts: Omit<KjToastOptions<TData>, 'variant'> = {}): KjToastRef {
    return this.openOverlay({ ...opts, variant: VARIANT_FROM_SUGAR.info });
  }
  /** Show a warning toast via the overlay-based API. */
  warn<TData = unknown>(opts: Omit<KjToastOptions<TData>, 'variant'> = {}): KjToastRef {
    return this.openOverlay({ ...opts, variant: VARIANT_FROM_SUGAR.warn });
  }
  /** Show an error toast via the overlay-based API. Uses `role="alert"` + assertive announcement. */
  error<TData = unknown>(opts: Omit<KjToastOptions<TData>, 'variant'> = {}): KjToastRef {
    return this.openOverlay({ ...opts, variant: VARIANT_FROM_SUGAR.error });
  }

  /**
   * Pause every in-flight auto-dismiss timer, ref-counted by `reason`.
   * Required by WCAG 2.2.1 (Timing Adjustable, AAA) and 1.4.13.
   */
  pause(reason: KjToastPauseReason): void {
    const next = (this.pauseDepth.get(reason) ?? 0) + 1;
    this.pauseDepth.set(reason, next);
    if (next === 1 && this.totalPauseDepth() === 1) this.pauseAllTimers();
  }

  /** Decrement the ref-count for `reason`; re-arms timers when the total reaches zero. */
  resume(reason: KjToastPauseReason): void {
    const cur = this.pauseDepth.get(reason) ?? 0;
    if (cur === 0) return;
    const next = cur - 1;
    if (next === 0) this.pauseDepth.delete(reason);
    else this.pauseDepth.set(reason, next);
    if (this.totalPauseDepth() === 0) this.resumeAllTimers();
  }

  /** True while any pause reason is held. */
  isPaused(): boolean {
    return this.totalPauseDepth() > 0;
  }

  private totalPauseDepth(): number {
    let sum = 0;
    for (const v of this.pauseDepth.values()) sum += v;
    return sum;
  }

  private startTimer(id: string, duration: number): void {
    if (this.isPaused()) {
      this.timers.set(id, { handle: null, duration, startedAt: 0, remaining: duration });
      return;
    }
    const handle = setTimeout(() => this.dismiss(id), duration);
    this.timers.set(id, { handle, duration, startedAt: Date.now(), remaining: duration });
  }

  private pauseAllTimers(): void {
    for (const [id, t] of this.timers) {
      if (t.handle == null) continue;
      clearTimeout(t.handle);
      const elapsed = Date.now() - t.startedAt;
      const remaining = Math.max(0, t.duration - elapsed);
      this.timers.set(id, { handle: null, duration: t.duration, startedAt: 0, remaining });
    }
  }

  private resumeAllTimers(): void {
    for (const [id, t] of this.timers) {
      if (t.handle != null) continue;
      const remaining = t.remaining;
      if (remaining <= 0) {
        queueMicrotask(() => this.dismiss(id));
        continue;
      }
      const handle = setTimeout(() => this.dismiss(id), remaining);
      this.timers.set(id, { handle, duration: remaining, startedAt: Date.now(), remaining });
    }
  }

  /** Manually dismiss a toast by id. */
  dismiss(id: string): void {
    const t = this.timers.get(id);
    if (t?.handle != null) clearTimeout(t.handle);
    this.timers.delete(id);
    this._toasts.update((ts) => ts.filter((t) => t.id !== id));
    const ov = this.overlays.get(id);
    if (ov) {
      this.overlays.delete(id);
      ov.close();
    }
  }

  /** Dismiss every active toast. */
  dismissAll(): void {
    for (const t of this.timers.values()) {
      if (t.handle != null) clearTimeout(t.handle);
    }
    this.timers.clear();
    this._toasts.set([]);
    for (const ov of this.overlays.values()) ov.close();
    this.overlays.clear();
  }

  /**
   * Builds a template context for a queued toast — used by `[kjToastViewport]` when rendering.
   */
  contextFor<T>(toast: KjToastItem<T>): KjToastTemplateContext<T> {
    const ctx: KjToastContext<T> = {
      id: toast.id,
      variant: toast.variant,
      message: toast.message,
      title: toast.title,
      data: toast.data,
      dismiss: () => this.dismiss(toast.id),
    };
    return Object.assign(ctx, { $implicit: ctx });
  }
}
