import {
  ApplicationRef, ComponentRef, EmbeddedViewRef,
  Injectable, InjectionToken, Injector,
  TemplateRef, Type, ViewContainerRef,
  createComponent, inject, signal,
} from '@angular/core';

/** Token for passing data to a programmatically opened dialog component. */
export const DIALOG_DATA = new InjectionToken<unknown>('KjDialogData');

/** Configuration for programmatically opened dialogs. */
export interface KjDialogOpenConfig<D = unknown> {
  /** Data to inject into the dialog component via `DIALOG_DATA`. */
  data?: D;
  /** Additional CSS classes for the dialog panel element. */
  panelClass?: string | string[];
  /** Where to focus when the dialog opens. Defaults to the first focusable element. */
  autoFocus?: boolean | string;
  /** Whether to restore focus to the trigger after the dialog closes. Defaults to `true`. */
  restoreFocus?: boolean | string;
  /** Panel width. */
  width?: string;
  /** Maximum panel width. */
  maxWidth?: string;
  /** Panel height. */
  height?: string;
  /** When `true`, clicking the backdrop or pressing Escape won't close the dialog. */
  disableClose?: boolean;
}

/**
 * Reference returned by `KjDialogService.open()`.
 * Use `close(result?)` to dismiss the dialog and emit the result.
 */
export class KjDialogRef<R = unknown> {
  private readonly _closed = signal<R | undefined>(undefined);
  private _closedCallbacks: Array<(result: R | undefined) => void> = [];

  /** @internal */
  constructor(
    private readonly container: HTMLElement,
    private readonly viewRef: EmbeddedViewRef<unknown> | ComponentRef<unknown>,
    private readonly appRef: ApplicationRef,
    private readonly previouslyFocused: Element | null,
    private readonly restoreFocus: boolean,
  ) {}

  /** Closes the dialog and emits `result` to subscribers. */
  close(result?: R): void {
    this.appRef.detachView(
      this.viewRef instanceof ComponentRef
        ? this.viewRef.hostView as EmbeddedViewRef<unknown>
        : this.viewRef,
    );
    this.viewRef.destroy();
    this.container.remove();

    if (this.restoreFocus && this.previouslyFocused instanceof HTMLElement) {
      this.previouslyFocused.focus();
    }

    this._closedCallbacks.forEach(cb => cb(result));
    this._closedCallbacks = [];
  }

  /**
   * Registers a callback invoked when the dialog closes.
   * @param cb - Callback receiving the close result.
   */
  afterClosed(cb: (result: R | undefined) => void): this {
    this._closedCallbacks.push(cb);
    return this;
  }
}

/**
 * Programmatic service for opening dialogs with components or templates.
 * The opened component can inject `DIALOG_DATA` for typed data and `KjDialogRef` to close itself.
 *
 * @example
 * ```ts
 * // Open a component as a dialog
 * private readonly dialog = inject(KjDialogService);
 *
 * openConfirm() {
 *   const ref = this.dialog.open(ConfirmDialogComponent, {
 *     data: { message: 'Delete this item?' },
 *   });
 *   ref.afterClosed(result => {
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
 * @category Core/Overlays/Dialog
 */
@Injectable({ providedIn: 'root' })
export class KjDialogService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);

  /**
   * Opens a component as a modal dialog.
   * @param content - Angular component type to render inside the dialog.
   * @param config - Optional configuration: data, panelClass, width, autoFocus, etc.
   * @returns A `KjDialogRef` whose `afterClosed()` fires when the dialog closes.
   */
  open<R = unknown, D = unknown, C = unknown>(
    content: Type<C> | TemplateRef<C>,
    config?: KjDialogOpenConfig<D>,
  ): KjDialogRef<R> {
    const container = document.createElement('div');
    container.setAttribute('data-kj-dialog-container', '');

    const previouslyFocused = document.activeElement;
    const restoreFocus = config?.restoreFocus !== false;

    const dialogRef = new KjDialogRef<R>(
      container,
      null as never, // filled below
      this.appRef,
      previouslyFocused,
      restoreFocus,
    );

    const childInjector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: DIALOG_DATA, useValue: config?.data },
        { provide: KjDialogRef, useValue: dialogRef },
      ],
    });

    let viewRef: EmbeddedViewRef<unknown> | ComponentRef<unknown>;

    if (content instanceof TemplateRef) {
      const vcr = this.appRef.components[0]?.injector.get(ViewContainerRef, null);
      if (!vcr) throw new Error('KjDialogService: no root ViewContainerRef available');
      viewRef = vcr.createEmbeddedView(content as TemplateRef<unknown>, {}, { injector: childInjector });
      this.appRef.attachView(viewRef as EmbeddedViewRef<unknown>);
      (viewRef as EmbeddedViewRef<unknown>).rootNodes.forEach(n => container.appendChild(n));
    } else {
      const compRef = createComponent(content as Type<unknown>, {
        environmentInjector: this.appRef.injector,
        elementInjector: childInjector,
      });
      this.appRef.attachView(compRef.hostView);
      container.appendChild((compRef.hostView as EmbeddedViewRef<unknown>).rootNodes[0]);
      viewRef = compRef;
    }

    // Patch the viewRef into the dialogRef (bypass readonly via cast)
    (dialogRef as unknown as { viewRef: typeof viewRef }).viewRef = viewRef;

    document.body.appendChild(container);

    // Auto-focus first tabbable element
    if (config?.autoFocus !== false) {
      const target = typeof config?.autoFocus === 'string'
        ? container.querySelector<HTMLElement>(config.autoFocus)
        : container.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
      target?.focus();
    }

    return dialogRef;
  }
}
