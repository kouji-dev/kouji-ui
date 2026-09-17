import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KJ_OVERLAY_TITLE_HOST, overlayAccessibleName, type KjOverlayTitleHost } from '../dialog/dialog-title';
import { DRAWER_DRAG, DRAWER_SIDE, type KjDrawerSide } from './drawer.service';
import { KjDrawerRef } from './drawer.ref';

/** Downward drag fraction past which release dismisses (bottom side). */
const DEFAULT_DISMISS_THRESHOLD = 0.4;
/** Downward velocity (px/s) past which release dismisses (bottom side). */
const DEFAULT_DISMISS_VELOCITY = 600;

/**
 * Drawer body component. Composes {@link KjOverlayPanel} so the host element
 * inherits `role`, `[data-state]`, and the configured side strategy from
 * `KjDrawer.open()`, and names itself: a projected `[kjDrawerTitle]` becomes
 * `aria-labelledby`, else the `ariaLabelledBy` / `ariaLabel` passed to
 * `open()` (or the `kjAriaLabelledBy` / `kjAriaLabel` inputs) apply.
 * Preserves the optional drag-to-dismiss behaviour: when
 * `KjDrawer.open({ drag: true, side: 'bottom' })`, pointer-down on the host
 * starts a drag that calls `ref.close()` once the threshold is crossed.
 *
 * @doc-category Core/Overlay
 */
@Component({
  selector: 'kj-drawer',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel }],
  providers: [{ provide: KJ_OVERLAY_TITLE_HOST, useExisting: forwardRef(() => KjDrawer) }],
  host: {
    'class': 'kj-drawer',
    '[attr.aria-labelledby]': 'name.ariaLabelledBy()',
    '[attr.aria-label]': 'name.ariaLabel()',
    '[attr.data-kj-side]': 'side',
    '[attr.data-kj-dragging]': 'dragging() ? "" : null',
    '[style.touch-action]': 'dragging() ? "none" : null',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)':   'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
    '(keydown.escape)': 'onEscape()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjDrawer implements KjOverlayTitleHost {
  /** Resolved drawer side (provided by `KjDrawer.open`). */
  readonly side = inject<KjDrawerSide>(DRAWER_SIDE, { optional: true }) ?? 'right';
  /** Whether drag-to-dismiss is active for this drawer. */
  readonly drag = inject<boolean>(DRAWER_DRAG, { optional: true }) ?? false;
  /** Accessible name when no `[kjDrawerTitle]` is projected. */
  readonly kjAriaLabel = input<string | undefined>(undefined);
  /** Id of the element naming the drawer; wins over any title or label. */
  readonly kjAriaLabelledBy = input<string | undefined>(undefined);

  /** @internal */
  readonly name = overlayAccessibleName({ label: this.kjAriaLabel, labelledBy: this.kjAriaLabelledBy });

  /** @internal Adopts a `[kjDrawerTitle]` id for `aria-labelledby`. */
  registerTitle(id: string): () => void {
    return this.name.registerTitle(id);
  }

  private readonly ref = inject<KjDrawerRef<unknown>>(KjDrawerRef, { optional: true });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  private startY = 0;
  private startTime = 0;
  private pointerId: number | null = null;

  /**
   * Reactive flag for the `data-kj-dragging` / `touch-action` host bindings.
   * A signal, not a plain field behind a `computed` — a `computed` over a
   * non-reactive field never recomputes, so neither binding ever updated.
   */
  protected readonly dragging = signal(false);

  /** @internal */
  onPointerDown(event: PointerEvent): void {
    if (!this.drag) return;
    if (this.side !== 'bottom') return;
    if (event.button !== undefined && event.button !== 0) return;
    this.pointerId = event.pointerId;
    this.startY = event.clientY;
    this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.dragging.set(true);
    (event.target as Element | null)?.setPointerCapture?.(event.pointerId);
  }

  /** @internal */
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging()) return;
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    const offset = Math.max(0, event.clientY - this.startY);
    this.el.nativeElement.style.setProperty('--kj-drawer-drag-offset', `${offset}px`);
  }

  /** @internal */
  onPointerUp(event: PointerEvent): void {
    if (!this.dragging()) return;
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
    this.dragging.set(false);
    this.pointerId = null;
    this.el.nativeElement.style.removeProperty('--kj-drawer-drag-offset');
  }

  /** Close the drawer with an optional payload. */
  close(result?: unknown): void {
    (this.ref as KjDrawerRef<unknown, unknown> | null)?.close(result);
  }

  /** @internal Esc closes via the overlay-stack coordinator on the controller. */
  onEscape(): void {
    this.ref?.close();
  }
}
