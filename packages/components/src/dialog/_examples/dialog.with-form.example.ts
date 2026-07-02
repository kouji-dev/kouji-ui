import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDialog, KjDialogService, KjDialogRef } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';
import { KjInputComponent } from '../../input/input';
import { KjFieldComponent, KjFieldLabelComponent } from '../../field/field';

@Component({
  selector: 'kj-dialog-form-body',
  standalone: true,
  imports: [KjDialog, KjButtonComponent, KjInputComponent, KjFieldComponent, KjFieldLabelComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-dialog>
      <h2 style="margin: 0 0 var(--kj-space-md);">Edit profile</h2>
      <kj-field>
        <kj-field-label>Display name</kj-field-label>
        <kj-input placeholder="Jane Doe" />
      </kj-field>
      <kj-field>
        <kj-field-label>Email</kj-field-label>
        <kj-input placeholder="jane@example.com" />
      </kj-field>
      <div
        style="display: flex; gap: var(--kj-space-sm); justify-content: flex-end; margin-top: var(--kj-space-lg);"
      >
        <kj-button kjVariant="ghost" (click)="ref.close()">Cancel</kj-button>
        <kj-button (click)="ref.close('saved')">Save</kj-button>
      </div>
    </kj-dialog>
  `,
})
class FormBody {
  protected readonly ref = inject(KjDialogRef);
}

@Component({
  selector: 'kj-dialog-with-form-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-button (click)="open()">Open form</kj-button>`,
})
export class KjDialogWithFormExample {
  private readonly dialog = inject(KjDialogService);
  open(): void {
    this.dialog.open(FormBody);
  }
}
