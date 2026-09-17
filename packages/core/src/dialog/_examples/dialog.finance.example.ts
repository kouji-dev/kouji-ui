import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDialogService } from '../dialog.service';
import { KjDialogRef } from '../dialog.ref';

@Component({
  selector: 'kj-example-dialog-finance-content',
  standalone: true,
  host: { class: 'kj-theme-finance' },
  styleUrls: ['../../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: block;
        background: var(--docs-surface);
        border: 1px solid var(--docs-border);
        border-radius: var(--docs-radius-lg);
        padding: 1.5rem;
        min-width: 22rem;
        box-shadow: var(--docs-shadow-hard);
        font-family: var(--docs-font);
        color: var(--docs-text);
      }
      h2 {
        margin: 0 0 0.375rem;
        font-size: 1.0625rem;
        font-weight: 600;
        color: var(--docs-text);
      }
      .dialog-body {
        margin: 0 0 1.5rem;
        font-size: 0.875rem;
        color: var(--docs-text-muted);
        line-height: 1.6;
      }
      .dialog-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      button {
        padding: 0.4rem 1rem;
        font-size: 0.8125rem;
        font-weight: 500;
        border-radius: var(--docs-radius-md);
        cursor: pointer;
        font-family: var(--docs-font);
      }
      .btn-cancel {
        background: var(--docs-surface);
        color: var(--docs-text);
        border: 1px solid var(--docs-border);
      }
      .btn-cancel:hover {
        background: var(--docs-bg);
      }
      .btn-primary {
        background: var(--docs-accent);
        color: var(--docs-accent-on);
        border: 1px solid var(--docs-accent);
      }
      .btn-primary:hover {
        background: #2563eb;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2>Edit Profile</h2>
    <p class="dialog-body">Make changes to your profile settings here.</p>
    <div class="dialog-actions">
      <button class="btn-cancel" (click)="ref.close('cancel')">Cancel</button>
      <button class="btn-primary" (click)="ref.close('save')">Save Changes</button>
    </div>
  `,
})
export class DialogFinanceContent {
  readonly ref = inject<KjDialogRef<DialogFinanceContent>>(KjDialogRef);
}

@Component({
  selector: 'kj-example-dialog-finance',
  standalone: true,
  styleUrls: ['../../styles/docs-themes.css'],
  host: { class: 'kj-theme-finance' },
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3rem 2rem;
        background: var(--docs-bg);
        font-family: var(--docs-font);
        min-height: 160px;
      }
      button {
        padding: 0.45rem 1.125rem;
        background: var(--docs-accent);
        color: var(--docs-accent-on);
        border: var(--docs-btn-border);
        border-color: var(--docs-accent);
        border-radius: var(--docs-radius-md);
        cursor: pointer;
        font-family: var(--docs-font);
        font-size: 0.875rem;
        font-weight: 500;
      }
      button:hover {
        background: #2563eb;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <button (click)="open()">Open Dialog</button> `,
})
export class DialogFinanceExample {
  private readonly dialog = inject(KjDialogService);
  open() {
    this.dialog.open(DialogFinanceContent);
  }
}
