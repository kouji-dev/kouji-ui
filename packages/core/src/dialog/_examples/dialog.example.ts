import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDialog as KjDialogService } from '../dialog.service';
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
        background: var(--kj-surface);
        border: 1px solid var(--kj-border);
        border-radius: var(--kj-radius-lg);
        padding: 1.5rem;
        min-width: 20rem;
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
      [data-variant='default'] {
        background: var(--kj-accent);
        color: var(--kj-accent-on);
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
        background: var(--kj-bg);
        font-family: var(--kj-font);
        min-height: 160px;
      }
      button[kjButton] {
        padding: 0.5rem 1.5rem;
        border: var(--kj-btn-border);
        cursor: pointer;
        font-family: var(--kj-font);
        font-size: 0.875rem;
        transition: var(--kj-transition);
      }
      [data-variant='default'] {
        background: var(--kj-accent);
        color: var(--kj-accent-on);
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
