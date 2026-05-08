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
  isDevMode,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  type KjDialogAutoFocusEvent,
  type KjDialogCloseEvent,
  type KjDialogCloseReason,
  nextDialogDescriptionId,
  nextDialogTitleId,
} from '../dialog/dialog.context';
import { KjDialogController } from '../dialog/dialog.controller';
import {
  KJ_ALERT_DIALOG,
  type KjAlertDialogContext,
} from './alert-dialog.context';

const ALERT_DIALOG_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Trigger that opens an alert dialog. Place on any button or interactive
 * element. Takes a `TemplateRef` input that defines the panel template.
 *
 * The template should contain `[kjAlertDialog]` (panel) — usually wrapped in
 * `[kjAlertDialogOverlay]` for the backdrop. Inside the panel use
 * `[kjAlertDialogTitle]`, `[kjAlertDialogDescription]` (REQUIRED for
 * `aria-describedby`), `[kjAlertDialogCancel]`, and `[kjAlertDialogAction]`.
 *
 * Composes the same {@link KjDialogController} as `[kjDialogTrigger]` so
 * overlay-stack registration, scroll-lock, focus capture/restore, and the
 * cancellable close cycle behave identically. The differences:
 *
 * - `role="alertdialog"` on the panel (not `dialog`).
 * - Backdrop click does NOT dismiss by default (`kjAlertDialogDismissOnBackdrop=false`).
 * - Default focus lands on `[kjAlertDialogCancel]` — safer for destructive
 *   confirmations (WCAG 3.3.4 Error Prevention).
 * - `aria-describedby` is required; dev-mode warns when missing.
 *
 * @example
 * ```html
 * <button kjButton [kjAlertDialogTrigger]="confirmDelete" kjAlertDialogDestructive>
 *   Delete account
 * </button>
 *
 * <ng-template #confirmDelete>
 *   <div kjAlertDialogOverlay>
 *     <div kjAlertDialog>
 *       <h2 kjAlertDialogTitle>Delete account?</h2>
 *       <p kjAlertDialogDescription>This cannot be undone.</p>
 *       <button kjAlertDialogCancel>Cancel</button>
 *       <button kjAlertDialogAction>Delete</button>
 *     </div>
 *   </div>
 * </ng-template>
 * ```
 *
 * @doc
 *  @doc-example Default
 *    @doc-file alert-dialog.example.ts
 *  @doc-example Destructive
 *    @doc-file alert-dialog.destructive.example.ts
 *  @doc-example With form
 *    @doc-file alert-dialog.with-form.example.ts
 *  @doc-example Async action
 *    @doc-file alert-dialog.async-action.example.ts
 * @category Library/Actions
 * @doc-name alert-dialog
 */
@Directive({
  selector: '[kjAlertDialogTrigger]',
  standalone: true,
  exportAs: 'kjAlertDialogTrigger',
  providers: [
    KjDialogController,
    { provide: KJ_ALERT_DIALOG, useExisting: KjAlertDialogTrigger },
  ],
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open().toString()',
    '[attr.aria-controls]': 'dialogId',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '(click)': 'openDialog()',
  },
})
export class KjAlertDialogTrigger implements KjAlertDialogContext {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** @internal Per-dialog state machine, shared with `KjDialog`. */
  readonly controller = inject(KjDialogController);

  /** The template projected into `document.body`. */
  readonly kjAlertDialogTrigger = input.required<TemplateRef<unknown>>();

  /** Whether Escape closes the dialog. Default `true`. */
  readonly kjAlertDialogCloseOnEscape = input<boolean, unknown>(true, { transform: booleanAttribute });

  /**
   * Whether backdrop click dismisses the dialog. **Default `false`** — the
   * intentional difference from `[kjDialogTrigger]`. Enable only when there
   * is no destructive consequence to a misclick.
   */
  readonly kjAlertDialogDismissOnBackdrop = input<boolean, unknown>(false, { transform: booleanAttribute });

  /**
   * When `true`, applies destructive styling to the action button (via the
   * shared {@link KjAlertDialogContext}). Default `false`.
   */
  readonly kjAlertDialogDestructive = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Where to place initial focus. Default `'cancel'`. */
  readonly kjAlertDialogDefaultFocus = input<'confirm' | 'cancel'>('cancel');

  /** Restore focus to the previously-focused element on close. Default `true`. */
  readonly kjAlertDialogRestoreFocus = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Lock `<body>` scroll while open. Default `true`. */
  readonly kjAlertDialogScrollLock = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Emits the value passed to `close(result)` — `true` confirm, `false` cancel. */
  readonly kjAlertDialogClosed = output<unknown>();

  /** Cancellable close cycle. Call `event.preventDefault()` to veto. */
  readonly kjCloseRequested = output<KjDialogCloseEvent>();

  /** Cancellable open auto-focus event. */
  readonly kjOpenAutoFocus = output<KjDialogAutoFocusEvent>();

  /** Cancellable close auto-focus (focus-restore) event. */
  readonly kjCloseAutoFocus = output<KjDialogAutoFocusEvent>();

  // ── KjAlertDialogContext ─────────────────────────────────────────────

  readonly open = this.controller.open;
  readonly dialogId = this.controller.dialogId;
  readonly titleId = this.controller.titleId;
  readonly descriptionId = this.controller.descriptionId;
  readonly closeOnEscape = computed(() => this.kjAlertDialogCloseOnEscape());
  readonly closeOnBackdrop = computed(() => this.kjAlertDialogDismissOnBackdrop());
  readonly destructive = computed(() => this.kjAlertDialogDestructive());
  readonly defaultFocus = computed(() => this.kjAlertDialogDefaultFocus());

  registerTitleId(id: string): void { this.controller.registerTitleId(id); }
  unregisterTitleId(id: string): void { this.controller.unregisterTitleId(id); }
  registerDescriptionId(id: string): void { this.controller.registerDescriptionId(id); }
  unregisterDescriptionId(id: string): void { this.controller.unregisterDescriptionId(id); }

  private readonly _cancelEl = signal<HTMLElement | null>(null);
  private readonly _confirmEl = signal<HTMLElement | null>(null);
  registerCancelEl(el: HTMLElement | null): void { this._cancelEl.set(el); }
  registerConfirmEl(el: HTMLElement | null): void { this._confirmEl.set(el); }

  private viewRef?: EmbeddedViewRef<unknown>;
  private containerEl?: HTMLElement;
  private panelEl?: HTMLElement;

  constructor() {
    this.controller.configure({
      emitCloseRequested: (ev) => this.kjCloseRequested.emit(ev),
      emitOpenAutoFocus: (ev) => this.kjOpenAutoFocus.emit(ev),
      emitCloseAutoFocus: (ev) => this.kjCloseAutoFocus.emit(ev),
      emitClosed: (result) => this.kjAlertDialogClosed.emit(result),
    });

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

  /** Programmatically open the alert dialog. */
  openDialog(): void {
    if (this.controller.open()) return;
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.kjAlertDialogRestoreFocus()) {
      this.controller.setFocusRestoreTarget(this.el.nativeElement);
    } else {
      this.controller.setFocusRestoreTarget(null);
    }
    this.controller.open$();
  }

  /** Public method exposed via {@link KjAlertDialogContext}. */
  close(result?: unknown, reason: KjDialogCloseReason = 'programmatic'): void {
    this.controller.requestClose(result, reason);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.controller.open()) return;
    if (!this.kjAlertDialogCloseOnEscape()) return;
    this.controller.hintCloseReason('escape');
  }

  private mount(): void {
    const tpl = this.kjAlertDialogTrigger();
    this.viewRef = tpl.createEmbeddedView(undefined as never, this.injector);
    this.appRef.attachView(this.viewRef);

    this.containerEl = document.createElement('div');
    this.containerEl.setAttribute('data-kj-alert-dialog-container', '');
    this.viewRef.rootNodes.forEach((node) => this.containerEl!.appendChild(node));
    document.body.appendChild(this.containerEl);

    const panel = this.containerEl.querySelector<HTMLElement>('[kjAlertDialog]')
      ?? this.containerEl.querySelector<HTMLElement>('[role="alertdialog"]')
      ?? this.containerEl;
    this.panelEl = panel;

    this.controller.registerPanel(panel);
    this.controller.registerWithStack({
      closeOnEscape: this.kjAlertDialogCloseOnEscape(),
      closeOnBackdrop: this.kjAlertDialogDismissOnBackdrop(),
      scrollLock: this.kjAlertDialogScrollLock(),
    });

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        if (this.panelEl) this.runDefaultFocus(this.panelEl);
      });
    } else {
      this.runDefaultFocus(panel);
    }
  }

  private runDefaultFocus(panel: HTMLElement): void {
    const target = this.kjAlertDialogDefaultFocus() === 'confirm'
      ? this._confirmEl() ?? this._cancelEl()
      : this._cancelEl() ?? this._confirmEl();

    if (target) {
      // Inject a temporary attribute marker so the controller's selector-
      // based runOpenAutoFocus targets exactly this element, going through
      // its cancellable kjOpenAutoFocus event pipeline.
      const marker = 'data-kj-alert-dialog-autofocus';
      target.setAttribute(marker, '');
      try {
        this.controller.runOpenAutoFocus(panel, `[${marker}]`);
      } finally {
        target.removeAttribute(marker);
      }
      return;
    }
    this.controller.runOpenAutoFocus(panel, true);
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
 * Panel container for the alert dialog. Place inside the template provided
 * to `[kjAlertDialogTrigger]`.
 *
 * Sets `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, and
 * `aria-describedby`. Implements an inline focus-trap (Tab cycles within
 * the panel) — required by `aria-modal="true"` to honour WCAG 2.1.2 *No
 * Keyboard Trap*. Export as `#dlg="kjAlertDialog"` to call `dlg.close(result?)`.
 *
 * Emits a dev-mode warning if no `[kjAlertDialogDescription]` is present:
 * the WAI-ARIA Alert Dialog Pattern requires a description.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 * @doc-description Headless alert-dialog panel for kouji-ui. Apply `[kjAlertDialog]` to the panel element inside a `[kjAlertDialogTrigger]` template to get `role="alertdialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby` wiring, and an inline focus-trap — the accessible primitive for destructive confirmation flows. Zero styling.
 * @doc-is-main
 */
@Directive({
  selector: '[kjAlertDialog]',
  standalone: true,
  exportAs: 'kjAlertDialog',
  host: {
    '[attr.role]': '"alertdialog"',
    '[attr.aria-modal]': '"true"',
    '[attr.id]': 'ctx.dialogId',
    '[attr.tabindex]': '"-1"',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-destructive]': 'ctx.destructive() ? "" : null',
    '[attr.aria-labelledby]': 'ctx.titleId()',
    '[attr.aria-describedby]': 'ctx.descriptionId()',
    '(click)': '$event.stopPropagation()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjAlertDialog {
  readonly ctx = inject(KJ_ALERT_DIALOG);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (isDevMode()) {
      // Defer the check by a microtask so projected description directives
      // have registered themselves with the context.
      queueMicrotask(() => {
        if (this.ctx.descriptionId() == null) {
          console.warn(
            '[kj] [kjAlertDialog] mounted without a [kjAlertDialogDescription]. The WAI-ARIA Alert Dialog Pattern requires a description for accessibility.',
          );
        }
      });
    }
  }

  /** Close the alert dialog with an optional payload (typically a boolean). */
  close(result?: unknown): void {
    this.ctx.close(result, 'programmatic');
  }

  /** Inline focus-trap — Tab cycles within the panel while open. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    if (!this.ctx.open()) return;
    const panel = this.el.nativeElement;
    const focusable = (Array.from(
      panel.querySelectorAll<HTMLElement>(ALERT_DIALOG_FOCUSABLE),
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
 * `[kjAlertDialog]`. Default behaviour: **does not** close on click — the
 * defining a11y characteristic of an alert dialog. Toggle via the
 * `kjAlertDialogDismissOnBackdrop` input on the trigger if a particular
 * usage is non-destructive enough to allow it.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Directive({
  selector: '[kjAlertDialogOverlay]',
  standalone: true,
  host: {
    'data-kj-alert-dialog-backdrop': '',
    '(click)': 'onOverlayClick()',
  },
})
export class KjAlertDialogOverlay {
  private readonly ctx = inject(KJ_ALERT_DIALOG);
  /** Per-instance toggle, ANDed with the trigger's `closeOnBackdrop`. */
  readonly kjAlertDialogOverlayCloseOnClick = input<boolean, unknown>(true, { transform: booleanAttribute });

  onOverlayClick(): void {
    if (!this.ctx.closeOnBackdrop()) return;
    if (!this.kjAlertDialogOverlayCloseOnClick()) return;
    this.ctx.close(false, 'backdrop');
  }
}

/**
 * Marks the alert-dialog title. Generates a stable id and registers it with
 * the context so `[kjAlertDialog]` wires `aria-labelledby` automatically.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Directive({
  selector: '[kjAlertDialogTitle]',
  standalone: true,
  host: { '[attr.id]': 'titleId' },
})
export class KjAlertDialogTitle {
  private readonly ctx = inject(KJ_ALERT_DIALOG);
  private readonly destroyRef = inject(DestroyRef);
  /** Stable id allocated at construction and registered with the context. */
  readonly titleId = nextDialogTitleId();

  constructor() {
    this.ctx.registerTitleId(this.titleId);
    this.destroyRef.onDestroy(() => this.ctx.unregisterTitleId(this.titleId));
  }
}

/**
 * Marks the alert-dialog description. **Required** for the WAI-ARIA Alert
 * Dialog Pattern: explains the consequence of the destructive action.
 * Registers a stable id with the context for `aria-describedby`.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Directive({
  selector: '[kjAlertDialogDescription]',
  standalone: true,
  host: { '[attr.id]': 'descriptionId' },
})
export class KjAlertDialogDescription {
  private readonly ctx = inject(KJ_ALERT_DIALOG);
  private readonly destroyRef = inject(DestroyRef);
  /** Stable id allocated at construction and registered with the context. */
  readonly descriptionId = nextDialogDescriptionId();

  constructor() {
    this.ctx.registerDescriptionId(this.descriptionId);
    this.destroyRef.onDestroy(() => this.ctx.unregisterDescriptionId(this.descriptionId));
  }
}

/**
 * Action (confirm / destructive) button slot. Click resolves `true`. The
 * styled wrapper layer renders this with `kjVariant="destructive"` when the
 * panel is in destructive mode.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Directive({
  selector: '[kjAlertDialogAction]',
  standalone: true,
  host: {
    'data-kj-alert-dialog-action': '',
    '[attr.data-destructive]': 'ctx.destructive() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class KjAlertDialogAction {
  readonly ctx = inject(KJ_ALERT_DIALOG);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.ctx.registerConfirmEl(this.el.nativeElement);
    this.destroyRef.onDestroy(() => this.ctx.registerConfirmEl(null));
  }

  protected onClick(event: Event): void {
    event.stopPropagation();
    this.ctx.close(true, 'close-button');
  }
}

/**
 * Cancel button slot. Click resolves `false`. **Receives initial focus** by
 * default — the WCAG 3.3.4 *Error Prevention* rationale for the alert-dialog
 * pattern.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Directive({
  selector: '[kjAlertDialogCancel]',
  standalone: true,
  host: {
    'data-kj-alert-dialog-cancel': '',
    '(click)': 'onClick($event)',
  },
})
export class KjAlertDialogCancel {
  private readonly ctx = inject(KJ_ALERT_DIALOG);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.ctx.registerCancelEl(this.el.nativeElement);
    this.destroyRef.onDestroy(() => this.ctx.registerCancelEl(null));
  }

  protected onClick(event: Event): void {
    event.stopPropagation();
    this.ctx.close(false, 'close-button');
  }
}
