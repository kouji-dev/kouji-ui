import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDialog, KjDialogService } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin via wrapper layer once styled overlay components land.
@Component({
  selector: 'kj-dialog-default-body',
  standalone: true,
  imports: [KjDialog],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-dialog
    ><h2>Hello</h2>
    <p>Dialog body</p></kj-dialog
  >`,
})
class DialogBody {}

@Component({
  selector: 'kj-dialog-default-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-button (click)="open()">Open dialog</kj-button>`,
})
export class KjDialogDefaultExample {
  private readonly dialog = inject(KjDialogService);
  open(): void {
    this.dialog.open(DialogBody);
  }
}
