import {
  ApplicationRef,
  DestroyRef,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  HostListener,
  Injector,
  PLATFORM_ID,
  TemplateRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  KJ_DIALOG,
  type KjDialogAutoFocusEvent,
  type KjDialogCloseEvent,
  type KjDialogCloseReason,
  nextDialogDescriptionId,
  nextDialogTitleId,
} from '../dialog/dialog.context';
import { KjDialogController } from '../dialog/dialog.controller';
import {
  KJ_BOTTOM_SHEET,
  type KjBottomSheetContext,
} from './bottom-sheet.context';

/** Default downward drag fraction (of current snap height) past which release dismisses. */
const DEFAULT_DISMISS_THRESHOLD = 0.4;
/** Default downward velocity (px/s) past which release dismisses. */
const DEFAULT_DISMISS_VELOCITY = 600;

/** Focusable selector — mirrors the one used by `KjDialog`. */
const SHEET_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Trigger that opens a bottom sheet. Place on any button or interactive
 * element. Takes a `TemplateRef` input that defines the full overlay
 * structure (backdrop + panel).
 *
 * The bottom sheet inherits `KjDialog`'s lifecycle (mount, focus trap,
 * scroll lock, escape, restore-focus) via the shared `KjDialogController`.
 * The trigger additionally exposes snap-point state for the wrapper to
 * drive `transform: translateY(...)` animations.
 *
 * @example
 * ```html
 * <button kjButton [kjBottomSheetTrigger]="sheet">Open</button>
 *
 * <ng-template #sheet>
 *   <div kjBottomSheetOverlay>
 *     <div kjBottomSheetContent #s="kjBottomSheet">
 *       <div kjBottomSheetHandle></div>
 *       <h2 kjBottomSheetTitle>Title</h2>
 *       <p kjBottomSheetDescription>Body</p>
 *       <button kjBottomSheetClose>Close</button>
 *     </div>
 *   </div>
 * </ng-template>
 * ```
 *
 * @category Core/Overlays
 * @doc
 * @doc-name bottom-sheet
 * @doc-is-main
 */
@Directive({
  selector: '[kjBottomSheetTrigger]',
  standalone: true,
  exportAs: 'kjBottomSheetTrigger',
  providers: [
    KjDialogController,
    { provide: KJ_BOTTOM_SHEET, useExisting: KjBottomSheetTrigger },
    { provide: KJ_DIALOG, useExisting: KjBottomSheetTrigger },
  ],
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open().toString()',
    '[attr.aria-controls]': 'dialogId',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '(click)': 'openSheet()',
  },
})
export class KjBottomSheetTrigger implements KjBottomSheetContext {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** @internal Per-sheet state machine, shared with the dialog family. */
  readonly controller = inject(KjDialogController);

  /** The template projected into `document.body`. */
  readonly kjBottomSheetTrigger = input.required<TemplateRef<unknown>>();

  /**
   * Snap-points list, ordered closed → fullest. `0` is implicit and
   * represents the closed state. Numbers in (0, 1) are interpreted as
   * fraction of viewport height (e.g. `0.4` = 40 vh). Strings pass through
   * as CSS values (e.g. `'320px'`, `'70vh'`).
   */
  readonly kjSnapPoints = input<readonly (number | string)[]>([]);

  /** Two-way bindable active snap index. `-1` closes. */
  readonly kjActiveSnap = model<number>(-1);

  /** Optional labels for snap points; drives `aria-valuetext` on the handle. */
  readonly kjSnapLabels = input<readonly string[] | undefined>(undefined);

  /** Fraction of current snap height; downward drag past this dismisses on release. */
  readonly kjDismissThreshold = input<number>(DEFAULT_DISMISS_THRESHOLD);

  /** px/s; flick velocity downward past this dismisses regardless of position. */
  readonly kjDismissVelocity = input<number>(DEFAULT_DISMISS_VELOCITY);

  /** Whether Escape closes the sheet. */
  readonly kjBottomSheetCloseOnEscape = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Whether backdrop click closes the sheet. */
  readonly kjBottomSheetCloseOnBackdrop = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Auto-focus behaviour when the sheet opens. */
  readonly kjBottomSheetAutoFocus = input<boolean | string>(true);

  /** Restore focus to the trigger on close. */
  readonly kjBottomSheetRestoreFocus = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Lock `<body>` scroll while open. */
  readonly kjBottomSheetScrollLock = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Emits the value passed to `close(result)`. */
  readonly kjBottomSheetClosed = output<unknown>();

  /** Cancellable close cycle. Call `event.preventDefault()` to veto. */
  readonly kjCloseRequested = output<KjDialogCloseEvent>();

  /** Cancellable open auto-focus event. */
  readonly kjOpenAutoFocus = output<KjDialogAutoFocusEvent>();

  /** Cancellable close auto-focus event. */
  readonly kjCloseAutoFocus = output<KjDialogAutoFocusEvent>();

  /** Convenience output mirroring `[(kjActiveSnap)]` writes. */
  readonly kjActiveSnapChange = output<number>();

  // ── KjBottomSheetContext (extends KjDialogContext) ─────────────────

  readonly open = this.controller.open;
  readonly dialogId = this.controller.dialogId;
  readonly titleId = this.controller.titleId;
  readonly descriptionId = this.controller.descriptionId;
  readonly closeOnEscape = computed(() => this.kjBottomSheetCloseOnEscape());
  readonly closeOnBackdrop = computed(() => this.kjBottomSheetCloseOnBackdrop());

  readonly snapPoints = computed(() => this.kjSnapPoints());
  readonly snapLabels = computed(() => this.kjSnapLabels());
  readonly activeSnap = computed(() => this.kjActiveSnap());

  private readonly _dragOffset = signal(0);
  readonly dragOffset = this._dragOffset.asReadonly();

  private readonly _dragging = signal(false);
  readonly dragging = this._dragging.asReadonly();

  /** 0..1 openness ratio derived from the active snap index. */
  readonly dragProgress = computed(() => {
    const points = this.kjSnapPoints();
    const active = this.kjActiveSnap();
    if (active < 0 || !points.length) return 0;
    return (active + 1) / points.length;
  });

  registerTitleId(id: string): void { this.controller.registerTitleId(id); }
  unregisterTitleId(id: string): void { this.controller.unregisterTitleId(id); }
  registerDescriptionId(id: string): void { this.controller.registerDescriptionId(id); }
  unregisterDescriptionId(id: string): void { this.controller.unregisterDescriptionId(id); }

  setDragOffset(offset: number): void {
    this._dragOffset.set(offset);
  }
  setDragging(value: boolean): void {
    this._dragging.set(value);
  }

  /** Snap to a given index; `-1` closes the sheet. */
  snapTo(index: number): void {
    if (index < 0) {
      this.close();
      return;
    }
    const points = this.kjSnapPoints();
    if (!points.length) return;
    const clamped = Math.max(0, Math.min(index, points.length - 1));
    this.kjActiveSnap.set(clamped);
    this.kjActiveSnapChange.emit(clamped);
  }

  /**
   * Commit a drag gesture. Either snaps to the nearest snap or dismisses
   * if the drag passed the dismiss threshold or velocity.
   */
  commitDrag(offset: number, velocity: number): void {
    this._dragging.set(false);
    this._dragOffset.set(0);
    const points = this.kjSnapPoints();
    if (!points.length) {
      // Single-state sheet: any meaningful downward drag dismisses.
      if (offset > 0 && (velocity > this.kjDismissVelocity() || offset > 80)) {
        this.close();
      }
      return;
    }
    const active = this.kjActiveSnap();
    if (active < 0) return;
    const threshold = this.kjDismissThreshold();
    if (velocity > this.kjDismissVelocity()) {
      // Downward flick — step down, possibly to dismissal.
      this.snapTo(active - 1);
      return;
    }
    // Threshold-based: rough "cross half this snap → step down".
    if (offset > 0 && offset > 40 && offset / 200 >= threshold) {
      this.snapTo(active - 1);
      return;
    }
    // No-op — wrapper animates back to current snap.
  }

  // ── KjDialogContext.close ───────────────────────────────────────────

  close(result?: unknown, reason: KjDialogCloseReason = 'programmatic'): void {
    this.controller.requestClose(result, reason);
  }

  private viewRef?: EmbeddedViewRef<unknown>;
  private containerEl?: HTMLElement;
  private panelEl?: HTMLElement;

  constructor() {
    this.controller.configure({
      emitCloseRequested: (ev) => this.kjCloseRequested.emit(ev),
      emitOpenAutoFocus: (ev) => this.kjOpenAutoFocus.emit(ev),
      emitCloseAutoFocus: (ev) => this.kjCloseAutoFocus.emit(ev),
      emitClosed: (result) => {
        this.kjActiveSnap.set(-1);
        this.kjBottomSheetClosed.emit(result);
      },
    });

    // Synchronise mount / unmount with the controller's `open` signal.
    effect(() => {
      const isOpen = this.controller.open();
      if (!isPlatformBrowser(this.platformId)) return;
      if (isOpen && !this.viewRef) {
        this.mount();
      } else if (!isOpen && this.viewRef) {
        this.unmount();
      }
    });

    // When `kjActiveSnap` is bound to `-1` programmatically while open,
    // route it through the cancellable close cycle.
    effect(() => {
      const active = this.kjActiveSnap();
      if (active === -1 && this.controller.open()) {
        this.controller.requestClose(undefined, 'programmatic');
      }
    });

    this.destroyRef.onDestroy(() => this.unmount());
  }

  /** Programmatically open the sheet. */
  openSheet(): void {
    if (this.controller.open()) return;
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.kjBottomSheetRestoreFocus()) {
      this.controller.setFocusRestoreTarget(this.el.nativeElement);
    } else {
      this.controller.setFocusRestoreTarget(null);
    }
    // Default the active snap to "fullest" on open.
    const points = this.kjSnapPoints();
    if (this.kjActiveSnap() < 0) {
      this.kjActiveSnap.set(points.length ? points.length - 1 : 0);
    }
    this.controller.open$();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.controller.open()) return;
    if (!this.kjBottomSheetCloseOnEscape()) return;
    this.controller.hintCloseReason('escape');
  }

  private mount(): void {
    const tpl = this.kjBottomSheetTrigger();
    this.viewRef = tpl.createEmbeddedView(undefined as never, this.injector);
    this.appRef.attachView(this.viewRef);

    this.containerEl = document.createElement('div');
    this.containerEl.setAttribute('data-kj-bottom-sheet-container', '');
    this.viewRef.rootNodes.forEach((node) => this.containerEl!.appendChild(node));
    document.body.appendChild(this.containerEl);

    const panel = this.containerEl.querySelector<HTMLElement>('[kjBottomSheetContent]')
      ?? this.containerEl.querySelector<HTMLElement>('[role="dialog"]')
      ?? this.containerEl;
    this.panelEl = panel;

    this.controller.registerPanel(panel);
    this.controller.registerWithStack({
      closeOnEscape: this.kjBottomSheetCloseOnEscape(),
      closeOnBackdrop: this.kjBottomSheetCloseOnBackdrop(),
      scrollLock: this.kjBottomSheetScrollLock(),
    });

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        if (this.panelEl) this.controller.runOpenAutoFocus(this.panelEl, this.kjBottomSheetAutoFocus());
      });
    } else {
      this.controller.runOpenAutoFocus(panel, this.kjBottomSheetAutoFocus());
    }
  }

  private unmount(): void {
    if (this.viewRef) {
      try {
        this.appRef.detachView(this.viewRef);
        this.viewRef.destroy();
      } catch {
        /* ignore */
      }
      this.viewRef = undefined;
    }
    this.containerEl?.remove();
    this.containerEl = undefined;
    this.panelEl = undefined;
  }
}

/**
 * Panel container for the bottom sheet. Place inside the template provided
 * to `[kjBottomSheetTrigger]`. Auto-sets `role="dialog"`,
 * `aria-modal="true"`, and wires `aria-labelledby` / `aria-describedby`
 * from any projected `[kjBottomSheetTitle]` / `[kjBottomSheetDescription]`.
 *
 * Implements an inline focus-trap so Tab cycles within the panel while
 * open. Exports as `kjBottomSheet` so consumers can call `s.close(result?)`
 * via a template reference.
 *
 * Reflects `data-kj-snap-index`, `data-kj-snap-count`, and
 * `data-kj-dragging` attributes; the wrapper uses these (plus the CSS
 * custom property `--kj-bottom-sheet-progress`) to drive its slide
 * animation.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name bottom-sheet
 */
@Directive({
  selector: '[kjBottomSheetContent]',
  standalone: true,
  exportAs: 'kjBottomSheet',
  host: {
    '[attr.role]': '"dialog"',
    '[attr.aria-modal]': '"true"',
    '[attr.id]': 'ctx.dialogId',
    '[attr.tabindex]': '"-1"',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-kj-placement]': '"bottom"',
    '[attr.data-kj-snap-index]': 'ctx.activeSnap()',
    '[attr.data-kj-snap-count]': 'ctx.snapPoints().length',
    '[attr.data-kj-dragging]': 'ctx.dragging() ? "" : null',
    '[attr.aria-labelledby]': 'ctx.titleId()',
    '[attr.aria-describedby]': 'ctx.descriptionId()',
    '[style.--kj-bottom-sheet-progress]': 'ctx.dragProgress()',
    '[style.--kj-bottom-sheet-drag-offset.px]': 'ctx.dragOffset()',
    '(click)': '$event.stopPropagation()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjBottomSheetContent {
  readonly ctx = inject(KJ_BOTTOM_SHEET);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Close the sheet with an optional payload. */
  close(result?: unknown): void {
    this.ctx.close(result, 'programmatic');
  }

  /** Inline focus-trap — Tab cycles within the panel while open. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    if (!this.ctx.open()) return;
    const panel = this.el.nativeElement;
    const focusable = (Array.from(
      panel.querySelectorAll<HTMLElement>(SHEET_FOCUSABLE),
    )).filter((node) => !node.closest('[hidden]'));

    if (!focusable.length) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || !panel.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !panel.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Backdrop / overlay element. Place inside the template wrapping
 * `[kjBottomSheetContent]`.
 *
 * Closes the sheet on click when both `[kjBottomSheetOverlayCloseOnClick]`
 * (per-instance) AND the trigger's `closeOnBackdrop` are `true`.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name bottom-sheet
 */
@Directive({
  selector: '[kjBottomSheetOverlay]',
  standalone: true,
  host: {
    'data-kj-bottom-sheet-backdrop': '',
    '[style.--kj-bottom-sheet-progress]': 'ctx.dragProgress()',
    '(click)': 'onOverlayClick()',
  },
})
export class KjBottomSheetOverlay {
  protected readonly ctx = inject(KJ_BOTTOM_SHEET);

  /** Per-instance toggle, ANDed with the trigger's `closeOnBackdrop`. */
  readonly kjBottomSheetOverlayCloseOnClick = input<boolean, unknown>(true, { transform: booleanAttribute });

  onOverlayClick(): void {
    if (!this.ctx.closeOnBackdrop()) return;
    if (!this.kjBottomSheetOverlayCloseOnClick()) return;
    this.ctx.close(undefined, 'backdrop');
  }
}

/**
 * Marks the bottom-sheet title. Generates a stable id and registers it with
 * the context so `[kjBottomSheetContent]` can wire `aria-labelledby`
 * automatically.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name bottom-sheet
 */
@Directive({
  selector: '[kjBottomSheetTitle]',
  standalone: true,
  host: {
    '[attr.id]': 'titleId',
  },
})
export class KjBottomSheetTitle {
  private readonly ctx = inject(KJ_BOTTOM_SHEET);
  private readonly destroyRef = inject(DestroyRef);
  /** Stable id allocated at construction and registered with the context. */
  readonly titleId = nextDialogTitleId();

  constructor() {
    this.ctx.registerTitleId(this.titleId);
    this.destroyRef.onDestroy(() => this.ctx.unregisterTitleId(this.titleId));
  }
}

/**
 * Marks the bottom-sheet description. Generates a stable id and registers
 * it with the context so `[kjBottomSheetContent]` can wire
 * `aria-describedby` automatically.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name bottom-sheet
 */
@Directive({
  selector: '[kjBottomSheetDescription]',
  standalone: true,
  host: {
    '[attr.id]': 'descriptionId',
  },
})
export class KjBottomSheetDescription {
  private readonly ctx = inject(KJ_BOTTOM_SHEET);
  private readonly destroyRef = inject(DestroyRef);
  /** Stable id allocated at construction and registered with the context. */
  readonly descriptionId = nextDialogDescriptionId();

  constructor() {
    this.ctx.registerDescriptionId(this.descriptionId);
    this.destroyRef.onDestroy(() => this.ctx.unregisterDescriptionId(this.descriptionId));
  }
}

/**
 * Closes the bottom sheet on click. For payloads, capture the panel as
 * `#s="kjBottomSheet"` and call `s.close(value)`.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name bottom-sheet
 */
@Directive({
  selector: '[kjBottomSheetClose]',
  standalone: true,
  host: {
    '(click)': 'onClose($event)',
  },
})
export class KjBottomSheetClose {
  private readonly ctx = inject(KJ_BOTTOM_SHEET);

  protected onClose(event: Event): void {
    event.stopPropagation();
    this.ctx.close(undefined, 'close-button');
  }
}

/**
 * Drag-handle / slider affordance. Apply on a focusable element inside the
 * panel. Drives the drag-to-dismiss / drag-to-snap gesture and exposes
 * `role="slider"` semantics for keyboard users (when `kjSnapPoints` is
 * non-empty) — ArrowUp / ArrowDown change the active snap, ArrowDown at
 * index 0 dismisses, Home / End jump to the smallest / largest snap.
 *
 * Without snap points the handle behaves as a close button: Enter / Space
 * dismiss the sheet.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name bottom-sheet
 */
@Directive({
  selector: '[kjBottomSheetHandle]',
  standalone: true,
  host: {
    '[attr.role]': 'role()',
    '[attr.aria-orientation]': 'isSlider() ? "vertical" : null',
    '[attr.aria-valuemin]': 'isSlider() ? 0 : null',
    '[attr.aria-valuemax]': 'isSlider() ? valueMax() : null',
    '[attr.aria-valuenow]': 'isSlider() ? valueNow() : null',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-label]': '"Resize sheet"',
    '[attr.aria-disabled]': 'kjDisabled() ? "true" : null',
    '[attr.tabindex]': 'kjDisabled() ? "-1" : "0"',
    '[attr.data-kj-dragging]': 'ctx.dragging() ? "" : null',
    '[style.touch-action]': 'ctx.dragging() ? "none" : "auto"',
    '(keydown)': 'onKeydown($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
  },
})
export class KjBottomSheetHandle {
  protected readonly ctx = inject(KJ_BOTTOM_SHEET);

  /** Disable the handle (no drag, no slider keys, removed from tab order). */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  protected readonly role = computed(() =>
    this.ctx.snapPoints().length > 1 ? 'slider' : 'button',
  );
  protected readonly isSlider = computed(() => this.role() === 'slider');
  protected readonly valueMax = computed(() =>
    Math.max(0, this.ctx.snapPoints().length - 1),
  );
  protected readonly valueNow = computed(() =>
    Math.max(0, this.ctx.activeSnap()),
  );
  protected readonly valueText = computed(() => {
    if (this.role() !== 'slider') return null;
    const labels = this.ctx.snapLabels();
    if (!labels) return null;
    const idx = Math.max(0, this.ctx.activeSnap());
    return labels[idx] ?? null;
  });

  private startY: number | null = null;
  private startTime = 0;
  private lastY = 0;
  private lastTime = 0;
  private pointerId: number | null = null;

  protected onKeydown(event: KeyboardEvent): void {
    if (this.kjDisabled()) return;
    const points = this.ctx.snapPoints();
    const active = this.ctx.activeSnap();

    if (this.role() === 'slider') {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          this.ctx.snapTo(Math.min(points.length - 1, active + 1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          if (active <= 0) {
            this.ctx.snapTo(-1);
          } else {
            this.ctx.snapTo(active - 1);
          }
          return;
        case 'Home':
          event.preventDefault();
          this.ctx.snapTo(0);
          return;
        case 'End':
          event.preventDefault();
          this.ctx.snapTo(points.length - 1);
          return;
        default:
          return;
      }
    }
    // Single-state: behave like a close button.
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.ctx.snapTo(-1);
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.kjDisabled()) return;
    if (event.button !== undefined && event.button !== 0) return;
    this.pointerId = event.pointerId;
    this.startY = event.clientY;
    this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lastY = event.clientY;
    this.lastTime = this.startTime;
    this.ctx.setDragging(true);
    (event.target as Element | null)?.setPointerCapture?.(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.startY === null) return;
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    const offset = Math.max(0, event.clientY - this.startY);
    this.ctx.setDragOffset(offset);
    this.lastY = event.clientY;
    this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.startY === null) return;
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dy = event.clientY - (this.startY ?? event.clientY);
    const dt = Math.max(1, now - this.startTime);
    const velocity = (dy / dt) * 1000; // px/s, downward positive
    this.startY = null;
    this.pointerId = null;
    this.ctx.commitDrag(Math.max(0, dy), Math.max(0, velocity));
  }

  protected onPointerCancel(event: PointerEvent): void {
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    this.startY = null;
    this.pointerId = null;
    this.ctx.setDragging(false);
    this.ctx.setDragOffset(0);
  }
}

/**
 * Convenience alias for `[kjBottomSheetTrigger]`. Use as `[kjBottomSheet]`
 * on a panel via `KjBottomSheetContent`'s exportAs (`#s="kjBottomSheet"`).
 *
 * Re-exports all family directives for tree-shakable single-import.
 *
 * @category Core/Overlays
 */
export const KJ_BOTTOM_SHEET_DIRECTIVES = [
  KjBottomSheetTrigger,
  KjBottomSheetContent,
  KjBottomSheetOverlay,
  KjBottomSheetTitle,
  KjBottomSheetDescription,
  KjBottomSheetClose,
  KjBottomSheetHandle,
] as const;

/**
 * Alias for {@link KjBottomSheetTrigger}. Mirrors `KjDialog`'s convention
 * where `KjDialog` (the panel) and `KjDialogTrigger` (the activator) are
 * separate symbols. Consumers can refer to the panel as `KjBottomSheet`
 * and the trigger as `KjBottomSheetTrigger`.
 */
export { KjBottomSheetContent as KjBottomSheet };
