import {
  ApplicationRef, Directive, DestroyRef, EmbeddedViewRef,
  HostListener, Injector, TemplateRef,
  computed, inject, input, output, signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KJ_DIALOG, KjDialogContext } from './dialog.context';

let _dialogIdCounter = 0;

/**
 * Trigger that opens the dialog. Place on any button or interactive element.
 * Takes a `TemplateRef` input that defines the full overlay structure.
 *
 * The template should contain `[kjDialogOverlay]` (backdrop) wrapping `[kjDialog]` (panel).
 * Inside the panel use `[kjDialogTitle]` and `[kjDialogClose]`.
 * Export `kjDialog` as a template ref (`#dlg="kjDialog"`) to call `dlg.close(result?)`.
 *
 * @example
 * ```html
 * <button kjButton [kjDialogTrigger]="myDialog" (kjDialogClosed)="onResult($event)">Open</button>
 *
 * <ng-template #myDialog>
 *   <div kjDialogOverlay>
 *     <div kjDialog #dlg="kjDialog">
 *       <h2 kjDialogTitle>Title</h2>
 *       <button kjDialogClose>Cancel</button>
 *       <button (click)="dlg.close('saved')">Save</button>
 *     </div>
 *   </div>
 * </ng-template>
 * ```
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
 */
@Directive({
  selector: '[kjDialogTrigger]',
  standalone: true,
  providers: [{ provide: KJ_DIALOG, useExisting: KjDialogTrigger }],
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open().toString()',
    '(click)': 'openDialog()',
  },
})
export class KjDialogTrigger implements KjDialogContext {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly kjDialogTrigger = input.required<TemplateRef<unknown>>();
  readonly kjDialogCloseOnEscape = input<boolean>(true);
  readonly kjDialogCloseOnBackdrop = input<boolean>(true);
  readonly kjDialogClosed = output<unknown>();

  readonly dialogId = `kj-dialog-${++_dialogIdCounter}`;

  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();
  readonly closeOnEscape = computed(() => this.kjDialogCloseOnEscape());
  readonly closeOnBackdrop = computed(() => this.kjDialogCloseOnBackdrop());

  private viewRef?: EmbeddedViewRef<unknown>;
  private containerEl?: HTMLElement;

  constructor() {
    this.destroyRef.onDestroy(() => this.close());
  }

  openDialog(): void {
    if (this._open() || !isPlatformBrowser(this.platformId)) return;

    // Use TemplateRef.createEmbeddedView directly (not vcr.createEmbeddedView) so
    // the view is NOT pre-attached to any ViewContainer — ApplicationRef can own it.
    // Pass the trigger's injector so KJ_DIALOG is resolvable within the template.
    this.viewRef = this.kjDialogTrigger().createEmbeddedView(undefined as never, this.injector);
    this.appRef.attachView(this.viewRef);

    // Mount in a fixed container appended to body
    this.containerEl = document.createElement('div');
    this.containerEl.setAttribute('data-kj-dialog-container', '');
    this.viewRef.rootNodes.forEach(node => this.containerEl!.appendChild(node));
    document.body.appendChild(this.containerEl);

    this._open.set(true);
  }

  close(result?: unknown): void {
    if (!this._open()) return;
    this._open.set(false);

    if (this.viewRef) {
      this.appRef.detachView(this.viewRef);
      this.viewRef.destroy();
      this.viewRef = undefined;
    }
    this.containerEl?.remove();
    this.containerEl = undefined;

    this.kjDialogClosed.emit(result);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this._open() && this.closeOnEscape()) this.close();
  }
}

/**
 * Panel container for the dialog. Place inside the template provided to `[kjDialogTrigger]`.
 * Auto-sets `role="dialog"`, `aria-modal`, and `aria-labelledby` (requires `[kjDialogTitle]` inside).
 * Export as `#dlg="kjDialog"` to call `dlg.close(result?)` from event handlers.
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjDialog]',
  standalone: true,
  exportAs: 'kjDialog',
  host: {
    '[attr.role]': '"dialog"',
    '[attr.aria-modal]': '"true"',
    '[attr.aria-labelledby]': 'ctx.dialogId + "-title"',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjDialog {
  readonly ctx = inject(KJ_DIALOG);

  close(result?: unknown): void {
    this.ctx.close(result);
  }
}

/**
 * Backdrop/overlay element. Place inside the template wrapping `[kjDialog]`.
 * Closes the dialog on click when `[kjDialogOverlayCloseOnClick]` is true (default).
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjDialogOverlay]',
  standalone: true,
  host: {
    '(click)': 'onOverlayClick()',
  },
})
export class KjDialogOverlay {
  private readonly ctx = inject(KJ_DIALOG);
  readonly kjDialogOverlayCloseOnClick = input<boolean>(true);

  onOverlayClick(): void {
    if (this.ctx.closeOnBackdrop() && this.kjDialogOverlayCloseOnClick()) {
      this.ctx.close();
    }
  }
}

/**
 * Marks the dialog title. Sets `id` for `aria-labelledby` wiring on `[kjDialog]`.
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjDialogTitle]',
  standalone: true,
  host: {
    '[attr.id]': 'ctx.dialogId + "-title"',
  },
})
export class KjDialogTitle {
  readonly ctx = inject(KJ_DIALOG);
}

/**
 * Closes the dialog on click without a result value.
 * For closing with a result, use `#dlg="kjDialog"` then `(click)="dlg.close(value)"`.
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjDialogClose]',
  standalone: true,
  host: {
    '(click)': 'ctx.close()',
  },
})
export class KjDialogClose {
  readonly ctx = inject(KJ_DIALOG);
}
