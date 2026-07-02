import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjDialog as KjDialogService } from '../dialog.service';
import { KjDialogRef } from '../dialog.ref';
import { KjButton } from '../../button/button';

@Component({
  selector: 'kj-example-dialog-confirm-content',
  standalone: true,
  imports: [KjButton],
  styles: [
    `
      :host {
        display: block;
        background: var(--kj-surface);
        border: 1px solid var(--kj-border);
        border-radius: var(--kj-radius-lg);
        padding: 1.5rem;
        min-width: 22rem;
        color: var(--kj-text);
        font-family: var(--kj-font);
        box-shadow: var(--kj-shadow-hard);
      }
      h2 {
        margin: 0 0 0.5rem;
        font-size: 1.125rem;
        color: var(--kj-text);
      }
      .dialog-body {
        margin: 0 0 1.5rem;
        font-size: 0.875rem;
        color: var(--kj-text-muted);
        line-height: 1.6;
      }
      .dialog-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }
      .dialog-actions button[kjButton] {
        padding: 0.4rem 1rem;
        font-size: 0.8125rem;
      }
      [data-variant='destructive'] {
        background: var(--kj-destructive);
        color: #fff;
      }
      [data-variant='outline'] {
        background: transparent;
        color: var(--kj-text);
        border: 1px solid var(--kj-border);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2>Are you absolutely sure?</h2>
    <p class="dialog-body">
      This action cannot be undone. All your data will be permanently removed.
    </p>
    <div class="dialog-actions">
      <button kjButton [kjVariant]="'outline'" (click)="ref.close('cancelled')">Cancel</button>
      <button kjButton [kjVariant]="'destructive'" (click)="ref.close('confirmed')">
        Yes, delete
      </button>
    </div>
  `,
})
export class DialogConfirmContent {
  readonly ref = inject<KjDialogRef<DialogConfirmContent, 'confirmed' | 'cancelled'>>(KjDialogRef);
}

@Component({
  selector: 'kj-example-dialog-confirm',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 3rem 2rem;
        background: var(--kj-bg);
        font-family: var(--kj-font);
        min-height: 160px;
        flex-direction: column;
        color: var(--kj-text);
      }
      .status {
        font-size: 0.8125rem;
        color: var(--kj-text-muted);
        min-height: 1.25rem;
      }
      .status.confirmed {
        color: var(--kj-accent);
      }
      .status.cancelled {
        color: var(--kj-destructive);
      }
      button[kjButton] {
        padding: 0.5rem 1.5rem;
        border: var(--kj-btn-border);
        cursor: pointer;
        font-family: var(--kj-font);
        font-size: 0.875rem;
      }
      [data-variant='destructive'] {
        background: var(--kj-destructive);
        color: #fff;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button kjButton [kjVariant]="'destructive'" (click)="open()">Delete Account</button>
    <span
      class="status"
      [class.confirmed]="result() === 'confirmed'"
      [class.cancelled]="result() === 'cancelled'"
    >
      {{
        result() === 'confirmed'
          ? '✓ Account deleted'
          : result() === 'cancelled'
            ? '✕ Cancelled'
            : ''
      }}
    </span>
  `,
})
export class DialogConfirmExample {
  private readonly dialog = inject(KjDialogService);
  readonly result = signal<'confirmed' | 'cancelled' | null>(null);

  async open() {
    const ref = this.dialog.open<DialogConfirmContent, 'confirmed' | 'cancelled'>(
      DialogConfirmContent,
      { alert: true },
    );
    const value = await ref.result;
    if (value === 'confirmed' || value === 'cancelled') this.result.set(value);
  }
}
