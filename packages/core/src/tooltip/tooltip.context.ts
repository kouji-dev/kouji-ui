import { InjectionToken, signal, type Signal } from '@angular/core';

/** Side on which the tooltip is placed relative to its trigger. */
export type KjTooltipSide = 'top' | 'right' | 'bottom' | 'left';

/** Cross-axis alignment of the tooltip relative to its trigger. */
export type KjTooltipAlign = 'start' | 'center' | 'end';

/**
 * Touch-gesture mode.
 * - `'auto'` — long-press opens on coarse pointers (touch); ignored on fine pointers.
 * - `'on'`   — long-press opens regardless of pointer type.
 * - `'off'`  — touch is disabled entirely.
 */
export type KjTooltipTouchGestures = 'auto' | 'on' | 'off';

/**
 * Application-wide tooltip defaults. Provide via {@link KJ_TOOLTIP_DEFAULTS}
 * to override the built-in values for every tooltip in the app.
 */
export interface KjTooltipDefaults {
  /** Hover/focus open delay in milliseconds. Default `700`. */
  openDelayMs?: number;
  /** Mouseleave grace period in milliseconds. Default `300`. */
  closeDelayMs?: number;
  /** Window in which subsequent tooltips in the same group skip the open delay. Default `300`. */
  skipDelayMs?: number;
  /** Preferred side. Default `'top'`. */
  side?: KjTooltipSide;
  /** Cross-axis alignment. Default `'center'`. */
  align?: KjTooltipAlign;
  /** Pixel gap between trigger and tooltip. Default `8`. */
  offset?: number;
  /** Touch gestures policy. Default `'auto'`. */
  touchGestures?: KjTooltipTouchGestures;
  /** Long-press hold duration in milliseconds. Default `500`. */
  touchHoldMs?: number;
}

/**
 * Injection token for app-wide tooltip defaults.
 *
 * @example
 * ```ts
 * providers: [
 *   { provide: KJ_TOOLTIP_DEFAULTS, useValue: { openDelayMs: 500 } satisfies KjTooltipDefaults },
 * ];
 * ```
 */
export const KJ_TOOLTIP_DEFAULTS = new InjectionToken<KjTooltipDefaults>(
  'KjTooltipDefaults',
);

/** Resolved defaults — built-in fallback values used when the token is unset. */
export const KJ_TOOLTIP_BUILTIN_DEFAULTS: Required<KjTooltipDefaults> = {
  openDelayMs: 700,
  closeDelayMs: 300,
  skipDelayMs: 300,
  side: 'top',
  align: 'center',
  offset: 8,
  touchGestures: 'auto',
  touchHoldMs: 500,
};

/**
 * Group context shared between sibling tooltips for "skip-delay" coordination.
 * When a tooltip in the group was visible recently (within `skipDelayMs`), the
 * next tooltip in the same group opens with **no** open-delay.
 */
export interface KjTooltipGroupContext {
  /** Wall-clock ms timestamp of the most recent close in this group. */
  readonly lastVisibleAt: Signal<number>;
  /** Called when any tooltip in the group opens. */
  notifyOpened(): void;
  /** Called when any tooltip in the group closes. */
  notifyClosed(): void;
}

/**
 * Creates a fresh group context. Used by {@link KjTooltipGroup} and by the
 * default global root group provided via DI.
 */
export function createKjTooltipGroupContext(): KjTooltipGroupContext {
  const lastVisibleAt = signal(0);
  return {
    lastVisibleAt: lastVisibleAt.asReadonly(),
    notifyOpened: () => lastVisibleAt.set(Date.now()),
    notifyClosed: () => lastVisibleAt.set(Date.now()),
  };
}

/**
 * Injection token for the active tooltip group. A global fallback is provided
 * in `providedIn: 'root'` so the `[kjTooltip]` shorthand works without an
 * explicit `[kjTooltipGroup]` wrapper.
 */
export const KJ_TOOLTIP_GROUP = new InjectionToken<KjTooltipGroupContext>(
  'KjTooltipGroup',
  {
    providedIn: 'root',
    factory: () => createKjTooltipGroupContext(),
  },
);
