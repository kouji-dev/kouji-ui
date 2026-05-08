export * from './types';
export * from './tokens';
export * from './context';
export { KjId } from './id';
export { KjOverlayStack } from './stack';
export type { KjOverlayRegistration, KjOverlayHandle } from './stack';
export { KjScrollLock } from './scroll-lock';
export { KjLiveAnnouncerService, type KjLivePoliteness } from './live-announcer';

// Existing (kept until cleanup plan)
export { KjOverlayService, KjOverlayRef } from './overlay';
export type { KjOverlayRegistration as KjOverlayServiceRegistration } from './overlay';
export { KjAnchor } from './anchor';
export type { KjAnchorSide, KjAnchorAlign, KjAnchorPlacement } from './anchor';

export { KjOverlayController } from './controller';
export type { KjOverlayStrategies } from './controller';
export { KjOverlayBuilder } from './builder';
export type { KjOverlayBuilderConfig, KjAttachOptions } from './builder';
export { KjOverlayTrigger } from './trigger';
export { KjOverlayPanel } from './panel';
export { KjFocusTrap } from './focus-trap';
export { KjBackdrop } from './backdrop';
export * from './strategies/index';
