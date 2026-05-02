import { Injectable, signal } from '@angular/core';

export type KjToastVariant = 'default' | 'success' | 'destructive' | 'warning';

/** Configuration for a single toast notification. */
export interface KjToastConfig {
  /** Unique identifier. Auto-generated if not provided. */
  id?: string;
  /** Toast message text. */
  message: string;
  /** Optional title displayed above the message. */
  title?: string;
  /** Visual and semantic variant. Defaults to `'default'`. */
  variant?: KjToastVariant;
  /**
   * Auto-dismiss delay in milliseconds. Pass `0` for a persistent toast.
   * Defaults to `5000`.
   */
  duration?: number;
}

export interface KjToast extends Required<Pick<KjToastConfig, 'id' | 'message' | 'variant' | 'duration'>> {
  title?: string;
}

/**
 * Programmatic service for showing toast notifications.
 * Pairs with `[kjToastViewport]` in the template to render the toast list.
 *
 * @example
 * ```ts
 * private readonly toast = inject(KjToastService);
 *
 * save() {
 *   this.toast.success('Changes saved!');
 * }
 * ```
 * @category Core/Overlays/Toast
 */
@Injectable({ providedIn: 'root' })
export class KjToastService {
  private readonly _toasts = signal<KjToast[]>([]);
  /** Live list of active toasts. Read from `[kjToastViewport]` via its `toasts` signal. */
  readonly toasts = this._toasts.asReadonly();

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Shows a toast with the given configuration.
   * @returns The generated toast `id`.
   */
  show(config: KjToastConfig): string {
    const id = config.id ?? crypto.randomUUID();
    const toast: KjToast = {
      id,
      message: config.message,
      title: config.title,
      variant: config.variant ?? 'default',
      duration: config.duration ?? 5000,
    };
    this._toasts.update(ts => [...ts, toast]);
    if (toast.duration > 0) {
      const timer = setTimeout(() => this.dismiss(id), toast.duration);
      this.timers.set(id, timer);
    }
    return id;
  }

  /** Shows a success toast. */
  success(message: string, options?: Omit<KjToastConfig, 'message' | 'variant'>): string {
    return this.show({ ...options, message, variant: 'success' });
  }

  /** Shows an error toast. */
  error(message: string, options?: Omit<KjToastConfig, 'message' | 'variant'>): string {
    return this.show({ ...options, message, variant: 'destructive' });
  }

  /** Shows a warning toast. */
  warning(message: string, options?: Omit<KjToastConfig, 'message' | 'variant'>): string {
    return this.show({ ...options, message, variant: 'warning' });
  }

  /** Shows an informational toast. */
  info(message: string, options?: Omit<KjToastConfig, 'message' | 'variant'>): string {
    return this.show({ ...options, message, variant: 'default' });
  }

  /** Manually dismisses a toast by id. */
  dismiss(id: string): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this._toasts.update(ts => ts.filter(t => t.id !== id));
  }

  /** Dismisses all active toasts. */
  dismissAll(): void {
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
    this._toasts.set([]);
  }
}
