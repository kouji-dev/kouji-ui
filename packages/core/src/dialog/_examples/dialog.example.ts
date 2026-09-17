import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDialogService } from '../dialog.service';
import { KjDialogRef } from '../dialog.ref';
import { KjButton } from '../../button/button';

@Component({
  selector: 'kj-example-dialog-basic-content',
  standalone: true,
  imports: [KjButton],
  styles: [
    `
      :host {
        display: block;
        background: var(--docs-surface);
        border: 1px solid var(--docs-border);
        border-radius: var(--docs-radius-lg);
        padding: 1.5rem;
        min-width: 20rem;
        color: var(--docs-text);
        font-family: var(--docs-font);
        box-shadow: var(--docs-shadow-hard);
      }
      h2 {
        margin: 0 0 0.5rem;
        font-size: 1.125rem;
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
        gap: 0.75rem;
        justify-content: flex-end;
      }
      .dialog-actions button[kjButton] {
        padding: 0.4rem 1rem;
        font-size: 0.8125rem;
      }
      [data-variant='default'] {
        background: var(--docs-accent);
        color: var(--docs-accent-on);
      }
      [data-variant='outline'] {
        background: transparent;
        color: var(--docs-text);
        border: 1px solid var(--docs-border);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2>Edit Profile</h2>
    <p class="dialog-body">Make changes to your profile settings here.</p>
    <div class="dialog-actions">
      <button kjButton [kjVariant]="'outline'" (click)="ref.close('cancel')">Cancel</button>
      <button kjButton [kjVariant]="'default'" (click)="ref.close('save')">Save Changes</button>
    </div>
  `,
})
export class DialogBasicContent {
  readonly ref = inject<KjDialogRef<DialogBasicContent>>(KjDialogRef);
}

@Component({
  selector: 'kj-example-dialog-basic',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../../styles/docs-themes.css'],
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
      button[kjButton] {
        padding: 0.5rem 1.5rem;
        border: var(--docs-btn-border);
        cursor: pointer;
        font-family: var(--docs-font);
        font-size: 0.875rem;
        transition: var(--docs-transition);
      }
      [data-variant='default'] {
        background: var(--docs-accent);
        color: var(--docs-accent-on);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <button kjButton [kjVariant]="'default'" (click)="open()">Open Dialog</button> `,
})
export class DialogBasicExample {
  private readonly dialog = inject(KjDialogService);
  open() {
    this.dialog.open(DialogBasicContent);
  }
}
