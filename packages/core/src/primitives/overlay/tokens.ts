import { InjectionToken, type Signal } from '@angular/core';
import type { KjOverlayContext } from './context';
import type { KjPanelRole, KjPlacement } from './types';

/** Common shape for every overlay strategy. */
export interface KjStrategy {
  attach(ctx: KjOverlayContext): void;
  onOpen?(): void;
  onClose?(): void;
  detach(): void;
}

/** Decides where the panel element lives in the DOM while the overlay is open. */
export interface KjMountStrategy extends KjStrategy {
  resolveContainer(): HTMLElement;
  readonly portalled: boolean;
}

/** Places the panel and, when it anchors to a trigger, publishes the resolved placement. */
export interface KjPositionStrategy extends KjStrategy {
  update(): void;
  readonly placement?: Signal<KjPlacement | null>;
}

/** Owns the scrim: whether it inerts the page behind it and whether a press on it closes. */
export interface KjBackdropStrategy extends KjStrategy {
  readonly inertSiblings: boolean;
  readonly closeOnClick: boolean;
}

/** Owns keyboard focus for the open panel — initial focus, Tab containment and restoration. */
export interface KjFocusTrapStrategy extends KjStrategy {
  /** Moves focus into the panel once the open transition completes. */
  focusFirst(): void;
  /** Returns focus to the element that had it when the overlay opened. */
  restoreFocus(): void;
  /**
   * Whether the controller may return focus to the opener on close. The
   * controller restores generically for every overlay; a strategy built
   * with `returnFocus: false` reports it here to opt out. Defaults to `true`.
   */
  readonly returnFocus?: boolean;
}

/** Freezes page scrolling while the overlay is open. Marker-only — `attach`/`detach` do the work. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface KjScrollLockStrategy extends KjStrategy {}

/** Announces open/close (and consumer messages) to assistive technology. */
export interface KjLiveAnnouncerStrategy extends KjStrategy {
  announce(message: string): void;
}

/** Value a trigger reflects as `aria-haspopup`; `null` omits the attribute. */
export type KjAriaHasPopup = 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | null;

/** Turns DOM events on the trigger (click, hover, focus, hotkey…) into open/close calls. */
export interface KjTriggerEventStrategy extends KjStrategy {
  readonly ariaHasPopup: KjAriaHasPopup;
  bindToggle(toggle: () => void): void;
}

/** Mount strategy for the overlay in this injector. No default — every overlay provides one. */
export const KJ_OVERLAY_MOUNT_STRATEGY          = new InjectionToken<KjMountStrategy>('KJ_OVERLAY_MOUNT_STRATEGY');
/** Position strategy for the overlay in this injector. No default. */
export const KJ_OVERLAY_POSITION_STRATEGY       = new InjectionToken<KjPositionStrategy>('KJ_OVERLAY_POSITION_STRATEGY');
/** Backdrop strategy, or `null` for an overlay that renders no scrim. */
export const KJ_OVERLAY_BACKDROP_STRATEGY       = new InjectionToken<KjBackdropStrategy | null>('KJ_OVERLAY_BACKDROP_STRATEGY');
/** Focus-trap strategy for the overlay in this injector. Default: `noTrap()` at the call sites. */
export const KJ_OVERLAY_FOCUS_TRAP_STRATEGY     = new InjectionToken<KjFocusTrapStrategy>('KJ_OVERLAY_FOCUS_TRAP_STRATEGY');
/** Scroll-lock strategy for the overlay in this injector. Default: `noScrollLock()` at the call sites. */
export const KJ_OVERLAY_SCROLL_LOCK_STRATEGY    = new InjectionToken<KjScrollLockStrategy>('KJ_OVERLAY_SCROLL_LOCK_STRATEGY');
/** Live-announcer strategy for the overlay in this injector. Default: `silent()` at the call sites. */
export const KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY = new InjectionToken<KjLiveAnnouncerStrategy>('KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY');
/** Trigger-event strategy bound by `KjOverlayTrigger`. No default. */
export const KJ_OVERLAY_TRIGGER_EVENT_STRATEGY  = new InjectionToken<KjTriggerEventStrategy>('KJ_OVERLAY_TRIGGER_EVENT_STRATEGY');
/** ARIA role the panel takes (`dialog`, `menu`, `listbox`, …). Read by the panel and the trigger. */
export const KJ_OVERLAY_PANEL_ROLE              = new InjectionToken<KjPanelRole>('KJ_OVERLAY_PANEL_ROLE');
