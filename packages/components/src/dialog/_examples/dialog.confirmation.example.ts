import { Component, inject } from '@angular/core';
import { KjDialog, KjDialogService } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin once styled wrapper layer lands.
@Component({
  selector: 'kj-dialog-confirmation-body',
  standalone: true,
  imports: [KjDialog],
  template: `<kj-dialog [kjAlert]="true"><h2>Confirm</h2><p>Are you sure?</p></kj-dialog>`,
})
class ConfirmationBody {}

@Component({
  selector: 'kj-dialog-confirmation-example',
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button (click)="open()">Confirm</kj-button>`,
})
export class KjDialogConfirmationExample {
  private readonly dialog = inject(KjDialogService);
  open(): void { this.dialog.open(ConfirmationBody, { alert: true }); }
}
