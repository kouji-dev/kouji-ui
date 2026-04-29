import { Directive, DestroyRef, inject, signal, afterNextRender } from '@angular/core';
import { KJ_DIALOG, KjDialogContext } from './dialog.context';

/**
 * Root container for a dialog. Manages open/close state and Escape key handling.
 * @example
 * ```html
 * <div kjDialog><button kjDialogTrigger>Open</button><div kjDialogContent role="dialog" aria-label="Settings" aria-modal="true">...</div></div>
 * ```
 */
@Directive({
  selector: '[kjDialog]',
  standalone: true,
  providers: [{ provide: KJ_DIALOG, useExisting: KjDialogDirective }],
  host: {
    '(document:keydown)': 'onEscape($event)',
  },
})
export class KjDialogDirective implements KjDialogContext {
  private readonly destroyRef = inject(DestroyRef);
  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();

  show(): void { this._open.set(true); }
  hide(): void { this._open.set(false); }

  /** @internal Closes dialog on Escape key. */
  onEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.hide();
  }
}

/** Trigger button that opens the dialog. */
@Directive({
  selector: '[kjDialogTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '(click)': 'ctx.show()',
  },
})
export class KjDialogTriggerDirective {
  readonly ctx = inject(KJ_DIALOG);
}

/**
 * Dialog content panel. Hidden when closed. Add `role="dialog"`, `aria-label`, `aria-modal="true"`.
 * @example `<div kjDialogContent role="dialog" aria-label="My dialog" aria-modal="true">...</div>`
 */
@Directive({
  selector: '[kjDialogContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!ctx.open() ? "" : null',
  },
})
export class KjDialogContentDirective {
  readonly ctx = inject(KJ_DIALOG);
}
