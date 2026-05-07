import { InjectionToken, type Signal } from '@angular/core';
import type {
  KjDropdownMenuAlign,
  KjDropdownMenuContext,
  KjDropdownMenuSide,
} from '../dropdown-menu/dropdown-menu.context';

/** Side on which the context-menu panel is placed relative to its anchor. */
export type KjContextMenuSide = KjDropdownMenuSide;

/** Cross-axis alignment of the context-menu panel. */
export type KjContextMenuAlign = KjDropdownMenuAlign;

/** Reason the context menu reports as the source of an open. */
export type KjContextMenuOpenSource = 'mouse' | 'touch' | 'keyboard' | 'programmatic';

/** Anchor mode for the open call: pointer point or focused-element rect. */
export type KjContextMenuAnchorMode = 'point' | 'rect';

/** Payload emitted by `kjOpened`. */
export interface KjContextMenuOpenEvent {
  /** Originating input source. */
  readonly source: KjContextMenuOpenSource;
  /** Viewport x coordinate of the anchor (rect mode: top-left x). */
  readonly x: number;
  /** Viewport y coordinate of the anchor (rect mode: top-left y). */
  readonly y: number;
}

/**
 * Context-menu shared context. Extends `KjDropdownMenuContext` so the existing
 * `[kjDropdownMenu]` panel + items can render unchanged when this directive
 * provides `KJ_DROPDOWN_MENU` to its template.
 */
export interface KjContextMenuContext extends KjDropdownMenuContext {
  /** Read-only viewport coordinates of the most recent open. */
  readonly anchorPoint: Signal<{ x: number; y: number } | null>;
  /** Anchor mode: 'point' for right-click / long-press, 'rect' for keyboard. */
  readonly anchorMode: Signal<KjContextMenuAnchorMode>;
  /** Trigger host bounding-box, set when `anchorMode === 'rect'`. */
  readonly anchorRect: Signal<DOMRect | null>;
}

/** DI token for the context-menu shared context. */
export const KJ_CONTEXT_MENU = new InjectionToken<KjContextMenuContext>(
  'KjContextMenu',
);
