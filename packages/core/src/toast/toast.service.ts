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
@Injectable({ providedIn: 'root' })
export class KjToastService {
  private readonly strategy = inject(KJ_TOAST_STRATEGY);
  private readonly _toasts = signal<KjToastItem[]>([]);
  /** Live list of active toasts. Read by `[kjToastViewport]`. */
  readonly toasts = this._toasts.asReadonly();

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

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
      this.timers.set(id, setTimeout(() => this.dismiss(id), toast.duration));
    }
    return id;
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
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this._toasts.update(ts => ts.filter(t => t.id !== id));
  }

  /** Dismiss every active toast. */
  dismissAll(): void {
    this.timers.forEach(t => clearTimeout(t));
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
