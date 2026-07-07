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
import {
  SHEET_ARIA_LABEL,
  SHEET_DETENT,
  SHEET_DISMISSIBLE,
  type KjSheetDetent,
} from './sheet.service';
import { KjSheetRef } from './sheet.ref';

/** Downward drag fraction past which release dismisses. */
const DEFAULT_DISMISS_THRESHOLD = 0.4;
/** Downward velocity (px/s) past which release dismisses. */
const DEFAULT_DISMISS_VELOCITY = 600;

/**
 * Bottom-sheet body component. Composes {@link KjOverlayPanel} so the host
 * inherits `role="dialog"`, `aria-modal`, `[data-state]`, and the bottom
 * edge-sheet position from `KjSheetService.open()`.
 *
 * Renders a grab handle (a real `<button>` for keyboard/click dismissal) and
 * hosts drag-to-dismiss: a downward pointer drag past 40% of the panel height
 * or 600 px/s velocity calls `ref.close()`. The drag mechanics mirror the
 * proven drawer bottom-drag path — no new gesture surface.
 *
 * @doc-category Core/Overlay
 */
@Component({
  selector: 'kj-sheet',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel }],
  host: {
    'class': 'kj-sheet',
    '[attr.data-kj-detent]': 'detent',
    '[attr.aria-label]': 'ariaLabel',
    '[attr.data-kj-dragging]': 'dragging() ? "" : null',
    '[style.touch-action]': 'dragging() ? "none" : null',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (dismissible) {
      <button
        type="button"
        class="kj-sheet__handle"
        aria-label="Close sheet"
        (click)="close()"
      >
        <span class="kj-sheet__grip" aria-hidden="true"></span>
      </button>
    }
    <div class="kj-sheet__content"><ng-content /></div>
  `,
})
export class KjSheet {
  /** Resolved initial detent (provided by `KjSheetService.open`). */
  readonly detent = inject<KjSheetDetent>(SHEET_DETENT, { optional: true }) ?? 'auto';
  /** Whether grab-handle + drag-to-dismiss is active. */
  readonly dismissible = inject<boolean>(SHEET_DISMISSIBLE, { optional: true }) ?? true;
  /** Fallback accessible name applied to the host when no heading is projected. */
  readonly ariaLabel = inject<string | null>(SHEET_ARIA_LABEL, { optional: true }) ?? null;

  private readonly ref = inject<KjSheetRef<unknown>>(KjSheetRef, { optional: true });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  private startY = 0;
  private startTime = 0;
  private pointerId: number | null = null;
  private _dragging = false;

  /** Reactive flag for the `data-kj-dragging` host binding. */
  protected dragging = computed(() => this._dragging);

  /** @internal */
  onPointerDown(event: PointerEvent): void {
    if (!this.dismissible) return;
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
    this.el.nativeElement.style.setProperty('--kj-sheet-drag-offset', `${offset}px`);
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
    this.el.nativeElement.style.removeProperty('--kj-sheet-drag-offset');
  }

  /** Close the sheet with an optional payload. */
  close(result?: unknown): void {
    (this.ref as KjSheetRef<unknown, unknown> | null)?.close(result);
  }

  /** Esc closes via the overlay-stack coordinator on the controller. */
  @HostListener('keydown.escape')
  onEscape(): void {
    this.ref?.close();
  }
}
