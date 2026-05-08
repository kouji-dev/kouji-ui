import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewEncapsulation,
  computed,
  inject,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { DRAWER_DRAG, DRAWER_SIDE, type KjDrawerSide } from './drawer.service';
import { KjDrawerRef } from './drawer.ref';

/** Downward drag fraction past which release dismisses (bottom side). */
const DEFAULT_DISMISS_THRESHOLD = 0.4;
/** Downward velocity (px/s) past which release dismisses (bottom side). */
const DEFAULT_DISMISS_VELOCITY = 600;

/**
 * Drawer body component. Composes {@link KjOverlayPanel} so the host element
 * inherits `role`, `[data-state]`, and the configured side strategy from
 * `KjDrawer.open()`. Preserves the optional drag-to-dismiss behaviour: when
 * `KjDrawer.open({ drag: true, side: 'bottom' })`, pointer-down on the host
 * starts a drag that calls `ref.close()` once the threshold is crossed.
 *
 * @category Core/Overlay
 */
@Component({
  selector: 'kj-drawer',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel }],
  host: {
    'class': 'kj-drawer',
    '[attr.data-kj-side]': 'side',
    '[attr.data-kj-dragging]': 'dragging() ? "" : null',
    '[style.touch-action]': 'dragging() ? "none" : null',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)':   'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjDrawer {
  /** Resolved drawer side (provided by `KjDrawer.open`). */
  readonly side = inject<KjDrawerSide>(DRAWER_SIDE, { optional: true }) ?? 'right';
  /** Whether drag-to-dismiss is active for this drawer. */
  readonly drag = inject<boolean>(DRAWER_DRAG, { optional: true }) ?? false;

  private readonly ref = inject<KjDrawerRef<unknown>>(KjDrawerRef, { optional: true });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  private startY = 0;
  private startTime = 0;
  private pointerId: number | null = null;
  private _dragging = false;

  /** Reactive flag for `data-kj-dragging` host binding. */
  protected dragging = computed(() => this._dragging);

  /** @internal */
  onPointerDown(event: PointerEvent): void {
    if (!this.drag) return;
    if (this.side !== 'bottom') return;
    if (event.button !== undefined && event.button !== 0) return;
    this.pointerId = event.pointerId;
    this.startY = event.clientY;
    this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._dragging = true;
    (event.target as Element | null)?.setPointerCapture?.(event.pointerId);
  }

  /** @internal */
  onPointerMove(event: PointerEvent): void {
    if (!this._dragging) return;
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    const offset = Math.max(0, event.clientY - this.startY);
    this.el.nativeElement.style.setProperty('--kj-drawer-drag-offset', `${offset}px`);
  }

  /** @internal */
  onPointerUp(event: PointerEvent): void {
    if (!this._dragging) return;
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dy = Math.max(0, event.clientY - this.startY);
    const dt = Math.max(1, now - this.startTime);
    const velocity = (dy / dt) * 1000;
    this.endDrag();
    const panelHeight = this.el.nativeElement.getBoundingClientRect().height || 200;
    if (
      velocity > DEFAULT_DISMISS_VELOCITY
      || dy / panelHeight >= DEFAULT_DISMISS_THRESHOLD
    ) {
      this.ref?.close();
    }
  }

  /** @internal */
  onPointerCancel(_event: PointerEvent): void {
    this.endDrag();
  }

  private endDrag(): void {
    this._dragging = false;
    this.pointerId = null;
    this.el.nativeElement.style.removeProperty('--kj-drawer-drag-offset');
  }

  /** Close the drawer with an optional payload. */
  close(result?: unknown): void {
    (this.ref as KjDrawerRef<unknown, unknown> | null)?.close(result);
  }

  /** Esc closes via the overlay-stack coordinator on the controller. */
  @HostListener('keydown.escape')
  onEscape(): void {
    this.ref?.close();
  }
}
