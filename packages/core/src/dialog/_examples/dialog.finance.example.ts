import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDialog as KjDialogService } from '../dialog.service';
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
        background: var(--kj-surface);
        border: 1px solid var(--kj-border);
        border-radius: var(--kj-radius-lg);
        padding: 1.5rem;
        min-width: 22rem;
        box-shadow: var(--kj-shadow-hard);
        font-family: var(--kj-font);
        color: var(--kj-text);
      }
      h2 {
        margin: 0 0 0.375rem;
        font-size: 1.0625rem;
        font-weight: 600;
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
        gap: 0.5rem;
        justify-content: flex-end;
      }
      button {
        padding: 0.4rem 1rem;
        font-size: 0.8125rem;
        font-weight: 500;
        border-radius: var(--kj-radius-md);
        cursor: pointer;
        font-family: var(--kj-font);
      }
      .btn-cancel {
        background: var(--kj-surface);
        color: var(--kj-text);
        border: 1px solid var(--kj-border);
      }
      .btn-cancel:hover {
        background: var(--kj-bg);
      }
      .btn-primary {
        background: var(--kj-accent);
        color: var(--kj-accent-on);
        border: 1px solid var(--kj-accent);
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
        background: var(--kj-bg);
        font-family: var(--kj-font);
        min-height: 160px;
      }
      button {
        padding: 0.45rem 1.125rem;
        background: var(--kj-accent);
        color: var(--kj-accent-on);
        border: var(--kj-btn-border);
        border-color: var(--kj-accent);
        border-radius: var(--kj-radius-md);
        cursor: pointer;
        font-family: var(--kj-font);
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
