import { Injectable, TemplateRef, inject, signal } from '@angular/core';
import { KJ_TOAST_STRATEGY } from './toast.strategy';

export type KjToastVariant = 'default' | 'success' | 'destructive' | 'warning';

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
  /** Visual / semantic variant. Defaults to `'default'`. */
  variant?: KjToastVariant;
  /** Auto-dismiss delay in ms. `0` = persistent. Defaults to `5000`. */
  duration?: number;
  /** Arbitrary payload exposed to the template via `ctx.data`. */
  data?: TData;
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

/**
 * Programmatic API for toast notifications.
 *
 * Two ways to show a toast:
 * - `show(template, options)` — full template control. Markup, layout, icons, action buttons all owned by the client.
 * - `show(message, options)` — string shorthand. Uses the viewport's `[kjToastDefaultTemplate]`.
 *
 * @example
 * ```ts
 * private readonly toast = inject(KjToastService);
 *
 * save()    { this.toast.success('Saved!'); }
 * undoable() {
 *   this.toast.show(this.undoTpl, { duration: 8000, data: { entityId: 42 } });
 * }
 * ```
 * @category Core/Overlays
 */
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

@Injectable({ providedIn: 'root' })
export class KjToastService {
  private readonly strategy = inject(KJ_TOAST_STRATEGY);
  private readonly _toasts = signal<KjToastItem[]>([]);
  /** Live list of active toasts. Read by `[kjToastViewport]`. */
  readonly toasts = this._toasts.asReadonly();

  private readonly timers = new Map<string, KjToastTimer>();

  /**
   * Ref-counted pause depth, keyed by reason. A timer is considered paused
   * while any reason holds a non-zero count. Encoded as a Map so multiple
   * viewports / `pause('hover')` callers compose without clobbering each
   * other's state.
   */
  private readonly pauseDepth = new Map<KjToastPauseReason, number>();

  /** Show a toast with a custom template. Returns the toast id. */
  show<T = unknown>(template: TemplateRef<KjToastTemplateContext<T>>, options?: KjToastOptions<T>): string;
  /** Show a toast with a plain text message. The viewport's default template renders it. */
  show(message: string, options?: KjToastOptions): string;
  show(content: TemplateRef<KjToastTemplateContext> | string, options: KjToastOptions = {}): string {
    const id = options.id ?? crypto.randomUUID();
    const isTemplate = content instanceof TemplateRef;
    const toast: KjToastItem = {
      id,
      variant: options.variant ?? 'default',
      duration: options.duration ?? this.strategy.duration,
      title: options.title,
      data: options.data,
      message: isTemplate ? undefined : content,
      template: isTemplate ? content : undefined,
    };
    this._toasts.update(ts => [...ts, toast]);
    if (toast.duration > 0) {
      this.startTimer(id, toast.duration);
    }
    return id;
  }

  /**
   * Pause every in-flight auto-dismiss timer, ref-counted by `reason`. Multiple
   * `pause('hover')` calls require an equal number of `resume('hover')` calls
   * before the timer resumes. Independent reasons (hover vs. focus vs. manual)
   * also stack — a timer is paused while *any* reason holds depth > 0.
   *
   * Required by WCAG 2.2.1 (Timing Adjustable, AAA) and 1.4.13 (Content on
   * Hover or Focus): toasts must remain on screen as long as the user is
   * interacting with the viewport.
   */
  pause(reason: KjToastPauseReason): void {
    const next = (this.pauseDepth.get(reason) ?? 0) + 1;
    this.pauseDepth.set(reason, next);
    // Only act on the *transition* into the paused state. Subsequent pause()
    // calls just increment the depth.
    if (next === 1 && this.totalPauseDepth() === 1) this.pauseAllTimers();
  }

  /**
   * Decrement the ref-count for `reason`. When the *total* depth across all
   * reasons drops to zero, every paused timer is re-armed with its remaining
   * duration. No-op if depth is already at zero (defensive — guarantees that
   * an extra `resume` never goes negative).
   */
  resume(reason: KjToastPauseReason): void {
    const cur = this.pauseDepth.get(reason) ?? 0;
    if (cur === 0) return;
    const next = cur - 1;
    if (next === 0) this.pauseDepth.delete(reason);
    else this.pauseDepth.set(reason, next);
    if (this.totalPauseDepth() === 0) this.resumeAllTimers();
  }

  /** True while any pause reason is held. Read by tests; useful for diagnostics. */
  isPaused(): boolean {
    return this.totalPauseDepth() > 0;
  }

  private totalPauseDepth(): number {
    let sum = 0;
    for (const v of this.pauseDepth.values()) sum += v;
    return sum;
  }

  private startTimer(id: string, duration: number): void {
    // If the service is currently paused, queue the timer in paused state so
    // the next resume() picks it up alongside everything else.
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
      // Edge case: remaining ≤ 0 means the timer would have fired during the
      // pause. Dismiss synchronously rather than starting a 0-ms setTimeout.
      if (remaining <= 0) {
        // Defer the actual dismiss so we don't mutate during iteration.
        queueMicrotask(() => this.dismiss(id));
        continue;
      }
      const handle = setTimeout(() => this.dismiss(id), remaining);
      this.timers.set(id, { handle, duration: remaining, startedAt: Date.now(), remaining });
    }
  }

  /** Show a success toast (string shorthand). */
  success(message: string, options?: Omit<KjToastOptions, 'variant'>): string {
    return this.show(message, { ...options, variant: 'success' });
  }
  /** Show an error toast (string shorthand). */
  error(message: string, options?: Omit<KjToastOptions, 'variant'>): string {
    return this.show(message, { ...options, variant: 'destructive' });
  }
  /** Show a warning toast (string shorthand). */
  warning(message: string, options?: Omit<KjToastOptions, 'variant'>): string {
    return this.show(message, { ...options, variant: 'warning' });
  }
  /** Show an informational toast (string shorthand). */
  info(message: string, options?: Omit<KjToastOptions, 'variant'>): string {
    return this.show(message, { ...options, variant: 'default' });
  }

  /** Manually dismiss a toast by id. */
  dismiss(id: string): void {
    const t = this.timers.get(id);
    if (t?.handle != null) clearTimeout(t.handle);
    this.timers.delete(id);
    this._toasts.update(ts => ts.filter(t => t.id !== id));
  }

  /** Dismiss every active toast. */
  dismissAll(): void {
    for (const t of this.timers.values()) {
      if (t.handle != null) clearTimeout(t.handle);
    }
    this.timers.clear();
    this._toasts.set([]);
  }

  /**
   * Builds a template context for a queued toast — used by `[kjToastViewport]` when rendering.
   * `ctx.dismiss` is bound to this service.
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
