import { Component, inject } from '@angular/core';
import { KjDialog, KjDialogService } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

// TODO(wrapper-overlay): re-skin form demo.
@Component({
  standalone: true,
  imports: [KjDialog],
  template: `<kj-dialog><h2>Form</h2><input type="text" /></kj-dialog>`,
})
class FormBody {}

@Component({
  selector: 'kj-dialog-with-form-example',
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button (click)="open()">Open form</kj-button>`,
})
export class KjDialogWithFormExample {
  private readonly dialog = inject(KjDialogService);
  open(): void { this.dialog.open(FormBody); }
}
