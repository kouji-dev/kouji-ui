import { InjectionToken, Signal } from '@angular/core';

/** Activation modes per WAI-ARIA APG Tabs pattern. */
export type KjTabsActivationMode = 'automatic' | 'manual';

/** Tabs orientation. Drives `aria-orientation` and the roving arrow-axis. */
export type KjTabsOrientation = 'horizontal' | 'vertical';

/**
 * Context exposed by `KjTabs` to its child directives (`KjTabList`, `KjTab`,
 * `KjTabPanel`). Holds the active value, orientation, activation mode, and
 * id helpers for ARIA wiring.
 */
export interface KjTabsContext {
  /** Currently active tab value. */
  readonly value: Signal<string>;
  /** Tabs orientation; drives `aria-orientation` and arrow-key axis. */
  readonly orientation: Signal<KjTabsOrientation>;
  /** Activation mode; `'automatic'` activates on focus, `'manual'` requires Enter/Space. */
  readonly activationMode: Signal<KjTabsActivationMode>;
  /** Unique id for the tab element associated with `value`. */
  tabId(value: string): string;
  /** Unique id for the panel element associated with `value`. */
  panelId(value: string): string;
  /** Whether the tab/panel pair for `value` is currently active. */
  isActive(value: string): boolean;
  /** Activates the tab/panel pair for `value`. No-op when the tab is disabled. */
  select(value: string): void;
}

/** Injection token for the root `KjTabs` directive context. */
export const KJ_TABS = new InjectionToken<KjTabsContext>('KjTabs');
