import {
  ApplicationRef,
  ComponentRef,
  EmbeddedViewRef,
  EnvironmentInjector,
  Injectable,
  InjectionToken,
  Injector,
  TemplateRef,
  Type,
  createComponent,
  inject,
  signal,
} from '@angular/core';
import {
  KJ_DIALOG,
  type KjDialogAutoFocusEvent,
  type KjDialogCloseEvent,
  type KjDialogCloseReason,
  type KjDialogContext,
} from './dialog.context';
import { KjDialogController } from './dialog.controller';

/** Token for passing data to a programmatically opened dialog component. */
export const DIALOG_DATA = new InjectionToken<unknown>('KjDialogData');

/** Configuration for programmatically opened dialogs. */
export interface KjDialogOpenConfig<D = unknown> {
  /** Data to inject into the dialog component via `DIALOG_DATA`. */
  data?: D;
  /** Additional CSS classes for the dialog container element. */
  panelClass?: string | string[];
  /** Where to focus when the dialog opens. Defaults to the first focusable element. */
  autoFocus?: boolean | string;
  /** Whether to restore focus to the trigger after the dialog closes. Defaults to `true`. */
  restoreFocus?: boolean;
  /** Lock `<body>` scroll while open. Defaults to `true`. */
  scrollLock?: boolean;
  /** Panel width. */
  width?: string;
  /** Maximum panel width. */
  maxWidth?: string;
  /** Panel height. */
  height?: string;
  /** When `true`, both Escape and backdrop close paths are suppressed. */
  disableClose?: boolean;
  /**
   * Forwarded to the dialog panel as `aria-labelledby`. Use when the rendered
   * component does not project its own `[kjDialogTitle]`.
   */
  ariaLabelledBy?: string;
  /**
   * Forwarded to the dialog panel as `aria-describedby`. Use when the
   * rendered component does not project its own `[kjDialogDescription]`.
   */
  ariaDescribedBy?: string;
  /**
   * Optional injector to use as the parent of the dialog's element-injector.
   * Defaults to the service's root injector — pass a component-local injector
   * to give the dialog access to component-scoped providers.
   */
  injector?: Injector;
}

/**
 * Reference returned by `KjDialogService.open()`.
 * Use `close(result?)` to dismiss the dialog and emit the result through
 * `afterClosed()`. Subscribe to `closeRequested` to veto a close.
 */
export class KjDialogRef<R = unknown> {
  /**
   * Mutable signal that disables both Escape and backdrop close paths when
   * `true`. Useful for "saving…" states where the dialog should stay up
   * until the async work resolves.
   */
  readonly disableClose: ReturnType<typeof signal<boolean>>;

  private _closedCallbacks: Array<(result: R | undefined) => void> = [];
  private _closeRequestedCallbacks: Array<(event: KjDialogCloseEvent) => void> = [];

  /** @internal */
  constructor(private readonly controller: KjDialogController) {
    this.disableClose = controller.disableClose;
    controller.disableClose.set(false);
  }

  /** Closes the dialog and emits `result` to `afterClosed` subscribers. */
  close(result?: R): void {
    this.controller.requestClose(result, 'programmatic');
  }

  /**
   * Registers a callback invoked when the dialog finishes closing.
   * @param cb - Callback receiving the close result.
   */
  afterClosed(cb: (result: R | undefined) => void): this {
    this._closedCallbacks.push(cb);
    return this;
  }

  /**
   * Registers a callback invoked before each close attempt. Call
   * `event.preventDefault()` to veto.
   */
  closeRequested(cb: (event: KjDialogCloseEvent) => void): this {
    this._closeRequestedCallbacks.push(cb);
    return this;
  }

  /** @internal */
  _emitClosed(result: unknown): void {
    this._closedCallbacks.forEach((cb) => cb(result as R | undefined));
    this._closedCallbacks = [];
  }

  /** @internal */
  _emitCloseRequested(event: KjDialogCloseEvent): void {
    this._closeRequestedCallbacks.forEach((cb) => cb(event));
  }
}

/**
 * Programmatic service for opening dialogs with components or templates.
 *
 * Shares the `KjDialogController` machinery with the declarative path
 * (`[kjDialogTrigger]`), so a dialog opened through `KjDialogService.open`
 * gets the same overlay-stack registration (`KjOverlayService`), body
 * scroll-lock, focus capture / restore, cancellable close cycle, and
 * inline focus-trap as one opened from a template.
 *
 * Components rendered by `open()` can inject `DIALOG_DATA` for typed data
 * and `KjDialogRef` to close themselves; they can also use the same
 * `[kjDialog]` / `[kjDialogTitle]` / `[kjDialogClose]` directives because
 * the service provides a synthesised `KJ_DIALOG` context bound to the ref.
 *
 * @example
 * ```ts
 * private readonly dialog = inject(KjDialogService);
 *
 * openConfirm() {
 *   const ref = this.dialog.open(ConfirmDialogComponent, {
 *     data: { message: 'Delete this item?' },
 *   });
 *   ref.afterClosed((result) => {
 *     if (result) this.doDelete();
 *   });
 * }
 * ```
 *
 * ```ts
 * // Inside ConfirmDialogComponent
 * readonly data = inject<{ message: string }>(DIALOG_DATA);
 * readonly ref = inject(KjDialogRef);
 * confirm() { this.ref.close(true); }
 * cancel() { this.ref.close(false); }
 * ```
 *
 * @category Core/Overlays
 */
@Injectable({ providedIn: 'root' })
export class KjDialogService {
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly rootInjector = inject(Injector);

  /**
   * Opens a component or template as a modal dialog.
   *
   * @param content - Angular component type or `TemplateRef` to render
   *   inside the dialog.
   * @param config - Optional configuration: data, panelClass, width,
   *   autoFocus, scrollLock, disableClose, etc.
   * @returns A {@link KjDialogRef} whose `afterClosed()` fires when the
   *   dialog finishes closing.
   */
  open<R = unknown, D = unknown, C = unknown>(
    content: Type<C> | TemplateRef<C>,
    config?: KjDialogOpenConfig<D>,
  ): KjDialogRef<R> {
    const previouslyFocused = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;

    // Build the controller via DI so it gets `KjOverlayService`,
    // `DestroyRef`, and `PLATFORM_ID` — same machinery the directive path
    // uses. Use a transient injector that scopes the controller's destroy.
    const controllerInjector = Injector.create({
      parent: config?.injector ?? this.rootInjector,
      providers: [KjDialogController],
    });
    const controller = controllerInjector.get(KjDialogController);

    const dialogRef = new KjDialogRef<R>(controller);

    // Synthesise a KjDialogContext for the rendered content's directive tree.
    const closeOnEscape = signal(!config?.disableClose);
    const closeOnBackdrop = signal(!config?.disableClose);

    const synthesisedContext: KjDialogContext = {
      open: controller.open,
      dialogId: controller.dialogId,
      titleId: controller.titleId,
      descriptionId: controller.descriptionId,
      closeOnEscape: closeOnEscape.asReadonly(),
      closeOnBackdrop: closeOnBackdrop.asReadonly(),
      registerTitleId: (id) => controller.registerTitleId(id),
      unregisterTitleId: (id) => controller.unregisterTitleId(id),
      registerDescriptionId: (id) => controller.registerDescriptionId(id),
      unregisterDescriptionId: (id) => controller.unregisterDescriptionId(id),
      close: (result, reason: KjDialogCloseReason = 'programmatic') => {
        controller.requestClose(result, reason);
      },
    };

    const childInjector = Injector.create({
      parent: config?.injector ?? this.rootInjector,
      providers: [
        { provide: DIALOG_DATA, useValue: config?.data },
        { provide: KjDialogRef, useValue: dialogRef },
        { provide: KJ_DIALOG, useValue: synthesisedContext },
      ],
    });

    // Build the body-level container *before* rendering so we can mount
    // into it directly — same approach as the trigger directive.
    const container = document.createElement('div');
    container.setAttribute('data-kj-dialog-container', '');
    container.setAttribute('role', 'presentation');

    if (config?.panelClass) {
      const list = Array.isArray(config.panelClass) ? config.panelClass : [config.panelClass];
      list.filter(Boolean).forEach((c) => container.classList.add(c));
    }

    let viewRef: EmbeddedViewRef<unknown> | ComponentRef<unknown>;

    if (content instanceof TemplateRef) {
      // Create the embedded view directly through the TemplateRef so the
      // child injector (with KJ_DIALOG / DIALOG_DATA / KjDialogRef) is
      // available to anything inside the template. ApplicationRef owns the
      // view lifecycle — no need for a host VCR.
      viewRef = (content as TemplateRef<unknown>).createEmbeddedView(undefined as never, childInjector);
      this.appRef.attachView(viewRef);
      (viewRef as EmbeddedViewRef<unknown>).rootNodes.forEach((n) => container.appendChild(n));
    } else {
      const compRef = createComponent(content as Type<unknown>, {
        environmentInjector: this.envInjector,
        elementInjector: childInjector,
      });
      this.appRef.attachView(compRef.hostView);
      const hostNode = (compRef.hostView as EmbeddedViewRef<unknown>).rootNodes[0] as Node;
      container.appendChild(hostNode);
      viewRef = compRef;
    }

    // Resolve the panel element. The rendered tree may host `[kjDialog]`
    // directly (preferred); otherwise fall back to the container for
    // outside-click detection.
    const panelEl = (container.querySelector<HTMLElement>('[kjDialog]')
      ?? container.querySelector<HTMLElement>('[role="dialog"]')
      ?? container);

    if (config?.ariaLabelledBy) panelEl.setAttribute('aria-labelledby', config.ariaLabelledBy);
    if (config?.ariaDescribedBy) panelEl.setAttribute('aria-describedby', config.ariaDescribedBy);
    if (config?.width) panelEl.style.width = config.width;
    if (config?.maxWidth) panelEl.style.maxWidth = config.maxWidth;
    if (config?.height) panelEl.style.height = config.height;

    document.body.appendChild(container);

    // Configure the controller bridge — emit closed via the dialogRef and
    // tear down the view + container on the close commit.
    controller.configure({
      emitCloseRequested: (ev) => dialogRef._emitCloseRequested(ev),
      emitOpenAutoFocus: (_ev: KjDialogAutoFocusEvent) => { /* no-op for service path */ },
      emitCloseAutoFocus: (_ev: KjDialogAutoFocusEvent) => { /* no-op */ },
      emitClosed: (result) => {
        try {
          if (viewRef instanceof ComponentRef) {
            this.appRef.detachView(viewRef.hostView);
          } else {
            this.appRef.detachView(viewRef);
          }
          (viewRef as { destroy(): void }).destroy();
        } catch {
          /* ignore */
        }
        container.remove();
        dialogRef._emitClosed(result);
      },
    });

    if (config?.restoreFocus !== false) {
      controller.setFocusRestoreTarget(previouslyFocused);
    } else {
      controller.setFocusRestoreTarget(null);
    }

    controller.registerPanel(panelEl);
    controller.registerWithStack({
      closeOnEscape: !config?.disableClose,
      closeOnBackdrop: !config?.disableClose,
      scrollLock: config?.scrollLock !== false,
    });

    // Mark open BEFORE auto-focus so the focus-trap reacts.
    controller.open$();

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => controller.runOpenAutoFocus(panelEl, config?.autoFocus ?? true));
    } else {
      controller.runOpenAutoFocus(panelEl, config?.autoFocus ?? true);
    }

    return dialogRef;
  }
}
