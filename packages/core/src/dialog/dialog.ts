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
  output,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  KJ_DIALOG,
  type KjDialogAutoFocusEvent,
  type KjDialogCloseEvent,
  type KjDialogCloseReason,
  type KjDialogContext,
  nextDialogDescriptionId,
  nextDialogTitleId,
} from './dialog.context';
import { KjDialogController } from './dialog.controller';

/**
 * Trigger that opens a dialog. Place on any button or interactive element.
 * Takes a `TemplateRef` input that defines the full overlay structure.
 *
 * The template should contain `[kjDialogOverlay]` (backdrop) wrapping
 * `[kjDialog]` (panel). Inside the panel use `[kjDialogTitle]`,
 * `[kjDialogDescription]`, `[kjDialogContent]`, `[kjDialogActions]` and
 * `[kjDialogClose]` as needed. Export `kjDialog` (`#dlg="kjDialog"`) to call
 * `dlg.close(result?)`.
 *
 * Composes the shared `KjDialogController` so the directive path and the
 * service path both share the same overlay-stack registration (Esc /
 * outside-click coordination), body scroll-lock, focus capture / restore,
 * and cancellable close cycle.
 *
 * @example
 * ```html
 * <button kjButton [kjDialogTrigger]="myDialog" (kjDialogClosed)="onResult($event)">
 *   Open
 * </button>
 *
 * <ng-template #myDialog>
 *   <div kjDialogOverlay>
 *     <div kjDialog #dlg="kjDialog">
 *       <h2 kjDialogTitle>Title</h2>
 *       <p kjDialogDescription>Long-form description for AT.</p>
 *       <div kjDialogContent>…body…</div>
 *       <div kjDialogActions>
 *         <button kjDialogClose>Cancel</button>
 *         <button (click)="dlg.close('saved')">Save</button>
 *       </div>
 *     </div>
 *   </div>
 * </ng-template>
 * ```
 *
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file dialog.example.ts
 *    @doc-theme retro
 *      @doc-file dialog.retro.example.ts
 *    @doc-theme finance
 *      @doc-file dialog.finance.example.ts
 *  @doc-example Confirmation
 *    @doc-file dialog.confirm.example.ts
 * @category Core/Overlays
 * @doc-name dialog
 */
@Directive({
  selector: '[kjDialogTrigger]',
  standalone: true,
  exportAs: 'kjDialogTrigger',
  providers: [
    KjDialogController,
    { provide: KJ_DIALOG, useExisting: KjDialogTrigger },
  ],
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open().toString()',
    '[attr.aria-controls]': 'dialogId',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '(click)': 'openDialog()',
  },
})
export class KjDialogTrigger implements KjDialogContext {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** @internal Per-dialog state machine. */
  readonly controller = inject(KjDialogController);

  /** The template projected into `document.body`. */
  readonly kjDialogTrigger = input.required<TemplateRef<unknown>>();

  /** Whether Escape closes the dialog. */
  readonly kjDialogCloseOnEscape = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Whether backdrop (overlay) click closes the dialog. */
  readonly kjDialogCloseOnBackdrop = input<boolean, unknown>(true, { transform: booleanAttribute });

  /**
   * Auto-focus behaviour when the dialog opens. `false` to skip; string =
   * CSS selector resolved inside the panel.
   */
  readonly kjDialogAutoFocus = input<boolean | string>(true);

  /** Restore focus to the previously-focused element (the trigger) on close. */
  readonly kjDialogRestoreFocus = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Lock `<body>` scroll while open. */
  readonly kjDialogScrollLock = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Emits the value passed to `close(result)`. */
  readonly kjDialogClosed = output<unknown>();

  /** Cancellable close cycle. Call `event.preventDefault()` to veto. */
  readonly kjCloseRequested = output<KjDialogCloseEvent>();

  /** Cancellable open auto-focus event. */
  readonly kjOpenAutoFocus = output<KjDialogAutoFocusEvent>();

  /** Cancellable close auto-focus (focus-restore) event. */
  readonly kjCloseAutoFocus = output<KjDialogAutoFocusEvent>();

  // ── KjDialogContext ────────────────────────────────────────────────

  readonly open = this.controller.open;
  readonly dialogId = this.controller.dialogId;
  readonly titleId = this.controller.titleId;
  readonly descriptionId = this.controller.descriptionId;
  readonly closeOnEscape = computed(() => this.kjDialogCloseOnEscape());
  readonly closeOnBackdrop = computed(() => this.kjDialogCloseOnBackdrop());

  registerTitleId(id: string): void { this.controller.registerTitleId(id); }
  unregisterTitleId(id: string): void { this.controller.unregisterTitleId(id); }
  registerDescriptionId(id: string): void { this.controller.registerDescriptionId(id); }
  unregisterDescriptionId(id: string): void { this.controller.unregisterDescriptionId(id); }

  private viewRef?: EmbeddedViewRef<unknown>;
  private containerEl?: HTMLElement;
  private panelEl?: HTMLElement;

  constructor() {
    this.controller.configure({
      emitCloseRequested: (ev) => this.kjCloseRequested.emit(ev),
      emitOpenAutoFocus: (ev) => this.kjOpenAutoFocus.emit(ev),
      emitCloseAutoFocus: (ev) => this.kjCloseAutoFocus.emit(ev),
      emitClosed: (result) => this.kjDialogClosed.emit(result),
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

    this.destroyRef.onDestroy(() => this.unmount());
  }

  /** Programmatically open the dialog. */
  openDialog(): void {
    if (this.controller.open()) return;
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.kjDialogRestoreFocus()) {
      this.controller.setFocusRestoreTarget(this.el.nativeElement);
    } else {
      this.controller.setFocusRestoreTarget(null);
    }
    this.controller.open$();
  }

  /**
   * Public method exposed via `KjDialogContext`. Runs the cancellable
   * close cycle.
   */
  close(result?: unknown, reason: KjDialogCloseReason = 'programmatic'): void {
    this.controller.requestClose(result, reason);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // The overlay-stack coordinator handles Esc when the dialog is the
    // topmost — we just hint the close reason so the cancellable event
    // reports `'escape'` instead of `'backdrop'`.
    if (!this.controller.open()) return;
    if (!this.kjDialogCloseOnEscape()) return;
    this.controller.hintCloseReason('escape');
  }

  private mount(): void {
    const tpl = this.kjDialogTrigger();
    this.viewRef = tpl.createEmbeddedView(undefined as never, this.injector);
    this.appRef.attachView(this.viewRef);

    this.containerEl = document.createElement('div');
    this.containerEl.setAttribute('data-kj-dialog-container', '');
    this.viewRef.rootNodes.forEach((node) => this.containerEl!.appendChild(node));
    document.body.appendChild(this.containerEl);

    // The first child of the container that carries `[kjDialog]` is the
    // panel — we use it for stack content tracking and auto-focus.
    const panel = this.containerEl.querySelector<HTMLElement>('[kjDialog]')
      ?? this.containerEl.querySelector<HTMLElement>('[role="dialog"]')
      ?? this.containerEl;
    this.panelEl = panel;

    this.controller.registerPanel(panel);
    this.controller.registerWithStack({
      closeOnEscape: this.kjDialogCloseOnEscape(),
      closeOnBackdrop: this.kjDialogCloseOnBackdrop(),
      scrollLock: this.kjDialogScrollLock(),
    });

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        if (this.panelEl) this.controller.runOpenAutoFocus(this.panelEl, this.kjDialogAutoFocus());
      });
    } else {
      this.controller.runOpenAutoFocus(panel, this.kjDialogAutoFocus());
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

/** Focusable selector — mirrors the one used by `KjFocusTrap`. */
const DIALOG_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Panel container for the dialog. Place inside the template provided to
 * `[kjDialogTrigger]` (or the component rendered by `KjDialogService`).
 * Auto-sets `role="dialog"`, `aria-modal="true"`, and wires
 * `aria-labelledby` / `aria-describedby` from any projected `[kjDialogTitle]`
 * / `[kjDialogDescription]`.
 *
 * Implements an inline focus-trap (mirroring
 * {@link import('../a11y/focus-trap').KjFocusTrap}) so Tab cycles within the
 * panel while open — required for `aria-modal="true"` to honour WCAG 2.1.2
 * *No Keyboard Trap*. Export as `#dlg="kjDialog"` to call
 * `dlg.close(result?)`.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name dialog
 * @doc-is-main
 */
@Directive({
  selector: '[kjDialog]',
  standalone: true,
  exportAs: 'kjDialog',
  host: {
    '[attr.role]': '"dialog"',
    '[attr.aria-modal]': '"true"',
    '[attr.id]': 'ctx.dialogId',
    '[attr.tabindex]': '"-1"',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.aria-labelledby]': 'ctx.titleId()',
    '[attr.aria-describedby]': 'ctx.descriptionId()',
    '(click)': '$event.stopPropagation()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjDialog {
  readonly ctx = inject(KJ_DIALOG);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Close the dialog with an optional payload. */
  close(result?: unknown): void {
    this.ctx.close(result, 'programmatic');
  }

  /** Inline focus-trap — Tab cycles within the panel while the dialog is open. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    if (!this.ctx.open()) return;
    const panel = this.el.nativeElement;
    const focusable = (Array.from(
      panel.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE),
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
 * Backdrop / overlay element. Place inside the template wrapping `[kjDialog]`.
 *
 * Closes the dialog on click when both `[kjDialogOverlayCloseOnClick]`
 * (per-instance) AND the trigger's `closeOnBackdrop` are `true`. The
 * outside-click that originates from `KjOverlayService`'s capture-phase
 * coordinator handles cross-overlay nesting; this listener covers the
 * inline case where the click both starts and ends on the backdrop element.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name dialog
 */
@Directive({
  selector: '[kjDialogOverlay]',
  standalone: true,
  host: {
    'data-kj-dialog-backdrop': '',
    '(click)': 'onOverlayClick()',
  },
})
export class KjDialogOverlay {
  private readonly ctx = inject(KJ_DIALOG);
  /** Per-instance toggle, ANDed with the trigger's `closeOnBackdrop`. */
  readonly kjDialogOverlayCloseOnClick = input<boolean, unknown>(true, { transform: booleanAttribute });

  onOverlayClick(): void {
    if (!this.ctx.closeOnBackdrop()) return;
    if (!this.kjDialogOverlayCloseOnClick()) return;
    this.ctx.close(undefined, 'backdrop');
  }
}

/**
 * Marks the dialog title. Generates a stable id and registers it with the
 * dialog context so `[kjDialog]` can wire `aria-labelledby` automatically.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name dialog
 */
@Directive({
  selector: '[kjDialogTitle]',
  standalone: true,
  host: {
    '[attr.id]': 'titleId',
  },
})
export class KjDialogTitle {
  private readonly ctx = inject(KJ_DIALOG);
  private readonly destroyRef = inject(DestroyRef);
  /** Stable id allocated at construction and registered with the context. */
  readonly titleId = nextDialogTitleId();

  constructor() {
    this.ctx.registerTitleId(this.titleId);
    this.destroyRef.onDestroy(() => this.ctx.unregisterTitleId(this.titleId));
  }
}

/**
 * Marks the dialog description. Generates a stable id and registers it with
 * the dialog context so `[kjDialog]` can wire `aria-describedby`
 * automatically. Useful for confirmation modals where the body explains
 * the consequence of the action.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name dialog
 */
@Directive({
  selector: '[kjDialogDescription]',
  standalone: true,
  host: {
    '[attr.id]': 'descriptionId',
  },
})
export class KjDialogDescription {
  private readonly ctx = inject(KJ_DIALOG);
  private readonly destroyRef = inject(DestroyRef);
  /** Stable id allocated at construction and registered with the context. */
  readonly descriptionId = nextDialogDescriptionId();

  constructor() {
    this.ctx.registerDescriptionId(this.descriptionId);
    this.destroyRef.onDestroy(() => this.ctx.unregisterDescriptionId(this.descriptionId));
  }
}

/**
 * Structural-content slot inside the dialog panel. Adds no behaviour — only
 * a stable selector that wrappers can target with CSS for the body band.
 * Optional; consumers can omit it and use raw markup.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name dialog
 */
@Directive({
  selector: '[kjDialogContent]',
  standalone: true,
  host: { 'data-kj-dialog-content': '' },
})
export class KjDialogContent {}

/**
 * Action band slot inside the dialog panel. Adds no behaviour — only a
 * stable selector that wrappers can target for footer-button alignment.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name dialog
 */
@Directive({
  selector: '[kjDialogActions]',
  standalone: true,
  host: { 'data-kj-dialog-actions': '' },
})
export class KjDialogActions {}

/**
 * Closes the dialog on click (or Enter / Space when applied to a non-button)
 * with no result payload. For payloads use `#dlg="kjDialog"` then
 * `(click)="dlg.close(value)"`.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name dialog
 */
@Directive({
  selector: '[kjDialogClose]',
  standalone: true,
  host: {
    '(click)': 'onClose($event)',
  },
})
export class KjDialogClose {
  private readonly ctx = inject(KJ_DIALOG);

  protected onClose(event: Event): void {
    event.stopPropagation();
    this.ctx.close(undefined, 'close-button');
  }
}
