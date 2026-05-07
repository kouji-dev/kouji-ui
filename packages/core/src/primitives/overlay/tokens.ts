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

export interface KjMountStrategy extends KjStrategy {
  resolveContainer(): HTMLElement;
  readonly portalled: boolean;
}

export interface KjPositionStrategy extends KjStrategy {
  update(): void;
  readonly placement?: Signal<KjPlacement | null>;
}

export interface KjBackdropStrategy extends KjStrategy {
  readonly inertSiblings: boolean;
  readonly closeOnClick: boolean;
}

export interface KjFocusTrapStrategy extends KjStrategy {
  focusFirst(): void;
  restoreFocus(): void;
}

export interface KjScrollLockStrategy extends KjStrategy {}

export interface KjLiveAnnouncerStrategy extends KjStrategy {
  announce(message: string): void;
}

export type KjAriaHasPopup = 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | null;

export interface KjTriggerEventStrategy extends KjStrategy {
  readonly ariaHasPopup: KjAriaHasPopup;
  bindToggle(toggle: () => void): void;
}

export const KJ_OVERLAY_MOUNT_STRATEGY          = new InjectionToken<KjMountStrategy>('KJ_OVERLAY_MOUNT_STRATEGY');
export const KJ_OVERLAY_POSITION_STRATEGY       = new InjectionToken<KjPositionStrategy>('KJ_OVERLAY_POSITION_STRATEGY');
export const KJ_OVERLAY_BACKDROP_STRATEGY       = new InjectionToken<KjBackdropStrategy | null>('KJ_OVERLAY_BACKDROP_STRATEGY');
export const KJ_OVERLAY_FOCUS_TRAP_STRATEGY     = new InjectionToken<KjFocusTrapStrategy>('KJ_OVERLAY_FOCUS_TRAP_STRATEGY');
export const KJ_OVERLAY_SCROLL_LOCK_STRATEGY    = new InjectionToken<KjScrollLockStrategy>('KJ_OVERLAY_SCROLL_LOCK_STRATEGY');
export const KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY = new InjectionToken<KjLiveAnnouncerStrategy>('KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY');
export const KJ_OVERLAY_TRIGGER_EVENT_STRATEGY  = new InjectionToken<KjTriggerEventStrategy>('KJ_OVERLAY_TRIGGER_EVENT_STRATEGY');
export const KJ_OVERLAY_PANEL_ROLE              = new InjectionToken<KjPanelRole>('KJ_OVERLAY_PANEL_ROLE');
