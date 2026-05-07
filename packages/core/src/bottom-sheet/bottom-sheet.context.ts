import { InjectionToken, type Signal } from '@angular/core';
import {
  KJ_DIALOG,
  type KjDialogContext,
} from '../dialog/dialog.context';

/**
 * Context shared between the bottom-sheet directive family.
 *
 * Implemented by {@link import('./bottom-sheet').KjBottomSheetTrigger} on the
 * declarative path. Extends {@link KjDialogContext} so the standard dialog
 * primitives (`[kjDialogTitle]`, `[kjDialogDescription]`, `[kjDialogClose]`)
 * keep working when projected inside the panel.
 */
export interface KjBottomSheetContext extends KjDialogContext {
  /** Index into snapPoints; -1 == closed. */
  readonly activeSnap: Signal<number>;
  /** Snap-points list as a signal so wrappers can react. */
  readonly snapPoints: Signal<readonly (number | string)[]>;
  /** Optional human-readable labels for AT (drives `aria-valuetext`). */
  readonly snapLabels: Signal<readonly string[] | undefined>;
  /** Live drag offset in CSS px, downward-positive. 0 when not dragging. */
  readonly dragOffset: Signal<number>;
  /** 0..1 — current openness ratio for backdrop opacity etc. */
  readonly dragProgress: Signal<number>;
  /** True while pointer is down on a handle/draggable area. */
  readonly dragging: Signal<boolean>;

  /** Programmatic snap change. `index = -1` closes. */
  snapTo(index: number): void;
  /** Update live drag offset (called by the handle on pointermove). */
  setDragOffset(offset: number): void;
  /** Mark the dragging state (called by the handle on pointerdown / up). */
  setDragging(value: boolean): void;
  /** Called by the handle on pointerup; commits to a snap or dismisses. */
  commitDrag(offset: number, velocity: number): void;
}

/** Injection token for the bottom-sheet context. */
export const KJ_BOTTOM_SHEET = new InjectionToken<KjBottomSheetContext>('KjBottomSheet');

/** Re-export to keep nested directives one-import away. */
export { KJ_DIALOG };
